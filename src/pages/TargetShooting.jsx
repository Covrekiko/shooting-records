import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import CheckinBanner from '@/components/CheckinBanner';
import { useGeolocation, calculateDistance } from '@/hooks/useGeolocation';
import GpsPathViewer from '@/components/GpsPathViewer';
import RecordsSection from '@/components/RecordsSection';
import { Clock, Plus, Map, Crosshair } from 'lucide-react';
import { decrementAmmoStock } from '@/lib/ammoUtils';
import { sessionManager } from '@/lib/sessionManager';
import { trackingService } from '@/lib/trackingService';
import BottomSheetSelect from '@/components/BottomSheetSelect';
import ModalShell from '@/components/ModalShell';
import { motion } from 'framer-motion';
import { DESIGN } from '@/lib/designConstants';

export default function TargetShooting() {
  const [activeSession, setActiveSession] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [ammunition, setAmmunition] = useState([]);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const { location } = useGeolocation();
  const [nearbyClub, setNearbyClub] = useState(null);
  const [gpsTrack, setGpsTrack] = useState([]);
  const [viewingTrack, setViewingTrack] = useState(null);

  const [checkinData, setCheckinData] = useState({
    date: new Date().toISOString().split('T')[0],
    club_id: '',
    checkin_time: new Date().toTimeString().slice(0, 5),
    notes: '',
  });

  useEffect(() => {
    sessionManager.clearExpiredSessions();
    async function loadData() {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        const [clubsList, riflesList, ammoList, activeSession] = await Promise.all([
          base44.entities.Club.filter({ created_by: currentUser.email }),
          base44.entities.Rifle.filter({ created_by: currentUser.email }),
          base44.entities.Ammunition.filter({ created_by: currentUser.email }),
          base44.entities.SessionRecord.filter({ created_by: currentUser.email, category: 'target_shooting', status: 'active' }),
        ]);
        setClubs(clubsList);
        setRifles(riflesList);
        setAmmunition(ammoList);
        if (activeSession.length > 0) {
          const session = activeSession[0];
          // Validate session health - detect orphaned sessions from app restarts
          const createdDate = new Date(session.created_date);
          const sessionAgeMinutes = (Date.now() - createdDate.getTime()) / 60000;
          
          if (sessionAgeMinutes > 1440) {
            // Session is >24 hours old and still active - likely orphaned
            console.warn('⚠️ Orphaned session detected (age:', sessionAgeMinutes, 'minutes) - marking as abandoned');
            await base44.entities.SessionRecord.update(session.id, {
              status: 'completed',
              notes: (session.notes || '') + '\n[Auto-closed: session orphaned after app restart]'
            });
            setActiveSession(null);
            setGpsTrack([]);
          } else {
            setActiveSession(session);
            setGpsTrack(session.gps_track || []);
            // Resume tracking if session is still fresh and tracking isn't already running
            if (!trackingService.isTracking()) {
              trackingService.startTracking(session.id, 'target');
              console.log('🟢 Resumed tracking for active session after app restart');
            }
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = trackingService.subscribe((track) => setGpsTrack(track));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (location && clubs.length > 0) {
      clubs.forEach((club) => {
        const match = club.location?.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (match) {
          const distance = calculateDistance(location.latitude, location.longitude, parseFloat(match[1]), parseFloat(match[2]));
          if (distance < 0.5) setNearbyClub({ name: club.name, distance });
        }
      });
    }
  }, [location, clubs]);

  const handleCheckin = async (e) => {
    e.preventDefault();
    try {
      // Prevent duplicate active sessions
      if (activeSession) {
        alert('Already checked in. Please check out first.');
        return;
      }

      // Validate required fields
      if (!checkinData.club_id || !checkinData.date || !checkinData.checkin_time) {
        alert('All required fields must be filled');
        return;
      }

      const selectedClub = clubs.find(c => c.id === checkinData.club_id);
      const session = await base44.entities.SessionRecord.create({
        ...checkinData,
        category: 'target_shooting',
        status: 'active',
        location_id: checkinData.club_id,
        location_name: selectedClub?.name || 'Unknown Club',
        start_time: checkinData.checkin_time,
        notes: checkinData.notes || '',
        photos: [],
        gps_track: [],
      });
      setActiveSession(session);

      // Validate geolocation support before starting tracking
      if (!navigator.geolocation) {
        console.warn('⚠️ Geolocation not available on this device');
      }

      trackingService.startTracking(session.id, 'target');
      setGpsTrack([]);
      setShowCheckin(false);
      setCheckinData({ date: new Date().toISOString().split('T')[0], club_id: '', checkin_time: new Date().toTimeString().slice(0, 5), notes: '' });
    } catch (error) {
      console.error('Check-in failed:', error.message);
      alert('Check-in failed: ' + error.message);
    }
  };

  const handleCheckout = async (formData) => {
    if (!activeSession) {
      alert('No active session to check out from');
      return;
    }
    try {
      // Collect GPS track BEFORE stopping tracking
      const finalTrack = trackingService.getTrack();
      console.log('🟢 Checkout: Collected', finalTrack.length, 'GPS points before stop');

      // Update rifle round counts and decrement ammo
      const uniqueAmmoIds = new Set();
      for (const rifle of formData.rifles_used || []) {
       const roundsFired = parseInt(rifle.rounds_fired) || 0;

       // Update rifle total only (Since Cleaning is calculated based on total and baseline)
       if (rifle.rifle_id && roundsFired > 0) {
         const currentRifle = rifles.find(r => r.id === rifle.rifle_id);
         if (currentRifle) {
           await base44.entities.Rifle.update(rifle.rifle_id, {
             total_rounds_fired: (currentRifle.total_rounds_fired || 0) + roundsFired,
           });
         }
       }
        
        // Decrement ammo if needed
        if (rifle.ammunition_id && roundsFired && !uniqueAmmoIds.has(rifle.ammunition_id)) {
          await decrementAmmoStock(rifle.ammunition_id, roundsFired, 'target_shooting');
          uniqueAmmoIds.add(rifle.ammunition_id);
        }
      }

      // Prepare data
      const photoUrls = (formData.photos || []).map(photo => typeof photo === 'string' ? photo : photo.url);

      // Save to database with retry logic
      let updateSuccess = false;
      let updateError = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await base44.entities.SessionRecord.update(activeSession.id, {
            status: 'completed',
            checkout_time: formData.checkout_time,
            rifles_used: formData.rifles_used,
            notes: formData.notes,
            photos: photoUrls,
            active_checkin: false,
            gps_track: finalTrack,
          });
          console.log('🟢 SessionRecord updated and closed - GPS points saved:', finalTrack.length);
          updateSuccess = true;
          break;
        } catch (err) {
          updateError = err;
          if (attempt === 1) {
            console.warn('⚠️ SessionRecord update failed (attempt 1), retrying...');
            await new Promise(r => setTimeout(r, 500));
          }
        }
      }

      if (!updateSuccess) {
        throw new Error('Failed to save session after 2 attempts: ' + updateError?.message);
      }

      // Only stop tracking AFTER successful database save
      trackingService.stopTracking();
      console.log('🟢 Checkout complete - tracking stopped after database save');

      setActiveSession(null);
      setGpsTrack([]);
      setShowCheckout(false);
      setViewingTrack(null);
    } catch (error) {
      console.error('🔴 Checkout failed:', error.message);
      alert('Checkout failed: ' + error.message);
      // IMPORTANT: Don't stop tracking on error - allows user to retry
    }
  };

  if (loading) {
    return (
      <div className={`${DESIGN.PAGE_BG} min-h-screen`}>
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${DESIGN.PAGE_BG} min-h-screen`}>
      <Navigation />
      {nearbyClub && (
        <CheckinBanner location={nearbyClub.name} distance={nearbyClub.distance} onDismiss={() => setNearbyClub(null)} onCheckin={() => setShowCheckin(true)} />
      )}
      <main className="max-w-2xl mx-auto px-3 pt-2 md:pt-4 pb-4 mobile-page-padding">
        <div className="mb-4 flex items-center justify-between">
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Target Shooting</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Rifle range sessions</p>
          </div>

        </div>

        {!activeSession && (
          <div className={`${DESIGN.CARD} p-5 mb-4 flex flex-col items-center justify-center text-center gap-3`}>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center">
              <Crosshair className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No Active Session</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Start a session to begin tracking</p>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowCheckin(true)}
              className={`${DESIGN.BUTTON_PRIMARY} flex items-center gap-2 w-full justify-center`}>
              <Plus className="w-4 h-4" />
              Start Session
            </motion.button>
          </div>
        )}

        {activeSession && (
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest">Active Session</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                    {activeSession.location_name || 'Target Range'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Started {activeSession.checkin_time}</p>
                </div>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCheckout(true)}
                className={DESIGN.BUTTON_PRIMARY}>
                Check Out
              </motion.button>
            </div>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Recent Sessions</p>
          <RecordsSection category="target_shooting" title="Session Records" emptyMessage="No target shooting sessions recorded yet" />
        </div>

        {viewingTrack && <GpsPathViewer track={viewingTrack} onClose={() => setViewingTrack(null)} />}
      </main>

      {createPortal(
        <>
          {(showCheckin || showCheckout) && <div className="fixed inset-0 z-[50000] bg-black/50" onClick={() => { setShowCheckin(false); setShowCheckout(false); }} />}
          {showCheckin && (
            <div className="fixed inset-0 z-[50001] flex flex-col justify-end sm:justify-center sm:items-center pointer-events-none">
              <div className="pointer-events-auto w-full sm:max-w-md">
                <CheckinModal data={checkinData} clubs={clubs} onSubmit={handleCheckin} onChange={(f, v) => setCheckinData({ ...checkinData, [f]: v })} onClose={() => setShowCheckin(false)} />
              </div>
            </div>
          )}
          {showCheckout && activeSession && (
            <div className="fixed inset-0 z-[50001] flex flex-col justify-end sm:justify-center sm:items-center pointer-events-none">
              <div className="pointer-events-auto w-full sm:max-w-md">
                <CheckoutModal rifles={rifles} ammunition={ammunition} onSubmit={handleCheckout} onClose={() => setShowCheckout(false)} gpsTrack={gpsTrack} onViewTrack={setViewingTrack} />
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}

// ─── Check-in Modal ───────────────────────────────────────────────
function CheckinModal({ data, clubs, onSubmit, onChange, onClose }) {
  const inputCls = DESIGN.INPUT;
  const labelCls = DESIGN.LABEL;

  return (
    <ModalShell
      title="Check In"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
           <motion.button type="submit" form="ts-checkin-form" whileTap={{ scale: 0.97 }}
             className={`flex-1 ${DESIGN.BUTTON_PRIMARY}`}>
             Check In
           </motion.button>
           <motion.button type="button" onClick={onClose} whileTap={{ scale: 0.97 }}
             className={`flex-1 ${DESIGN.BUTTON_SECONDARY}`}>
             Cancel
           </motion.button>
         </div>
      }
    >
      <form id="ts-checkin-form" onSubmit={onSubmit} className="px-5 py-4 space-y-4">
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" value={data.date} onChange={(e) => onChange('date', e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Club</label>
          <BottomSheetSelect value={data.club_id} onChange={(val) => onChange('club_id', val)} placeholder="Select a club" options={clubs.map(c => ({ value: c.id, label: c.name }))} />
        </div>
        <div>
          <label className={labelCls}>Check-in Time</label>
          <input type="time" value={data.checkin_time} onChange={(e) => onChange('checkin_time', e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Notes (optional)</label>
          <textarea value={data.notes} onChange={(e) => onChange('notes', e.target.value)} className={inputCls} rows="3" />
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Photo upload helper ──────────────────────────────────────────
async function handlePhotoUpload(files, data, onChange) {
  if (!files || files.length === 0) return;
  const maxFileSize = 5 * 1024 * 1024;
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  try {
    const newPhotos = [...(data.photos || [])];
    for (const file of files) {
      if (file.size > maxFileSize || !validTypes.includes(file.type)) continue;
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      let photoData = { url: file_url };
      try {
        const result = await base44.functions.invoke('analyzeTargetPhoto', { photo_url: file_url });
        if (result?.data?.analysis) photoData.analysis = result.data.analysis;
      } catch {}
      newPhotos.push(photoData);
    }
    onChange('photos', newPhotos);
  } catch (error) {
    console.error('Photo upload error:', error);
  }
}

// ─── Check-out Modal ──────────────────────────────────────────────
function CheckoutModal({ rifles, ammunition, onSubmit, onClose, gpsTrack, onViewTrack }) {
  const [errors, setErrors] = useState({});
  const [data, setData] = useState({
    checkout_time: new Date().toTimeString().slice(0, 5),
    rifles_used: [{ rifle_id: '', rounds_fired: '', meters_range: '', ammunition_id: '', ammunition_brand: '', caliber: '', bullet_type: '', grain: '' }],
    notes: '',
    photos: [],
  });

  const inputCls = DESIGN.INPUT;
  const labelCls = DESIGN.LABEL;

  const updateRifleEntry = (index, field, value) => {
    const updated = [...data.rifles_used];
    updated[index] = { ...updated[index], [field]: value };
    setData(prev => ({ ...prev, rifles_used: updated }));
  };

  const addRifleEntry = () => setData(prev => ({ ...prev, rifles_used: [...prev.rifles_used, { rifle_id: '', rounds_fired: '', meters_range: '', ammunition_id: '', ammunition_brand: '', bullet_type: '', grain: '' }] }));
  const removeRifleEntry = (index) => setData(prev => ({ ...prev, rifles_used: prev.rifles_used.filter((_, i) => i !== index) }));

  const handleSubmit = () => {
    const newErrors = {};
    data.rifles_used.forEach((rifle, idx) => {
      const missing = [];
      if (!rifle.rifle_id) missing.push('Rifle');
      if (!rifle.rounds_fired) missing.push('Rounds fired');
      if (!rifle.meters_range) missing.push('Meters range');
      if (!rifle.ammunition_id) missing.push('Ammunition');
      if (missing.length > 0) newErrors[`rifle_${idx}`] = `Required: ${missing.join(', ')}`;
    });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    onSubmit(data);
  };

  return (
    <ModalShell
      title="Check Out"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
           <motion.button type="button" onClick={handleSubmit} whileTap={{ scale: 0.97 }}
             className={`flex-1 ${DESIGN.BUTTON_PRIMARY}`}>
             Check Out
           </motion.button>
           <motion.button type="button" onClick={onClose} whileTap={{ scale: 0.97 }}
             className={`flex-1 ${DESIGN.BUTTON_SECONDARY}`}>
             Cancel
           </motion.button>
         </div>
        }
        >
      <div className="px-5 py-4 space-y-4">
        <div>
          <label className={labelCls}>Check-out Time</label>
          <input type="time" value={data.checkout_time} onChange={(e) => setData(prev => ({ ...prev, checkout_time: e.target.value }))} className={inputCls} required />
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className={labelCls}>Firearms Used</span>
            <motion.button type="button" onClick={addRifleEntry} whileTap={{ scale: 0.95 }}
              className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-primary hover:text-primary-foreground px-3 py-1.5 rounded-lg font-medium transition-all">
              + Add
            </motion.button>
          </div>

          {data.rifles_used.map((rifle, index) => (
            <div key={index} className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200/70 dark:border-slate-600 p-3 rounded-xl mb-3 space-y-2.5">
              {errors[`rifle_${index}`] && <p className="text-red-500 text-xs font-medium">{errors[`rifle_${index}`]}</p>}
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500">Rifle {index + 1}</span>
                {data.rifles_used.length > 1 && (
                  <button type="button" onClick={() => removeRifleEntry(index)} className="text-xs text-red-400 hover:text-red-600 font-medium">Remove</button>
                )}
              </div>
              <BottomSheetSelect value={rifle.rifle_id} onChange={(val) => updateRifleEntry(index, 'rifle_id', val)} placeholder="Select rifle" options={rifles.map(r => ({ value: r.id, label: r.name }))} />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Rounds" value={rifle.rounds_fired} onChange={(e) => updateRifleEntry(index, 'rounds_fired', e.target.value)} className={inputCls} />
                <input type="number" placeholder="Meters" value={rifle.meters_range} onChange={(e) => updateRifleEntry(index, 'meters_range', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Ammunition *</label>
                {rifle.rifle_id ? (
                  <BottomSheetSelect
                    value={rifle.ammunition_id || ''}
                    onChange={(val) => {
                      const a = ammunition.find(x => x.id === val);
                      setData(prev => {
                        const updated = [...prev.rifles_used];
                        updated[index] = { ...updated[index], ammunition_id: val, ammunition_brand: a?.brand || '', caliber: a?.caliber || '', bullet_type: a?.bullet_type || '', grain: a?.grain || '' };
                        return { ...prev, rifles_used: updated };
                      });
                    }}
                    placeholder="Select saved ammunition (required)"
                    options={ammunition.filter(a => {
                      const selectedRifle = rifles.find(r => r.id === rifle.rifle_id);
                      return !selectedRifle || !selectedRifle.caliber || a.caliber === selectedRifle.caliber;
                    }).map(a => ({ value: a.id, label: `${a.brand}${a.caliber ? ` (${a.caliber})` : ''}${a.bullet_type ? ` - ${a.bullet_type}` : ''}` }))}
                  />
                ) : (
                  <p className="text-xs text-slate-400">Select a rifle first</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea value={data.notes} onChange={(e) => setData(prev => ({ ...prev, notes: e.target.value }))} className={inputCls} rows="2" />
        </div>

        <div>
          <label className={labelCls}>Photos</label>
          <div className="flex gap-2 mb-2">
            <label className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600/80 rounded-xl text-center cursor-pointer font-semibold text-xs text-slate-600 dark:text-slate-300 transition-colors">
              Choose File
              <input type="file" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e.target.files, data, (f, v) => setData(prev => ({ ...prev, [f]: v })))} className="hidden" />
            </label>
            <label className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600/80 rounded-xl text-center cursor-pointer font-semibold text-xs text-slate-600 dark:text-slate-300 transition-colors">
              Camera
              <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => handlePhotoUpload(e.target.files, data, (f, v) => setData(prev => ({ ...prev, [f]: v })))} className="hidden" />
            </label>
          </div>
          {data.photos && data.photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.photos.map((photo, idx) => {
                const photoUrl = typeof photo === 'string' ? photo : photo.url;
                const analysis = typeof photo === 'object' ? photo.analysis : null;
                return (
                  <div key={idx} className="relative group">
                    <img src={photoUrl} alt="preview" className="h-16 w-16 object-cover rounded-xl border border-slate-200" />
                    {analysis && <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-xs px-1 rounded-tl-lg">{analysis.accuracy_percentage}%</div>}
                    <button type="button" onClick={() => setData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }))}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs shadow">×</button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {gpsTrack && gpsTrack.length > 0 && (
          <motion.button type="button" onClick={() => onViewTrack(gpsTrack)} whileTap={{ scale: 0.97 }}
            className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-primary hover:text-primary-foreground rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <Map className="w-4 h-4" />
            View GPS Track
          </motion.button>
        )}
      </div>
    </ModalShell>
  );
}