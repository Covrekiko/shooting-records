import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { useOuting } from '@/context/OutingContext';
import { Plus, Clock, Layers, Calendar, MapPin, Check, X } from 'lucide-react';
import RecordsSection from '@/components/RecordsSection';
import { decrementAmmoStock } from '@/lib/ammoUtils';
import UnifiedCheckoutModal from '@/components/UnifiedCheckoutModal.jsx';
import { trackingService } from '@/lib/trackingService';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { motion } from 'framer-motion';
import { DESIGN } from '@/lib/designConstants';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';

let liveGpsTrack = [];

export default function DeerManagement() {
  const { activeOuting, loading: outingLoading, startOuting, endOutingWithData } = useOuting();
  const [areas, setAreas] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [ammunition, setAmmunition] = useState([]);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gpsTrack, setGpsTrack] = useState([]);

  const [checkinData, setCheckinData] = useState({
    date: new Date().toISOString().split('T')[0],
    location_id: '',
    place_name: '',
    start_time: new Date().toTimeString().slice(0, 5),
  });

  const loadData = useCallback(async () => {
    try {
        const currentUser = await base44.auth.me();
        const [areasList, riflesList, ammoList] = await Promise.all([
          base44.entities.Area.filter({ created_by: currentUser.email }),
          base44.entities.Rifle.filter({ created_by: currentUser.email }),
          base44.entities.Ammunition.filter({ created_by: currentUser.email }),
        ]);
        setAreas(areasList);
        setRifles(riflesList);
        setAmmunition(ammoList);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pullToRefresh = usePullToRefresh(loadData, { disabled: showCheckin || showCheckout });

  useEffect(() => {
    const unsubscribe = trackingService.subscribe((track) => {
      liveGpsTrack = track;
      setGpsTrack(track);
    });
    return () => unsubscribe();
  }, []);

  const handleCheckin = async (e) => {
    e?.preventDefault?.();
    try {
      // Prevent duplicate active outings
      if (activeOuting) {
        alert('Already checked in. Please check out first.');
        return;
      }

      // Validate required fields
      if (!checkinData.location_id || !checkinData.place_name || !checkinData.date || !checkinData.start_time) {
        alert('Please select an area and enter a place name.');
        return;
      }

      const outing = await startOuting(checkinData);

      // Validate geolocation support before tracking starts from the check-in flow
      if (!navigator.geolocation) {
        alert('⚠️ Geolocation not available on this device. Check-in successful but GPS tracking disabled.');
        setShowCheckin(false);
        return;
      }

      setShowCheckin(false);
      setCheckinData({ date: new Date().toISOString().split('T')[0], location_id: '', place_name: '', start_time: new Date().toTimeString().slice(0, 5) });
    } catch (error) {
      console.error('Check-in failed:', error.message);
      alert('Check-in failed: ' + error.message);
    }
  };

  const handleCheckout = async (checkoutData) => {
    if (!activeOuting) { alert('No active outing to check out from'); return; }
    try {
      // Collect GPS track BEFORE stopping tracking
      const finalTrack = trackingService.getTrack();
      console.log('🟢 Checkout: Collected', finalTrack.length, 'GPS points before stop');

      // Use explicit rounds_fired (set in UnifiedCheckoutModal), fallback to total_count (animals harvested)
      const roundsFired = checkoutData.shot_anything
        ? (parseInt(checkoutData.rounds_fired) > 0 ? parseInt(checkoutData.rounds_fired) : parseInt(checkoutData.total_count) || 0)
        : 0;

      // Update rifle round counts only if something was shot (using fresh DB value)
      if (checkoutData.shot_anything && checkoutData.rifle_id && roundsFired > 0) {
        console.log('[DEER ARMORY DEBUG] rifle_id =', checkoutData.rifle_id);
        console.log('[DEER ARMORY DEBUG] roundsFired =', roundsFired);

        // Fetch fresh rifle from Base44 (don't use stale cache)
        const freshRifle = await base44.entities.Rifle.get(checkoutData.rifle_id);
        if (!freshRifle) {
          throw new Error('Rifle not found. Cannot update Armory counter.');
        }

        const before = Number(freshRifle.total_rounds_fired || 0);
        const after = before + roundsFired;

        console.log('[DEER ARMORY DEBUG] before =', before);
        console.log('[DEER ARMORY DEBUG] after =', after);

        await base44.entities.Rifle.update(checkoutData.rifle_id, {
          total_rounds_fired: after,
        });

        // Verify update succeeded
        const verify = await base44.entities.Rifle.get(checkoutData.rifle_id);
        console.log('[DEER ARMORY DEBUG] verify =', verify.total_rounds_fired);
      }

      // Prepare data first — determine if anything was shot before touching stock
      const submitData = { ...checkoutData, active_checkin: false, rounds_fired: roundsFired };
      if (!checkoutData.shot_anything) {
        submitData.species_list = [];
        submitData.total_count = null;
        submitData.rounds_fired = 0;
        submitData.rifle_id = null;
        submitData.ammunition_id = null;
        submitData.ammunition_used = null;
      }

      // Decrement ammo only if something was actually shot
      if (checkoutData.shot_anything && checkoutData.ammunition_id && roundsFired > 0) {
        await decrementAmmoStock(checkoutData.ammunition_id, roundsFired, 'deer_management', activeOuting.id);
      }

      // Save to database FIRST, then stop tracking
      await endOutingWithData(activeOuting.id, submitData, finalTrack);
      
      console.log('🟢 Checkout complete - tracking saved successfully');
      
      setShowCheckout(false);
    } catch (error) {
      console.error('🔴 Checkout failed:', error.message);
      alert('Checkout failed: ' + error.message);
      // IMPORTANT: Don't stop tracking on error - allows user to retry
    }
  };

  if (loading || outingLoading) {
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
      <PullToRefreshIndicator pulling={pullToRefresh.pulling} refreshing={pullToRefresh.refreshing} progress={pullToRefresh.progress} offline={!navigator.onLine} />
      <main className="max-w-2xl mx-auto px-3 pt-2 md:pt-4 pb-4 mobile-page-padding">
        <div className="mb-4 flex items-center justify-between">
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Deer Management</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Stalking outings & records</p>
          </div>

        </div>

        {!activeOuting && (
          <div className={`${DESIGN.CARD} p-5 mb-4 flex flex-col items-center justify-center text-center gap-3`}>
            <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-primary">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No Active Outing</p>
              <p className="text-xs text-muted-foreground mt-0.5">Start an outing to enable GPS tracking</p>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowCheckin(true)}
              className={`${DESIGN.BUTTON_PRIMARY} flex items-center gap-2 w-full justify-center`}>
              <Plus className="w-4 h-4" />
              Start Outing
            </motion.button>
          </div>
        )}

        {activeOuting && (
          <div className="bg-card border border-primary/35 rounded-2xl p-4 mb-4 shadow-[0_6px_20px_rgba(180,83,9,0.08)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Active Outing</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{activeOuting.location_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Started {new Date(activeOuting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
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
          <p className="text-xs font-bold text-slate-400 dark:text-muted-foreground uppercase tracking-widest mb-3">Recent Outings</p>
          <RecordsSection category="deer_management" title="Outing Records" emptyMessage="No deer management outings recorded yet" />
        </div>

        {showCheckin && (
          <CheckinModal
            data={checkinData}
            areas={areas}
            onSubmit={handleCheckin}
            onChange={(field, value) => setCheckinData((prev) => ({ ...prev, [field]: value }))}
            onClose={() => setShowCheckin(false)}
          />
        )}
        {showCheckout && (
          <UnifiedCheckoutModal
            activeOuting={activeOuting}
            rifles={rifles}
            ammunition={ammunition}
            onSubmit={handleCheckout}
            onClose={() => setShowCheckout(false)}
          />
        )}
      </main>
    </div>
  );
}

// ─── Check-in Modal ───────────────────────────────────────────────
function CheckinModal({ data, areas, onSubmit, onChange, onClose }) {
  const selectedArea = areas.find(a => a.id === data.location_id);
  const inputCls = 'w-full h-14 pl-14 pr-4 rounded-xl border border-border bg-card text-foreground text-sm font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all';
  const labelCls = 'text-[11px] font-bold text-accent uppercase tracking-widest mb-2 block';
  const fieldIconCls = 'absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-secondary text-primary flex items-center justify-center pointer-events-none';

  const handleAreaSelect = (areaId) => {
    onChange('location_id', areaId);
    if (areaId) {
      const selected = areas.find(a => a.id === areaId);
      if (selected) onChange('place_name', selected.name);
    }
  };

  return (
    <GlobalModal
      open={true}
      onClose={onClose}
      title={(
        <span className="flex items-center gap-4 min-w-0">
          <span className="w-12 h-12 rounded-full bg-secondary text-primary flex items-center justify-center text-2xl shadow-sm flex-shrink-0">🦌</span>
          <span className="min-w-0 block">
            <span className="text-2xl font-bold leading-tight text-foreground block">Start Outing</span>
            <span className="text-sm font-medium text-muted-foreground block mt-1">Deer Management check-in</span>
          </span>
        </span>
      )}
      onSubmit={onSubmit}
      footer={(
        <>
          <button type="button" onClick={onClose} className="flex-1 h-12 rounded-xl font-bold text-sm bg-card border border-border text-accent hover:bg-secondary transition-colors active:scale-95 flex items-center justify-center gap-3">
            <X className="w-5 h-5" /> Cancel
          </button>
          <button type="submit" className="flex-1 h-12 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-[#B45309] transition-colors active:scale-95 flex items-center justify-center gap-3 shadow-sm">
            <Check className="w-5 h-5" /> Check In
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-accent uppercase tracking-wide">Session Setup</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Date</label>
              <div className="relative">
                <span className={fieldIconCls}><Calendar className="w-5 h-5" /></span>
                <input type="date" value={data.date} onChange={(e) => onChange('date', e.target.value)} className={inputCls} required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Select Area</label>
              <div className="relative">
                <span className={fieldIconCls}><MapPin className="w-5 h-5" /></span>
                <select
                  value={data.location_id || ''}
                  onChange={(e) => handleAreaSelect(e.target.value)}
                  className={`${inputCls} appearance-none`}
                  required
                >
                  <option value="">Select your area</option>
                  {areas && areas.length > 0 ? (
                    areas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name || 'Unnamed Area'}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      No areas available
                    </option>
                  )}
                </select>
              </div>
              {selectedArea && (
                <p className="text-xs text-primary mt-2 flex items-center gap-1.5 font-medium">
                  <Check className="w-3.5 h-3.5" /> Area selected: {selectedArea.name}
                </p>
              )}
            </div>

            <div>
              <label className={labelCls}>Place Name</label>
              <div className="relative">
                <span className={fieldIconCls}><MapPin className="w-5 h-5" /></span>
                <input type="text" value={data.place_name || ''} onChange={(e) => onChange('place_name', e.target.value)} className={inputCls} placeholder={selectedArea ? `Suggested: ${selectedArea.name}` : 'Enter location name'} required />
              </div>
              <p className="text-xs text-muted-foreground mt-2">You can edit the location name if needed.</p>
            </div>

            <div>
              <label className={labelCls}>Check-In Time</label>
              <div className="relative">
                <span className={fieldIconCls}><Clock className="w-5 h-5" /></span>
                <input type="time" value={data.start_time} onChange={(e) => onChange('start_time', e.target.value)} className={inputCls} required />
              </div>
            </div>
          </div>
        </section>

        <section className={`relative overflow-hidden rounded-2xl border p-5 ${selectedArea ? 'border-border bg-secondary' : 'border-border bg-secondary'}`}>
          <div className="flex items-center gap-4 relative z-10">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${selectedArea ? 'bg-primary text-primary-foreground' : 'bg-card text-accent'}`}>
              <Check className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className={`text-base font-bold ${selectedArea ? 'text-accent' : 'text-accent'}`}>{selectedArea ? 'Ready to check in' : 'Select an area to continue'}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-accent mt-2">
                {selectedArea && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary" /> Area: <strong>{selectedArea.name}</strong></span>}
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> Time: <strong>{data.start_time}</strong></span>
              </div>
            </div>
          </div>
          <div className="absolute right-5 bottom-1 text-7xl opacity-10 pointer-events-none">🦌</div>
        </section>
      </div>
    </GlobalModal>
  );
}