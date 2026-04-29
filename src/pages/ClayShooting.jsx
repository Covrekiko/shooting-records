import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import CheckinBanner from '@/components/CheckinBanner';
import { useGeolocation, calculateDistance } from '@/hooks/useGeolocation';
import { Plus, Map, Target, ClipboardList } from 'lucide-react';
import ClayScorecard from '@/components/clay/ClayScorecard';
import ClayCheckoutSummary from '@/components/clay/ClayCheckoutSummary';

import ClayAnalyticsDashboard from '@/components/clay/ClayAnalyticsDashboard';
import GpsPathViewer from '@/components/GpsPathViewer';
import RecordsSection from '@/components/RecordsSection';
import { decrementAmmoStock } from '@/lib/ammoUtils';
import { sessionManager } from '@/lib/sessionManager';
import { trackingService } from '@/lib/trackingService';
import BottomSheetSelect from '@/components/BottomSheetSelect';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { motion } from 'framer-motion';
import { DESIGN } from '@/lib/designConstants';
import { useAutoCheckin } from '@/hooks/useAutoCheckin';
import AutoCheckinBanner from '@/components/AutoCheckinBanner';

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
  const [showScorecard, setShowScorecard] = useState(false);
  const [autoCheckinMatch, setAutoCheckinMatch] = useState(null);
  const [autoCheckinEnabled, setAutoCheckinEnabled] = useState(false);
  const [stands, setStands] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);

  const [checkinData, setCheckinData] = useState({
    date: new Date().toISOString().split('T')[0],
    club_id: '',
    checkin_time: new Date().toTimeString().slice(0, 5),
    notes: '',
  });

  useEffect(() => {
    base44.auth.me().then(u => setAutoCheckinEnabled(u?.autoCheckinEnabled === true));
  }, []);

  useAutoCheckin({
    enabled: autoCheckinEnabled,
    clubs: clubs.filter(c => c.type === 'Clay Shooting' || c.type === 'Both'),
    areas: [],
    hasActiveSession: !!activeSession,
    onAutoCheckin: (match) => setAutoCheckinMatch(match),
  });

  const handleAutoCheckinConfirm = async () => {
    if (!autoCheckinMatch || activeSession) return;
    const now = new Date();
    const session = await base44.entities.SessionRecord.create({
      date: now.toISOString().split('T')[0],
      club_id: autoCheckinMatch.id,
      category: 'clay_shooting',
      status: 'active',
      location_id: autoCheckinMatch.id,
      location_name: autoCheckinMatch.name,
      checkin_time: now.toTimeString().slice(0, 5),
      start_time: now.toTimeString().slice(0, 5),
      notes: '',
      photos: [],
      gps_track: [],
      check_in_method: 'auto_geolocation',
      auto_check_in_detected: true,
      auto_check_in_location_id: autoCheckinMatch.id,
      auto_check_in_time: now.toISOString(),
      auto_check_in_confirmed: true,
    });
    setActiveSession(session);
    trackingService.startTracking(session.id, 'clay');
    setAutoCheckinMatch(null);
  };

  const reloadAnalytics = useCallback(async () => {
    try {
      const currentUser = await base44.auth.me();
      const [standsList, allSessionsList] = await Promise.all([
        base44.entities.ClayStand.filter({ created_by: currentUser.email }),
        base44.entities.SessionRecord.filter({ created_by: currentUser.email, category: 'clay_shooting', status: 'completed' }),
      ]);
      setStands(standsList);
      setAllSessions(allSessionsList);
      setAnalyticsRefreshKey(k => k + 1);
    } catch (error) {
      console.error('Error reloading analytics:', error);
    }
  }, []);

   useEffect(() => {
     sessionManager.clearExpiredSessions();
     async function loadData() {
       try {
         const currentUser = await base44.auth.me();
         const [clubsList, shotgunsList, ammoList, activeSessions, standsList, allSessionsList] = await Promise.all([
           base44.entities.Club.filter({ created_by: currentUser.email }),
           base44.entities.Shotgun.filter({ created_by: currentUser.email }),
           base44.entities.Ammunition.filter({ created_by: currentUser.email }),
           base44.entities.SessionRecord.filter({ created_by: currentUser.email, category: 'clay_shooting', status: 'active' }),
           base44.entities.ClayStand.filter({ created_by: currentUser.email }),
           base44.entities.SessionRecord.filter({ created_by: currentUser.email, category: 'clay_shooting', status: 'completed' }),
         ]);
         setClubs(clubsList);
         setShotguns(shotgunsList);
         setAmmunition(ammoList);
         setStands(standsList);
         setAllSessions(allSessionsList);
         setAnalyticsRefreshKey(0);
        if (activeSessions.length > 0) {
          const session = activeSessions[0];
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
    // Subscribe to trackingService updates (unified GPS tracking)
    const unsubscribe = trackingService.subscribe((track) => setGpsTrack(track));
    return () => unsubscribe();
  }, []);

  // Proximity detection: whenever tracking updates location, check nearby clubs
  useEffect(() => {
    const unsubscribe = trackingService.subscribe((track) => {
      if (track.length > 0 && clubs.length > 0) {
        const lastPoint = track[track.length - 1];
        clubs.forEach((club) => {
          const match = club.location?.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
          if (match) {
            const distance = calculateDistance(lastPoint.lat, lastPoint.lng, parseFloat(match[1]), parseFloat(match[2]));
            if (distance < 0.5) setNearbyClub({ name: club.name, distance });
          }
        });
      }
    });
    return () => unsubscribe();
  }, [clubs]);

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

      // Update shotgun cartridge count (Since Cleaning is calculated based on total and baseline)
       const cartridgesFired = parseInt(formData.rounds_fired) || 0;
       if (formData.shotgun_id && cartridgesFired > 0) {
         const currentShotgun = shotguns.find(s => s.id === formData.shotgun_id);
         if (currentShotgun) {
           await base44.entities.Shotgun.update(formData.shotgun_id, {
             total_cartridges_fired: (currentShotgun.total_cartridges_fired || 0) + cartridgesFired,
           });
         }
       }

      // Decrement ammo if needed — pass session ID for reliable restore on delete
      if (formData.ammunition_id && formData.rounds_fired) {
        await decrementAmmoStock(formData.ammunition_id, parseInt(formData.rounds_fired), 'clay_shooting', activeSession.id);
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
      {autoCheckinMatch && (
        <AutoCheckinBanner
          match={autoCheckinMatch}
          onConfirm={handleAutoCheckinConfirm}
          onCancel={() => setAutoCheckinMatch(null)}
          onDismiss={() => setAutoCheckinMatch(null)}
        />
      )}
      <main className="max-w-2xl mx-auto px-3 pt-2 md:pt-4 pb-4 mobile-page-padding">
        <div className="mb-4 flex items-center justify-between">
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Clay Shooting</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Shotgun clay sessions</p>
          </div>

        </div>

        {!activeSession && (
          <div className={`${DESIGN.CARD} p-5 mb-4 flex flex-col items-center justify-center text-center gap-3`}>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center">
              <Target className="w-6 h-6 text-slate-400 dark:text-slate-500" />
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest">Active Session</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                    {activeSession.location_name || 'Clay Ground'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Started {activeSession.checkin_time}</p>
                  {activeSession.check_in_method === 'auto_geolocation' && (
                    <p className="text-[10px] text-primary font-medium mt-0.5">📍 Auto by Geolocation</p>
                  )}
                </div>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCheckout(true)}
                className={DESIGN.BUTTON_PRIMARY}>
                Check Out
              </motion.button>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowScorecard(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-background dark:bg-slate-800 border border-primary/30 rounded-xl text-sm font-semibold text-primary hover:bg-primary/5 transition-colors">
              <ClipboardList className="w-4 h-4" />
              Open Scorecard
            </motion.button>
          </div>
        )}

        {/* Analytics Section */}
         {(stands.length > 0 || allSessions.length > 0) && (
           <div className="mt-6">
             <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowAnalytics(!showAnalytics)}
               className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-colors ${showAnalytics ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
               📊 Analytics
             </motion.button>
             {showAnalytics && <div className="mt-4" key={analyticsRefreshKey}><ClayAnalyticsDashboard sessions={allSessions} stands={stands} onRefresh={reloadAnalytics} /></div>}
           </div>
         )}

        <div className="mt-6">
           <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Recent Sessions</p>
           <RecordsSection category="clay_shooting" title="Session Records" emptyMessage="No clay shooting sessions recorded yet" onRecordDeleted={reloadAnalytics} />
         </div>

        {viewingTrack && <GpsPathViewer track={viewingTrack} onClose={() => setViewingTrack(null)} />}

        {showScorecard && activeSession && (
          <ClayScorecard
            session={activeSession}
            shotguns={shotguns}
            ammunition={ammunition}
            onClose={() => setShowScorecard(false)}
          />
        )}
      </main>

      {showCheckin && (
        <CheckinModal data={checkinData} clubs={clubs} onSubmit={handleCheckin} onChange={(f, v) => setCheckinData({ ...checkinData, [f]: v })} onClose={() => setShowCheckin(false)} />
      )}
      {showCheckout && activeSession && (
        <CheckoutModal shotguns={shotguns} ammunition={ammunition} onSubmit={handleCheckout} onClose={() => setShowCheckout(false)} gpsTrack={gpsTrack} onViewTrack={setViewingTrack} sessionId={activeSession?.id} onShowScorecard={() => { setShowCheckout(false); setShowScorecard(true); }} />
      )}
    </div>
  );
}

// ─── Check-in Modal ───────────────────────────────────────────────
function CheckinModal({ data, clubs, onSubmit, onChange, onClose }) {
  const inputCls = DESIGN.INPUT;
  const labelCls = DESIGN.LABEL;
  const selectCls = DESIGN.SELECT;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <GlobalModal
      open={true}
      onClose={onClose}
      title="Check In"
      onSubmit={handleSubmit}
      primaryAction="Check In"
      secondaryAction="Cancel"
    >
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" value={data.date} onChange={(e) => onChange('date', e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Club</label>
          <select value={data.club_id} onChange={(e) => onChange('club_id', e.target.value)} className={selectCls} required>
            <option value="">Select a club</option>
            {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Check-in Time</label>
          <input type="time" value={data.checkin_time} onChange={(e) => onChange('checkin_time', e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Notes (optional)</label>
          <textarea value={data.notes} onChange={(e) => onChange('notes', e.target.value)} className={inputCls} rows="3" />
        </div>
      </div>
    </GlobalModal>
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
function CheckoutModal({ shotguns, ammunition, onSubmit, onClose, gpsTrack, onViewTrack, sessionId, onShowScorecard }) {
  const [data, setData] = useState({ checkout_time: new Date().toTimeString().slice(0, 5), shotgun_id: '', rounds_fired: '', ammunition_id: '', ammunition_used: '', notes: '', photos: [] });
  const [scorecardStats, setScorecardStats] = useState(null);
  const onChange = (field, value) => setData(prev => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (!sessionId) return;
    base44.entities.ClayScorecard.filter({ clay_session_id: sessionId }).then(res => {
      if (res[0]) setScorecardStats(res[0]);
    });
  }, [sessionId]);

  const inputCls = DESIGN.INPUT;
  const labelCls = DESIGN.LABEL;
  const selectCls = DESIGN.SELECT;

  const handleSubmit = () => {
    if (!data.shotgun_id || !data.rounds_fired) { alert('Shotgun and Rounds Fired are required'); return; }
    onSubmit(data);
  };

  return (
    <GlobalModal
      open={true}
      onClose={onClose}
      title="Check Out"
      onSubmit={handleSubmit}
      primaryAction="Check Out"
      secondaryAction="Cancel"
    >
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Check-out Time</label>
          <input type="time" value={data.checkout_time} onChange={(e) => onChange('checkout_time', e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Shotgun</label>
          <select value={data.shotgun_id} onChange={(e) => onChange('shotgun_id', e.target.value)} className={selectCls} required>
            <option value="">Select a shotgun</option>
            {shotguns.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Rounds Fired</label>
          <input type="number" min="0" value={data.rounds_fired} onChange={(e) => onChange('rounds_fired', e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Ammunition <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input type="text" value={data.ammunition_used || ''} onChange={(e) => onChange('ammunition_used', e.target.value)}
            placeholder="e.g. Hull Comp X 28g No.7" className={inputCls} />
          {ammunition.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] text-muted-foreground mb-1">Or pick from saved:</p>
              <select
                value={data.ammunition_id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const a = ammunition.find(x => x.id === val);
                  onChange('ammunition_id', val);
                  if (a) onChange('ammunition_used', `${a.brand}${a.caliber ? ` (${a.caliber})` : ''}${a.bullet_type ? ` - ${a.bullet_type}` : ''}`.trim());
                }}
                className={selectCls}
              >
                <option value="">Select saved ammunition</option>
                {ammunition.filter(a => {
                  const selectedShotgun = shotguns.find(s => s.id === data.shotgun_id);
                  return !selectedShotgun || !selectedShotgun.gauge || a.caliber === selectedShotgun.gauge;
                }).map(a => <option key={a.id} value={a.id}>{`${a.brand}${a.caliber ? ` (${a.caliber})` : ''}${a.bullet_type ? ` - ${a.bullet_type}` : ''}`}</option>)}
              </select>
            </div>
          )}
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea value={data.notes} onChange={(e) => onChange('notes', e.target.value)} className={inputCls} rows="2" />
        </div>
        <div>
          <label className={labelCls}>Photos</label>
          <div className="flex gap-2 mb-2">
            <label className="flex-1 px-3 py-2.5 bg-secondary hover:bg-secondary/80 rounded-xl text-center cursor-pointer font-semibold text-xs transition-colors">
              Choose File
              <input type="file" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e.target.files, data, onChange)} className="hidden" />
            </label>
            <label className="flex-1 px-3 py-2.5 bg-secondary hover:bg-secondary/80 rounded-xl text-center cursor-pointer font-semibold text-xs transition-colors">
              Camera
              <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => handlePhotoUpload(e.target.files, data, onChange)} className="hidden" />
            </label>
          </div>
          {data.photos && data.photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.photos.map((photo, idx) => (
                <div key={idx} className="relative group">
                  <img src={photo} alt="preview" className="h-16 w-16 object-cover rounded-xl border border-border" />
                  <button type="button" onClick={() => onChange('photos', data.photos.filter((_, i) => i !== idx))}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs shadow">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
        {scorecardStats && scorecardStats.total_stands > 0 && (
          <ClayCheckoutSummary sessionId={sessionId} scorecard={scorecardStats} shotguns={shotguns} ammunition={ammunition} onShowScorecard={onShowScorecard} />
        )}
        {gpsTrack && gpsTrack.length > 0 && (
          <motion.button type="button" onClick={() => onViewTrack(gpsTrack)} whileTap={{ scale: 0.97 }}
            className="w-full px-3 py-2.5 bg-secondary hover:bg-secondary/80 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium text-foreground">
            <Map className="w-4 h-4" />
            View GPS Track
          </motion.button>
        )}
      </div>
    </GlobalModal>
  );
}