import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import CheckinBanner from '@/components/CheckinBanner';
import { useGeolocation, calculateDistance } from '@/hooks/useGeolocation';
import { useOuting } from '@/context/OutingContext';
import { Plus, Clock } from 'lucide-react';
import RecordsList from '@/components/RecordsList';
import { decrementAmmoStock } from '@/lib/ammoUtils';
import UnifiedCheckoutModal from '@/components/UnifiedCheckoutModal';
import { trackingService } from '@/lib/trackingService';

let liveGpsTrack = [];  // Shared reference for GPS updates

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];

export default function DeerManagement() {
  const { activeOuting, loading: outingLoading, startOuting, endOutingWithData } = useOuting();
  const [areas, setAreas] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [ammunition, setAmmunition] = useState([]);
  const [records, setRecords] = useState([]);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const { location } = useGeolocation();
  const [nearbyLocation, setNearbyLocation] = useState(null);
  const [gpsTrack, setGpsTrack] = useState([]);  // Track live GPS updates

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

        const [areasList, riflesList, ammoList, recordsList] = await Promise.all([
          base44.entities.Area.filter({ created_by: currentUser.email }),
          base44.entities.Rifle.filter({ created_by: currentUser.email }),
          base44.entities.Ammunition.filter({ created_by: currentUser.email }),
          base44.entities.SessionRecord.filter({
            created_by: currentUser.email,
            category: 'deer_management',
          }),
        ]);

        setAreas(areasList);
        setRifles(riflesList);
        setAmmunition(ammoList);
        setRecords(recordsList);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Subscribe to live GPS updates
  useEffect(() => {
    console.log('🟣 DeerManagement: Subscribed to trackingService');
    const unsubscribe = trackingService.subscribe((track) => {
      console.log('🟣 DeerManagement: trackingService listener fired with', track.length, 'points');
      liveGpsTrack = track;  // Keep reference
      setGpsTrack(track);    // Update state
    });
    return () => {
      console.log('🟣 DeerManagement: Unsubscribed from trackingService');
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (location && areas.length > 0) {
      areas.forEach((area) => {
        if (area.center_point?.lat && area.center_point?.lng) {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            area.center_point.lat,
            area.center_point.lng
          );
          if (distance < 0.5) {
            setNearbyLocation({ name: area.name, distance });
          }
        }
      });
    }
  }, [location, areas]);

  const handleCheckin = async (e) => {
     e.preventDefault();
     console.log('🟢 CHECK IN CLICKED - DeerManagement');
     console.log('🟢 CHECK IN SAVE STARTED - location:', checkinData.place_name, 'date:', checkinData.date);
     try {
       const outing = await startOuting(checkinData);
       console.log('🟢 CHECK IN SAVE SUCCESS - outing id:', outing.id);
       trackingService.startTracking(outing.id, 'deer');

       setShowCheckin(false);
       setCheckinData({
         date: new Date().toISOString().split('T')[0],
         location_id: '',
         place_name: '',
         start_time: new Date().toTimeString().slice(0, 5),
       });
     } catch (error) {
       console.error('🟢 CHECK IN SAVE FAILED:', error.message);
       alert('Check-in failed: ' + error.message);
     }
   };

  const handleCheckout = async (checkoutData) => {
     console.log('🔴 CHECK OUT CLICKED - DeerManagement, outingId:', activeOuting?.id);
     if (!activeOuting) {
       alert('No active outing to check out from');
       return;
     }
     console.log('🔴 CHECK OUT SAVE STARTED - shot_anything:', checkoutData.shot_anything);
     try {
       if (checkoutData.ammunition_id && checkoutData.total_count) {
         await decrementAmmoStock(checkoutData.ammunition_id, parseInt(checkoutData.total_count));
       }

       const submitData = { ...checkoutData, active_checkin: false };
       if (!checkoutData.shot_anything) {
         submitData.species_list = [];
         submitData.total_count = null;
         submitData.rifle_id = null;
         submitData.ammunition_used = null;
       }

       const finalTrack = trackingService.stopTracking();
       await endOutingWithData(activeOuting.id, submitData, finalTrack);
       console.log('🔴 CHECK OUT SAVE SUCCESS - Outing finalized:', activeOuting.id);
       setShowCheckout(false);
     } catch (error) {
       console.error('🔴 CHECK OUT SAVE FAILED:', error.message, error.status, error.response?.data);
       alert('Checkout failed: ' + error.message);
     }
   };

  if (loading || outingLoading) {
    return (
      <div>
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  console.log('🎯 DeerManagement RENDER - showCheckin:', showCheckin, 'showCheckout:', showCheckout, 'activeOuting:', activeOuting?.id);
  
  return (
    <div>
      <Navigation />
      {nearbyLocation && (
        <CheckinBanner
          location={nearbyLocation.name}
          distance={nearbyLocation.distance}
          onDismiss={() => setNearbyLocation(null)}
          onCheckin={() => setShowCheckin(true)}
        />
      )}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">Deer Management</h1>
              <p className="text-muted-foreground">Record your deer stalking outings</p>
            </div>
            {!activeOuting && (
              <button
                onClick={() => setShowCheckin(true)}
                className="shrink-0 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 text-sm font-medium mt-1"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Start New Outing</span>
                <span className="sm:hidden">New Outing</span>
              </button>
            )}
            {activeOuting && (
              <div className="shrink-0 px-3 py-2 bg-primary/20 text-primary rounded-lg font-medium text-sm mt-1">
                Active outing
              </div>
            )}
          </div>
        </div>

        {activeOuting && (
          <div className="bg-accent border border-border rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Active Outing
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Location: {activeOuting.location_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Started: {new Date(activeOuting.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    console.log('🔴 CHECK-OUT BUTTON CLICKED - setShowCheckout(true) called');
                    setShowCheckout(true);
                  }}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Check Out
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Records List */}
          <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Outing Records</h2>
          <RecordsList 
            records={records} 
            category="deer_management"
            emptyMessage="No deer management outings recorded yet"
          />
          </div>

          {/* Modals rendered via Portal */}
        {createPortal(
          <>
            {(showCheckin || showCheckout) && (
              <div className="fixed inset-0 z-[50000] bg-black/50" />
            )}
            {showCheckin && (
              <>
                {console.log('🔵 CHECK-IN MODAL RENDERING - showCheckin is TRUE')}
                <div className="fixed inset-0 z-[50001] flex items-end sm:items-center justify-center">
                    <CheckinModal
                    data={checkinData}
                    areas={areas}
                    onSubmit={handleCheckin}
                    onChange={(field, value) =>
                      setCheckinData({ ...checkinData, [field]: value })
                    }
                    onClose={() => setShowCheckin(false)}
                  />
                </div>
              </>
            )}
            {showCheckout && (
              <>
                {console.log('🔴 CHECK-OUT MODAL RENDERING - showCheckout is TRUE, activeOuting:', activeOuting?.id)}
                <div className="fixed inset-0 z-[50001] flex items-center justify-center">
                  <UnifiedCheckoutModal
                    activeOuting={activeOuting}
                    rifles={rifles}
                    ammunition={ammunition}
                    onSubmit={handleCheckout}
                    onClose={() => setShowCheckout(false)}
                  />
                </div>
              </>
            )}
          </>,
          document.body
        )}
      </main>
    </div>
  );
}

function CheckinModal({ data, areas, onSubmit, onChange, onClose }) {
  const handleAreaSelect = (areaId) => {
    const selected = areas.find(a => a.id === areaId);
    onChange('location_id', areaId);
    if (selected) onChange('place_name', selected.name);
  };

  return (
    <div className="bg-card w-full sm:max-w-md sm:rounded-lg rounded-t-2xl p-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
      <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4 sm:hidden" />
      <h2 className="text-xl font-bold mb-4">Check In</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input type="date" value={data.date} onChange={(e) => onChange('date', e.target.value)} className="w-full px-3 py-3 border border-border rounded-lg bg-background text-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Select Area</label>
          <select 
            value={data.location_id || ''} 
            onChange={(e) => handleAreaSelect(e.target.value)} 
            className="w-full px-3 py-3 border border-border rounded-lg bg-background text-base" 
            required
          >
            <option value="">Select your area</option>
            {areas.map((area) => (<option key={area.id} value={area.id}>{area.name}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Place Name</label>
          <input type="text" value={data.place_name} onChange={(e) => onChange('place_name', e.target.value)} className="w-full px-3 py-3 border border-border rounded-lg bg-background text-base" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Check-in Time</label>
          <input type="time" value={data.start_time} onChange={(e) => onChange('start_time', e.target.value)} className="w-full px-3 py-3 border border-border rounded-lg bg-background text-base" required />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90">Check In</button>
          <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-border rounded-xl text-base hover:bg-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}