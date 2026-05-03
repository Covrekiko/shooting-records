import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { compressImage } from '@/lib/imageUtils';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import CheckinBanner from '@/components/CheckinBanner';
import { calculateDistance } from '@/hooks/useGeolocation';
import GpsPathViewer from '@/components/GpsPathViewer';
import RecordsSection from '@/components/RecordsSection';
import { Plus, Map, Crosshair, ScanLine, Microscope, Calculator, Calendar, MapPin, Clock, FileText, Check, X, Camera, Upload, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import BallisticCalculator from '@/components/target-analysis/BallisticCalculator';
import { decrementAmmoStock, refundAmmoForRecord, getSelectableAmmunition } from '@/lib/ammoUtils';
import { formatAmmunitionLabel } from '@/utils/ammoLabels';
import { sessionManager } from '@/lib/sessionManager';
import { trackingService } from '@/lib/trackingService';
import BottomSheetSelect from '@/components/BottomSheetSelect';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { motion } from 'framer-motion';
import { DESIGN } from '@/lib/designConstants';
import TargetAnalysisPanel from '@/components/target-analysis/TargetAnalysisPanel';
import TargetAnalysisSummary from '@/components/target-analysis/TargetAnalysisSummary';
import { useAutoCheckin } from '@/hooks/useAutoCheckin';
import AutoCheckinBanner from '@/components/AutoCheckinBanner';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';
import { useFirstTimeGuide } from '@/hooks/useFirstTimeGuide';
import { FIRST_TIME_GUIDES } from '@/lib/firstTimeGuides';

export default function TargetShooting() {
  const [activeSession, setActiveSession] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [ammunition, setAmmunition] = useState([]);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [nearbyClub, setNearbyClub] = useState(null);
  const [location, setLocation] = useState(null);

  // GPS proximity detection now uses trackingService location updates via subscription
  // No separate watchPosition needed — trackingService is the single tracker
  useEffect(() => {
    // Subscribe to trackingService for proximity detection without duplicate tracking
    const unsubscribe = trackingService.subscribe((track) => {
      if (track.length > 0) {
        const lastPoint = track[track.length - 1];
        setLocation({ latitude: lastPoint.lat, longitude: lastPoint.lng });
      }
    });
    return () => unsubscribe();
  }, []);
  const [gpsTrack, setGpsTrack] = useState([]);
  const [viewingTrack, setViewingTrack] = useState(null);
  const [showTargetAnalysis, setShowTargetAnalysis] = useState(false);
  const [showBallisticCalc, setShowBallisticCalc] = useState(false);
  const { Guide: TargetSessionGuide, showGuideThen: showTargetSessionGuideThen } = useFirstTimeGuide(FIRST_TIME_GUIDES.targetSessionCreate);
  const [autoCheckinMatch, setAutoCheckinMatch] = useState(null);
  const [autoCheckinEnabled, setAutoCheckinEnabled] = useState(false);

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
    clubs: clubs.filter(c => c.type === 'Target Shooting' || c.type === 'Both'),
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
      category: 'target_shooting',
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
    trackingService.startTracking(session.id, 'target');
    setAutoCheckinMatch(null);
  };

  const loadData = useCallback(async () => {
    sessionManager.clearExpiredSessions();
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
            }
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pullToRefresh = usePullToRefresh(loadData, { disabled: showCheckin || showCheckout || showTargetAnalysis || showBallisticCalc || !!viewingTrack });

  useEffect(() => {
    // Subscribe to trackingService updates (unified GPS tracking)
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

  const handleCheckin = async () => {
    try {
      // Prevent duplicate active sessions
      if (activeSession) {
        alert('Already checked in. Please check out first.');
        return;
      }

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
        club_name: selectedClub?.name || 'Unknown Club',
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
      alert('Check-in failed: ' + (error.message || 'Unknown error'));
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
      if (finalTrack.length === 0) {
        console.warn('No GPS points were recorded for this target session. Checkout will continue without a route.');
      }

      // Update rifle round counts using fresh DB values (not stale cache)
      // Accumulate rounds per ammo ID in case multiple rifles share the same ammo
      const ammoTotals = {};
      for (const rifle of formData.rifles_used || []) {
        const roundsFired = parseInt(rifle.rounds_fired) || 0;

        // Update rifle total using fresh fetch (don't use stale cache)
        if (rifle.rifle_id && roundsFired > 0) {
          // Fetch fresh rifle from Base44 (don't use stale cache)
          const freshRifle = await base44.entities.Rifle.get(rifle.rifle_id);
          if (!freshRifle) {
            throw new Error(`Rifle ${rifle.rifle_id} not found. Cannot update Armory counter.`);
          }

          const before = Number(freshRifle.total_rounds_fired || 0);
          const after = before + roundsFired;

          await base44.entities.Rifle.update(rifle.rifle_id, {
            total_rounds_fired: after,
          });

        }

        // Accumulate rounds per ammo ID (handles multiple rifles using same ammo)
        if (rifle.ammunition_id && roundsFired > 0) {
          ammoTotals[rifle.ammunition_id] = (ammoTotals[rifle.ammunition_id] || 0) + roundsFired;
        }
      }

      // Decrement each unique ammo entry once with the total rounds used
      for (const [ammoId, totalRounds] of Object.entries(ammoTotals)) {
        await decrementAmmoStock(ammoId, totalRounds, 'target_shooting', activeSession.id);
      }

      // Prepare data
      const photoUrls = (formData.photos || []).map(photo => typeof photo === 'string' ? photo : photo.url);

      // Resolve club name if not already in activeSession
      const clubName = activeSession.club_name || (activeSession.club_id && clubs.find(c => c.id === activeSession.club_id)?.name) || activeSession.location_name || 'Not recorded';

      // Compute top-level summary fields for reliable restore on delete
      const allAmmoIds = [...new Set((formData.rifles_used || []).map(r => r.ammunition_id).filter(Boolean))];
      const totalRoundsFired = (formData.rifles_used || []).reduce((sum, r) => sum + (parseInt(r.rounds_fired) || 0), 0);

      // Save to database with retry logic
      let updateSuccess = false;
      let updateError = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await base44.entities.SessionRecord.update(activeSession.id, {
            status: 'completed',
            checkout_time: formData.checkout_time,
            rifles_used: formData.rifles_used,
            club_name: clubName,
            // Top-level summary for easy restore — first ammo ID used
            ammunition_id: allAmmoIds[0] || null,
            rounds_fired: totalRoundsFired,
            notes: formData.notes,
            photos: photoUrls,
            active_checkin: false,
            gps_track: finalTrack,
          });
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

      setActiveSession(null);
      setGpsTrack([]);
      setShowCheckout(false);
      setViewingTrack(null);
    } catch (error) {
      alert('Checkout failed: ' + (error.message || 'Unknown error'));
      // IMPORTANT: Don't stop tracking on error - allows user to retry
    }
  };

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <Navigation />
      <PullToRefreshIndicator pulling={pullToRefresh.pulling} refreshing={pullToRefresh.refreshing} progress={pullToRefresh.progress} offline={!navigator.onLine} />
      {nearbyClub && (
        <CheckinBanner location={nearbyClub.name} distance={nearbyClub.distance} onDismiss={() => setNearbyClub(null)} onCheckin={() => showTargetSessionGuideThen(() => setShowCheckin(true))} />
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
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Target Shooting</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Rifle range sessions</p>
          </div>

        </div>

        {!activeSession && (
          <div className="bg-card rounded-2xl border border-border p-5 mb-4 flex flex-col items-center justify-center text-center gap-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
              <Crosshair className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No Active Session</p>
              <p className="text-xs text-muted-foreground mt-0.5">Start a session to begin tracking</p>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => showTargetSessionGuideThen(() => setShowCheckin(true))}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 justify-center">
              <Plus className="w-4 h-4" />
              Start Session
            </motion.button>
          </div>
        )}

        {activeSession && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-primary uppercase tracking-widest">Active Session</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">
                    {activeSession.location_name || 'Target Range'}
                  </p>
                  <p className="text-xs text-muted-foreground">Started {activeSession.checkin_time}</p>
                  {activeSession.check_in_method === 'auto_geolocation' && (
                    <p className="text-xs text-primary font-medium mt-0.5">📍 Auto by Geolocation</p>
                  )}
                </div>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowCheckout(true)}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">
                Check Out
              </motion.button>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowTargetAnalysis(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-background border border-primary/30 rounded-xl text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
            >
              <Microscope className="w-5 h-5" />
              Open Target Analysis
            </motion.button>
          </div>
        )}

        {/* Quick tools row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Link
            to="/scope-click-card"
            className="flex flex-col gap-1.5 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3.5 hover:bg-primary/15 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="font-semibold text-sm">Scope / DOPE</p>
            </div>
            <p className="text-xs text-muted-foreground">Click cards & range data</p>
          </Link>
          <button
            onClick={() => setShowBallisticCalc(true)}
            className="flex flex-col gap-1.5 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3.5 hover:bg-primary/15 transition-colors text-left w-full"
          >
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary flex-shrink-0" />
              <p className="font-semibold text-sm">Ballistic Calc</p>
            </div>
            <p className="text-xs text-muted-foreground">Drop & drift tables</p>
          </button>
        </div>

        <div className="mt-4">
           <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Recent Sessions</p>
           <RecordsSection category="target_shooting" title="Session Records" emptyMessage="No target shooting sessions recorded yet" showTargetAnalysis={true} />
         </div>

        {viewingTrack && <GpsPathViewer track={viewingTrack} onClose={() => setViewingTrack(null)} />}
      </main>

      {showTargetAnalysis && activeSession && (
        <TargetAnalysisPanel
          sessionRecord={activeSession}
          onClose={() => setShowTargetAnalysis(false)}
        />
      )}

      {showBallisticCalc && createPortal(
        <div className="fixed inset-0 z-[60000] bg-background overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 pt-4 pb-8">
            <BallisticCalculator
              session={null}
              onBack={() => setShowBallisticCalc(false)}
            />
          </div>
        </div>,
        document.body
      )}

      <TargetSessionGuide />
      {showCheckin && (
        <CheckinModal data={checkinData} clubs={clubs} onSubmit={handleCheckin} onChange={(f, v) => setCheckinData({ ...checkinData, [f]: v })} onClose={() => setShowCheckin(false)} />
      )}
      {showCheckout && activeSession && (
        <CheckoutModal rifles={rifles} ammunition={ammunition} onSubmit={handleCheckout} onClose={() => setShowCheckout(false)} gpsTrack={gpsTrack} onViewTrack={setViewingTrack} sessionRecordId={activeSession.id} />
      )}
    </div>
  );
}

// ─── Check-in Modal ───────────────────────────────────────────────
function CheckinModal({ data, clubs, onSubmit, onChange, onClose }) {
  const labelCls = 'text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5';
  const fieldCls = 'w-full h-11 rounded-xl border border-slate-200 bg-white pl-4 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all focus:border-green-700 focus:ring-2 focus:ring-green-700/10';
  const iconWrapCls = 'w-11 h-11 rounded-xl bg-green-50 text-green-700 flex items-center justify-center flex-shrink-0';

  return (
    <GlobalModal
      open={true}
      onClose={onClose}
      title={(
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-full bg-green-800 text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <Crosshair className="w-5 h-5" />
          </span>
          <span className="min-w-0 block">
            <span className="text-lg font-bold leading-tight text-slate-900 block">Check In</span>
            <span className="text-xs font-medium text-slate-500 block mt-0.5">Start your target shooting session</span>
          </span>
        </span>
      )}
      onSubmit={onSubmit}
      footer={(
        <>
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl font-bold text-sm bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors active:scale-95 flex items-center justify-center gap-2">
            <X className="w-4 h-4" /> Cancel
          </button>
          <button type="submit" className="flex-1 h-11 rounded-xl font-bold text-sm bg-orange-600 text-white hover:bg-orange-700 transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-sm">
            <Check className="w-4 h-4" /> Check In
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex gap-3 min-w-0">
            <span className={iconWrapCls}><Calendar className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <label className={labelCls}>Date</label>
              <input type="date" value={data.date} onChange={(e) => onChange('date', e.target.value)} className={fieldCls} required />
            </div>
          </div>

          <div className="flex gap-3 min-w-0">
            <span className={iconWrapCls}><MapPin className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <label className={labelCls}>Club</label>
              <select value={data.club_id} onChange={(e) => onChange('club_id', e.target.value)} className={`${fieldCls} appearance-none`} required>
                <option value="">Select a club</option>
                {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 min-w-0">
            <span className={iconWrapCls}><Clock className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <label className={labelCls}>Check-In Time</label>
              <input type="time" value={data.checkin_time} onChange={(e) => onChange('checkin_time', e.target.value)} className={fieldCls} required />
            </div>
          </div>

          <div className="flex gap-3 min-w-0">
            <span className={iconWrapCls}><FileText className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <label className={labelCls}>Notes (optional)</label>
              <textarea value={data.notes} onChange={(e) => onChange('notes', e.target.value)} className={`${fieldCls} h-20 py-3 resize-none`} rows="3" placeholder="Add any notes about this session..." />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3 relative z-10">
            <span className="w-9 h-9 rounded-full bg-green-700 text-white flex items-center justify-center flex-shrink-0">
              <Check className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-green-800">Ready to check in?</p>
              <p className="text-xs text-slate-600 mt-0.5">Make sure the details above are correct before starting your session.</p>
            </div>
          </div>
          <Crosshair className="absolute right-5 bottom-3 w-16 h-16 text-green-700/10 pointer-events-none" />
        </div>
      </div>
    </GlobalModal>
  );
}

// ─── Photo upload helper ──────────────────────────────────────────
async function uploadPhotos(files, existingPhotos, setUploading) {
  if (!files || files.length === 0) return null;
  setUploading(true);
  try {
    const newPhotos = [...(existingPhotos || [])];
    // Compress all images first
    const compressedFiles = await Promise.all(
      Array.from(files).map(f => compressImage(f))
    );
    // Upload all images in parallel
    const uploadPromises = compressedFiles.map(f =>
      base44.integrations.Core.UploadFile({ file: f })
    );
    const uploadResults = await Promise.all(uploadPromises);
    
    // Add to photos array and queue analysis (non-blocking)
    uploadResults.forEach(result => {
      const photoData = { url: result.file_url };
      newPhotos.push(photoData);
      // Analysis happens in background, don't block checkout
      base44.functions.invoke('analyzeTargetPhoto', { photo_url: result.file_url })
        .then(r => {
          if (r?.data?.analysis) {
            const idx = newPhotos.findIndex(p => p.url === result.file_url);
            if (idx >= 0) newPhotos[idx].analysis = r.data.analysis;
          }
        })
        .catch(() => {});
    });
    
    return newPhotos;
  } catch (error) {
    alert('Upload failed: ' + (error.message || 'Unknown error'));
    return null;
  } finally {
    setUploading(false);
  }
}

// ─── Check-out Modal ──────────────────────────────────────────────
function CheckoutModal({ rifles, ammunition, onSubmit, onClose, gpsTrack, onViewTrack, sessionRecordId }) {
  const [errors, setErrors] = useState({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const [data, setData] = useState({
    checkout_time: new Date().toTimeString().slice(0, 5),
    rifles_used: [{ rifle_id: '', rounds_fired: '', meters_range: '', ammunition_id: '', ammunition_brand: '', caliber: '', bullet_type: '', grain: '' }],
    notes: '',
    photos: [],
  });

  const inputCls = DESIGN.INPUT;
  const labelCls = DESIGN.LABEL;
  const selectCls = DESIGN.SELECT;

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

  const fieldCls = 'w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition-all focus:border-green-700 focus:ring-2 focus:ring-green-700/10';
  const sectionCls = 'rounded-2xl border border-slate-200 bg-white p-3 shadow-sm';
  const sectionIconCls = 'w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center flex-shrink-0';
  const sectionLabelCls = 'text-xs font-bold text-slate-600 uppercase tracking-widest';

  return (
    <GlobalModal
      open={true}
      onClose={onClose}
      title={(
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-full bg-green-800 text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <Crosshair className="w-5 h-5" />
          </span>
          <span className="min-w-0 block">
            <span className="text-lg font-bold leading-tight text-slate-900 block">Check Out</span>
            <span className="text-xs font-medium text-slate-500 block mt-0.5">End your target shooting session</span>
          </span>
        </span>
      )}
      onSubmit={handleSubmit}
      footer={(
        <>
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl font-bold text-sm bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors active:scale-95 flex items-center justify-center gap-2">
            <X className="w-4 h-4" /> Cancel
          </button>
          <button type="submit" className="flex-1 h-11 rounded-xl font-bold text-sm bg-orange-600 text-white hover:bg-orange-700 transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-sm">
            <Check className="w-4 h-4" /> Check Out
          </button>
        </>
      )}
    >
      <div className="space-y-3">
        <section className={sectionCls}>
          <div className="flex gap-3 min-w-0">
            <span className={sectionIconCls}><Clock className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <label className={`${sectionLabelCls} block mb-1.5`}>Check-Out Time</label>
              <input type="time" value={data.checkout_time} onChange={(e) => setData(prev => ({ ...prev, checkout_time: e.target.value }))} className={fieldCls} required />
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className={sectionIconCls}><Crosshair className="w-5 h-5" /></span>
              <span className={sectionLabelCls}>Firearms Used</span>
            </div>
            <motion.button type="button" onClick={addRifleEntry} whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors flex-shrink-0">
              + Add
            </motion.button>
          </div>

          <div className="space-y-3">
            {data.rifles_used.map((rifle, index) => (
              <div key={index} className="relative rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                {errors[`rifle_${index}`] && <p className="text-red-500 text-xs font-medium pr-8">{errors[`rifle_${index}`]}</p>}
                <div className="flex justify-between items-center gap-3">
                  <span className="text-xs font-bold text-slate-800">Rifle {index + 1}</span>
                  {data.rifles_used.length > 1 && (
                    <button type="button" onClick={() => removeRifleEntry(index)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors" title="Remove rifle">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Rifle</label>
                  <select value={rifle.rifle_id} onChange={(e) => updateRifleEntry(index, 'rifle_id', e.target.value)} className={fieldCls}>
                    <option value="">Select rifle</option>
                    {rifles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Rounds</label>
                    <input type="number" placeholder="Rounds" value={rifle.rounds_fired} onChange={(e) => updateRifleEntry(index, 'rounds_fired', e.target.value)} className={`${fieldCls} min-w-0`} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Distance</label>
                    <input type="number" placeholder="Meters" value={rifle.meters_range} onChange={(e) => updateRifleEntry(index, 'meters_range', e.target.value)} className={`${fieldCls} min-w-0`} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Ammunition *</label>
                  {rifle.rifle_id ? (
                    <select
                      value={rifle.ammunition_id || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const a = ammunition.find(x => x.id === val);
                        setData(prev => {
                          const updated = [...prev.rifles_used];
                          updated[index] = { ...updated[index], ammunition_id: val, ammunition_brand: formatAmmunitionLabel(a), caliber: a?.caliber || '', bullet_type: a?.bullet_type || '', grain: a?.grain || '' };
                          return { ...prev, rifles_used: updated };
                        });
                      }}
                      className={fieldCls}
                    >
                      <option value="">Select ammunition (required)</option>
                      {(() => {
                        const selectedRifle = rifles.find(r => r.id === rifle.rifle_id);
                        return getSelectableAmmunition(ammunition, selectedRifle?.caliber || '').map(a => (
                          <option key={a.id} value={a.id}>
                            {formatAmmunitionLabel(a)}
                          </option>
                        ));
                      })()}
                    </select>
                  ) : (
                    <div className={`${fieldCls} flex items-center text-slate-500`}>Select a rifle first</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={sectionCls}>
          <div className="flex gap-3 min-w-0">
            <span className={sectionIconCls}><FileText className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <label className={`${sectionLabelCls} block mb-1.5`}>Notes</label>
              <textarea value={data.notes} onChange={(e) => setData(prev => ({ ...prev, notes: e.target.value }))} className={`${fieldCls} h-20 py-3 resize-none`} rows="2" placeholder="Add any notes about this session..." />
            </div>
          </div>
        </section>

        <section className={sectionCls}>
          <div className="flex gap-3 min-w-0">
            <span className={sectionIconCls}><Camera className="w-5 h-5" /></span>
            <div className="flex-1 min-w-0">
              <label className={`${sectionLabelCls} block`}>Photos</label>
              <p className="text-xs text-slate-500 mb-3">Add photos from your session (optional)</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <label className={`h-10 px-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-center cursor-pointer font-bold text-xs text-slate-700 transition-colors flex items-center justify-center gap-2 ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Upload className="w-4 h-4" /> {photoUploading ? 'Uploading...' : 'Choose File'}
                  <input type="file" accept="image/*" multiple className="hidden" disabled={photoUploading} onChange={async (e) => {
                    const result = await uploadPhotos(Array.from(e.target.files || []), data.photos, setPhotoUploading);
                    e.target.value = '';
                    if (result) setData(prev => ({ ...prev, photos: result }));
                  }} />
                </label>
                <label className={`h-10 px-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-center cursor-pointer font-bold text-xs text-slate-700 transition-colors flex items-center justify-center gap-2 ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Camera className="w-4 h-4" /> {photoUploading ? 'Uploading...' : 'Camera'}
                  <input type="file" accept="image/*" capture="environment" className="hidden" disabled={photoUploading} onChange={async (e) => {
                    const result = await uploadPhotos(Array.from(e.target.files || []), data.photos, setPhotoUploading);
                    e.target.value = '';
                    if (result) setData(prev => ({ ...prev, photos: result }));
                  }} />
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
          </div>
        </section>

        {gpsTrack && gpsTrack.length > 0 && (
          <motion.button type="button" onClick={() => onViewTrack(gpsTrack)} whileTap={{ scale: 0.97 }}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-bold text-slate-700">
            <Map className="w-4 h-4" />
            View GPS Track
          </motion.button>
        )}

        {sessionRecordId && (
          <section className="rounded-2xl border border-orange-200 bg-orange-50/70 p-3">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                <Crosshair className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Target Analysis</p>
                <p className="text-xs text-slate-500 mt-0.5">Analyze your performance and group your shots (optional)</p>
                <TargetAnalysisSummary sessionRecordId={sessionRecordId} />
              </div>
            </div>
          </section>
        )}
      </div>
    </GlobalModal>
  );
}