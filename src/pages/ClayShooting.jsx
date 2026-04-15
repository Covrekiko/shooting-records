import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import CheckinBanner from '@/components/CheckinBanner';
import { useGeolocation, calculateDistance } from '@/hooks/useGeolocation';
import { Clock, Plus, Map } from 'lucide-react';
import GpsPathViewer from '@/components/GpsPathViewer';
import RecordsSection from '@/components/RecordsSection';
import { decrementAmmoStock } from '@/lib/ammoUtils';
import { sessionManager } from '@/lib/sessionManager';
import { trackingService } from '@/lib/trackingService';
import BottomSheetSelect from '@/components/BottomSheetSelect';
import MissingFieldsAlert from '@/components/MissingFieldsAlert';
import ModalShell from '@/components/ModalShell';
import { motion } from 'framer-motion';

export default function ClayShooting() {
  const [activeSession, setActiveSession] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [shotguns, setShotguns] = useState([]);
  const [ammunition, setAmmunition] = useState([]);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
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
        const [clubsList, shotgunsList, ammoList, activeSessions] = await Promise.all([
          base44.entities.Club.filter({ created_by: currentUser.email }),
          base44.entities.Shotgun.filter({ created_by: currentUser.email }),
          base44.entities.Ammunition.filter({ created_by: currentUser.email }),
          base44.entities.SessionRecord.filter({ created_by: currentUser.email, category: 'clay_shooting', status: 'active' }),
        ]);
        setClubs(clubsList);
        setShotguns(shotgunsList);
        setAmmunition(ammoList);
        if (activeSessions.length > 0) {
          const session = activeSessions[0];
          // Validate session health - detect orphaned sessions from app restarts
          const createdDate = new Date(session.created_date);
          const sessionAgeMinutes = (Date.now() - createdDate.getTime()) / 60000;
          
          if (sessionAgeMinutes > 60) {
            // Session is >1 hour old and still active - likely orphaned
            console.warn('⚠️ Orphaned session detected (age:', sessionAgeMinutes, 'minutes) - marking as abandoned');
            await base44.entities.SessionRecord.update(session.id, {
              status: 'completed',
              notes: (session.notes || '') + '\n[Auto-closed: session orphaned after app restart]'
            });
          } else {
            setActiveSession(session);
            // Resume tracking if session is still fresh and tracking isn't already running
            if (!trackingService.isTracking()) {
              trackingService.startTracking(session.id, 'clay');
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
        category: 'clay_shooting',
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

      trackingService.startTracking(session.id, 'clay');
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

      // Update shotgun cartridge count
      const cartridgesFired = parseInt(formData.rounds_fired) || 0;
      if (formData.shotgun_id && cartridgesFired > 0) {
        const currentShotgun = shotguns.find(s => s.id === formData.shotgun_id);
        if (currentShotgun) {
          await base44.entities.Shotgun.update(formData.shotgun_id, {
            total_cartridges_fired: (currentShotgun.total_cartridges_fired || 0) + cartridgesFired,
          });
        }
      }

      // Decrement ammo if needed
      if (formData.ammunition_id && formData.rounds_fired) {
        await decrementAmmoStock(formData.ammunition_id, parseInt(formData.rounds_fired));
      }

      // Prepare data
      const photoUrls = (formData.photos || []).filter(p => typeof p === 'string' && !p.startsWith('data:'));

      // Save to database with retry logic
      let updateSuccess = false;
      let updateError = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await base44.entities.SessionRecord.update(activeSession.id, {
            status: 'completed',
            checkout_time: formData.checkout_time || new Date().toTimeString().slice(0, 5),
            shotgun_id: formData.shotgun_id,
            rounds_fired: formData.rounds_fired ? parseInt(formData.rounds_fired) : 0,
            ammunition_id: formData.ammunition_id,
            ammunition_used: formData.ammunition_used,
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
      <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <Navigation />
      {nearbyClub && (
        <CheckinBanner location={nearbyClub.name} distance={nearbyClub.distance} onDismiss={() => setNearbyClub(null)} onCheckin={() => setShowCheckin(true)} />
      )}
      <main className="max-w-4xl mx-auto px-3 pt-2 md:pt-4 pb-4 mobile-page-padding">
        <div className="mb-4 flex items-center justify-between">
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Clay Shooting</h1>
            <p className="text-xs text-slate-400 mt-0.5">Record your shotgun clay shooting sessions</p>
          </div>
          {!activeSession && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowCheckin(true)}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Start New Session</span>
              <span className="sm:hidden">New Session</span>
            </motion.button>
          )}
        </div>

        {activeSession && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Active Session</p>
                  <p className="text-xs text-slate-400">Check-in: {activeSession.checkin_time}</p>
                </div>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCheckout(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
                Check Out
              </motion.button>
            </div>
          </div>
        )}

        <div className="mt-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3">Session Records</h2>
          <RecordsSection category="clay_shooting" title="Session Records" emptyMessage="No clay shooting sessions recorded yet" />
        </div>

        {viewingTrack && createPortal(
          <GpsPathViewer track={viewingTrack} onClose={() => setViewingTrack(null)} />,
          document.body
        )}
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
              <div className="pointer-events-auto w-full sm:max-w-sm">
                <CheckoutModal shotguns={shotguns} ammunition={ammunition} onSubmit={handleCheckout} onClose={() => setShowCheckout(false)} gpsTrack={gpsTrack} onViewTrack={setViewingTrack} />
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
  const [showAlert, setShowAlert] = useState(false);
  const inputCls = "w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelCls = "block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!data.date || !data.club_id || !data.checkin_time) { setShowAlert(true); } else { onSubmit(e); }
  };

  return (
    <>
      <ModalShell
        title="Check In"
        onClose={onClose}
        footer={
          <div className="flex gap-3">
            <motion.button type="submit" form="clay-checkin-form" whileTap={{ scale: 0.97 }}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
              Check In
            </motion.button>
            <motion.button type="button" onClick={onClose} whileTap={{ scale: 0.97 }}
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              Cancel
            </motion.button>
          </div>
        }
      >
        <form id="clay-checkin-form" onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
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
      {showAlert && createPortal(<div className="fixed inset-0 z-[50000] bg-black/50" />, document.body)}
      {showAlert && createPortal(<MissingFieldsAlert fields={['Date', 'Club', 'Check-in Time']} onClose={() => setShowAlert(false)} />, document.body)}
    </>
  );
}

// ─── Photo upload helper ──────────────────────────────────────────
async function handlePhotoUpload(files, data, onChange) {
  if (!files || files.length === 0) return;
  const maxFileSize = 5 * 1024 * 1024;
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const uploadedPhotos = [];
  for (const file of files) {
    if (file.size > maxFileSize || !validTypes.includes(file.type)) continue;
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      uploadedPhotos.push(response.file_url);
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
  }
  if (uploadedPhotos.length > 0) onChange('photos', [...(data.photos || []), ...uploadedPhotos]);
}

// ─── Check-out Modal ──────────────────────────────────────────────
function CheckoutModal({ shotguns, ammunition, onSubmit, onClose, gpsTrack, onViewTrack }) {
  const [data, setData] = useState({ checkout_time: new Date().toTimeString().slice(0, 5), shotgun_id: '', rounds_fired: '', ammunition_id: '', ammunition_used: '', notes: '', photos: [] });
  const [showAlert, setShowAlert] = useState(false);
  const onChange = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  const inputCls = "w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelCls = "block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";

  const handleCheckoutClick = () => {
    if (!data.shotgun_id || !data.rounds_fired) { setShowAlert(true); return; }
    onSubmit(data);
  };

  return (
    <>
      <ModalShell
        title="Check Out"
        onClose={onClose}
        footer={
          <div className="flex gap-3">
            <motion.button type="button" onClick={handleCheckoutClick} whileTap={{ scale: 0.97 }}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
              Check Out
            </motion.button>
            <motion.button type="button" onClick={onClose} whileTap={{ scale: 0.97 }}
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              Cancel
            </motion.button>
          </div>
        }
      >
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>Check-out Time</label>
            <input type="time" value={data.checkout_time} onChange={(e) => onChange('checkout_time', e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Ammunition / Cartridge</label>
            <BottomSheetSelect
              value={data.ammunition_id || ''}
              onChange={(val) => {
                const a = ammunition.find(x => x.id === val);
                onChange('ammunition_id', val);
                onChange('shotgun_id', '');
                if (a) onChange('ammunition_used', `${a.brand} ${a.caliber || ''} ${a.bullet_type || ''}`.trim());
              }}
              placeholder="Select cartridge type"
              options={ammunition.map(a => ({ value: a.id, label: `${a.brand}${a.caliber ? ` (${a.caliber})` : ''}${a.bullet_type ? ` - ${a.bullet_type}` : ''}` }))}
            />
            {!data.ammunition_id && (
              <div className="mt-2">
                <span className="text-xs text-slate-400">Or enter manually:</span>
                <input type="text" placeholder="e.g. 12 Gauge" value={data.ammunition_used} onChange={(e) => onChange('ammunition_used', e.target.value)} className={`${inputCls} mt-1.5`} />
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Shotgun</label>
            {data.ammunition_id ? (
              <BottomSheetSelect 
                value={data.shotgun_id} 
                onChange={(val) => onChange('shotgun_id', val)} 
                placeholder="Select shotgun" 
                options={shotguns.filter(s => {
                  const selectedAmmo = ammunition.find(a => a.id === data.ammunition_id);
                  return !selectedAmmo || !selectedAmmo.caliber || s.gauge === selectedAmmo.caliber;
                }).map(s => ({ value: s.id, label: s.name }))} 
              />
            ) : (
              <p className="text-xs text-slate-400">Select cartridge type first</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Rounds Fired</label>
            <input type="number" min="0" value={data.rounds_fired} onChange={(e) => onChange('rounds_fired', e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={data.notes} onChange={(e) => onChange('notes', e.target.value)} className={inputCls} rows="2" />
          </div>
          <div>
            <label className={labelCls}>Photos</label>
            <div className="flex gap-2 mb-2">
              <label className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-center cursor-pointer font-medium text-xs text-slate-600 dark:text-slate-300 transition-colors">
                📁 Choose
                <input type="file" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e.target.files, data, onChange)} className="hidden" />
              </label>
              <label className="flex-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-center cursor-pointer font-medium text-xs text-slate-600 dark:text-slate-300 transition-colors">
                📷 Camera
                <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => handlePhotoUpload(e.target.files, data, onChange)} className="hidden" />
              </label>
            </div>
            {data.photos && data.photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.photos.map((photo, idx) => (
                  <div key={idx} className="relative group">
                    <img src={photo} alt="preview" className="h-16 w-16 object-cover rounded-xl border border-slate-200" />
                    <button type="button" onClick={() => onChange('photos', data.photos.filter((_, i) => i !== idx))}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs shadow">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-3">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">GPS Track: <span className="font-semibold">{gpsTrack?.length || 0} points recorded</span></p>
            {gpsTrack && gpsTrack.length > 0 && (
              <motion.button type="button" onClick={() => onViewTrack(gpsTrack)} whileTap={{ scale: 0.97 }}
                className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                <Map className="w-4 h-4" />
                View GPS Track
              </motion.button>
            )}
            {(!gpsTrack || gpsTrack.length === 0) && (
              <p className="text-xs text-slate-400 italic">No GPS data collected. Check location permissions and try again.</p>
            )}
          </div>
        </div>
      </ModalShell>
      {showAlert && createPortal(<div className="fixed inset-0 z-[50000] bg-black/50" />, document.body)}
      {showAlert && createPortal(<MissingFieldsAlert fields={['Shotgun', 'Rounds Fired']} onClose={() => setShowAlert(false)} />, document.body)}
    </>
  );
}