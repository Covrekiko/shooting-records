import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import CheckinBanner from '@/components/CheckinBanner';
import { useGeolocation, calculateDistance } from '@/hooks/useGeolocation';
import { useOuting } from '@/context/OutingContext';
import { Plus, Clock } from 'lucide-react';
import RecordsSection from '@/components/RecordsSection';
import { decrementAmmoStock } from '@/lib/ammoUtils';
import UnifiedCheckoutModal from '@/components/UnifiedCheckoutModal';
import { trackingService } from '@/lib/trackingService';
import ModalShell from '@/components/ModalShell';
import { motion } from 'framer-motion';

let liveGpsTrack = [];

export default function DeerManagement() {
  const { activeOuting, loading: outingLoading, startOuting, endOutingWithData } = useOuting();
  const [areas, setAreas] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [ammunition, setAmmunition] = useState([]);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const { location } = useGeolocation();
  const [nearbyLocation, setNearbyLocation] = useState(null);
  const [gpsTrack, setGpsTrack] = useState([]);

  const [checkinData, setCheckinData] = useState({
    date: new Date().toISOString().split('T')[0],
    location_id: '',
    place_name: '',
    start_time: new Date().toTimeString().slice(0, 5),
  });

  useEffect(() => {
    async function loadData() {
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
    }
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = trackingService.subscribe((track) => {
      liveGpsTrack = track;
      setGpsTrack(track);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (location && areas.length > 0) {
      areas.forEach((area) => {
        if (area.center_point?.lat && area.center_point?.lng) {
          const distance = calculateDistance(location.latitude, location.longitude, area.center_point.lat, area.center_point.lng);
          if (distance < 0.5) setNearbyLocation({ name: area.name, distance });
        }
      });
    }
  }, [location, areas]);

  const handleCheckin = async (e) => {
    e.preventDefault();
    try {
      // Prevent duplicate active outings
      if (activeOuting) {
        alert('Already checked in. Please check out first.');
        return;
      }

      // Validate required fields
      if (!checkinData.location_id || !checkinData.place_name || !checkinData.date || !checkinData.start_time) {
        alert('All fields are required');
        return;
      }

      const outing = await startOuting(checkinData);

      // Validate geolocation support before starting tracking
      if (!navigator.geolocation) {
        alert('⚠️ Geolocation not available on this device. Check-in successful but GPS tracking disabled.');
        setShowCheckin(false);
        return;
      }

      trackingService.startTracking(outing.id, 'deer');
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

      // Update rifle round counts
      const roundsFired = parseInt(checkoutData.total_count) || 0;
      if (checkoutData.rifle_id && roundsFired > 0) {
        const currentRifle = rifles.find(r => r.id === checkoutData.rifle_id);
        if (currentRifle) {
          await base44.entities.Rifle.update(checkoutData.rifle_id, {
            total_rounds_fired: (currentRifle.total_rounds_fired || 0) + roundsFired,
            rounds_since_cleaning: (currentRifle.rounds_since_cleaning || 0) + roundsFired,
          });
        }
      }

      // Decrement ammo if needed
      if (checkoutData.ammunition_id && checkoutData.total_count) {
        await decrementAmmoStock(checkoutData.ammunition_id, parseInt(checkoutData.total_count), 'deer_management');
      }

      // Prepare data
      const submitData = { ...checkoutData, active_checkin: false };
      if (!checkoutData.shot_anything) {
        submitData.species_list = [];
        submitData.total_count = null;
        submitData.rifle_id = null;
        submitData.ammunition_used = null;
      }

      // Save to database FIRST, then stop tracking
      await endOutingWithData(activeOuting.id, submitData, finalTrack);
      
      // Only stop tracking AFTER successful database save
      trackingService.stopTracking();
      console.log('🟢 Checkout complete - tracking stopped after database save');
      
      setShowCheckout(false);
    } catch (error) {
      console.error('🔴 Checkout failed:', error.message);
      alert('Checkout failed: ' + error.message);
      // IMPORTANT: Don't stop tracking on error - allows user to retry
    }
  };

  if (loading || outingLoading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      <Navigation />
      {nearbyLocation && (
        <CheckinBanner location={nearbyLocation.name} distance={nearbyLocation.distance} onDismiss={() => setNearbyLocation(null)} onCheckin={() => setShowCheckin(true)} />
      )}
      <main className="max-w-4xl mx-auto px-3 pt-2 md:pt-4 pb-4 mobile-page-padding">
        <div className="mb-4 flex items-center justify-between">
          <div className="hidden md:block">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Deer Management</h1>
            <p className="text-xs text-slate-400 mt-0.5">Record your deer stalking outings</p>
          </div>
          {!activeOuting && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowCheckin(true)}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Start New Outing</span>
              <span className="sm:hidden">New Outing</span>
            </motion.button>
          )}
        </div>

        {activeOuting && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 rounded-2xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Active Outing</p>
                  <p className="text-xs text-slate-400">{activeOuting.location_name} · {new Date(activeOuting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3">Outing Records</h2>
          <RecordsSection category="deer_management" title="Outing Records" emptyMessage="No deer management outings recorded yet" />
        </div>

        {createPortal(
          <>
            {(showCheckin || showCheckout) && <div className="fixed inset-0 z-[50000] bg-black/50" onClick={() => { setShowCheckin(false); setShowCheckout(false); }} />}
            {showCheckin && (
              <div className="fixed inset-0 z-[50001] flex flex-col justify-end sm:justify-center sm:items-center pointer-events-none">
                <div className="pointer-events-auto w-full sm:max-w-md">
                  <CheckinModal
                    data={checkinData}
                    areas={areas}
                    onSubmit={handleCheckin}
                    onChange={(field, value) => setCheckinData({ ...checkinData, [field]: value })}
                    onClose={() => setShowCheckin(false)}
                  />
                </div>
              </div>
            )}
            {showCheckout && (
              <div className="fixed inset-0 z-[50001] flex flex-col justify-end sm:justify-center sm:items-center pointer-events-none">
                <div className="pointer-events-auto w-full sm:max-w-md">
                  <UnifiedCheckoutModal
                    activeOuting={activeOuting}
                    rifles={rifles}
                    ammunition={ammunition}
                    onSubmit={handleCheckout}
                    onClose={() => setShowCheckout(false)}
                  />
                </div>
              </div>
            )}
          </>,
          document.body
        )}
      </main>
    </div>
  );
}

// ─── Check-in Modal ───────────────────────────────────────────────
function CheckinModal({ data, areas, onSubmit, onChange, onClose }) {
  const selectedArea = areas.find(a => a.id === data.location_id);
  const inputCls = "w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelCls = "block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5";

  const handleAreaSelect = (areaId) => {
    onChange('location_id', areaId);
    if (!data.place_name && areaId) {
      const selected = areas.find(a => a.id === areaId);
      if (selected) onChange('place_name', selected.name);
    }
  };

  return (
    <ModalShell
      title="Start Outing"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <motion.button type="submit" form="deer-checkin-form" whileTap={{ scale: 0.97 }}
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
      <form id="deer-checkin-form" onSubmit={onSubmit} className="px-5 py-4 space-y-4">
        <div>
          <label className={labelCls}>Date</label>
          <input type="date" value={data.date} onChange={(e) => onChange('date', e.target.value)} className={inputCls} required />
        </div>
        <div>
          <label className={labelCls}>Select Area</label>
          <select value={data.location_id || ''} onChange={(e) => handleAreaSelect(e.target.value)} className={inputCls} required>
            <option value="">Select your area</option>
            {areas && areas.length > 0
              ? areas.map((area) => <option key={area.id} value={area.id}>{area.name || 'Unnamed Area'}</option>)
              : <option disabled>No areas available</option>
            }
          </select>
          {selectedArea && <p className="text-xs text-primary mt-1.5 font-semibold">✓ {selectedArea.name} selected</p>}
        </div>
        <div>
          <label className={labelCls}>Place Name</label>
          <input type="text" value={data.place_name} onChange={(e) => onChange('place_name', e.target.value)} className={inputCls} placeholder={selectedArea ? `Suggested: ${selectedArea.name}` : 'Enter location name'} required />
        </div>
        <div>
          <label className={labelCls}>Check-in Time</label>
          <input type="time" value={data.start_time} onChange={(e) => onChange('start_time', e.target.value)} className={inputCls} required />
        </div>
      </form>
    </ModalShell>
  );
}