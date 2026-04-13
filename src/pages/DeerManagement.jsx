import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import CheckinBanner from '@/components/CheckinBanner';
import { useGeolocation, calculateDistance } from '@/hooks/useGeolocation';
import { useOuting } from '@/context/OutingContext';
import { Plus, Clock } from 'lucide-react';
import { decrementAmmoStock } from '@/lib/ammoUtils';
import UnifiedCheckoutModal from '@/components/UnifiedCheckoutModal';
import { trackingService } from '@/lib/trackingService';

let liveGpsTrack = [];  // Shared reference for GPS updates

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];

export default function DeerManagement() {
  const { activeOuting, loading: outingLoading, startOuting, endOutingWithData } = useOuting();
  const [locations, setLocations] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [ammunition, setAmmunition] = useState([]);
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

        const [locationsList, riflesList, ammoList] = await Promise.all([
          base44.entities.DeerLocation.filter({ created_by: currentUser.email }),
          base44.entities.Rifle.filter({ created_by: currentUser.email }),
          base44.entities.Ammunition.filter({ created_by: currentUser.email }),
        ]);

        setLocations(locationsList);
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
    if (location && locations.length > 0) {
      locations.forEach((loc) => {
        const match = loc.location?.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (match) {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            parseFloat(match[1]),
            parseFloat(match[2])
          );
          if (distance < 0.5) {
            setNearbyLocation({ name: loc.place_name, distance });
          }
        }
      });
    }
  }, [location, locations]);

  const handleCheckin = async (e) => {
     e.preventDefault();
     console.log('🟢 CHECK IN TRIGGERED - DeerManagement');
     try {
       const outing = await startOuting(checkinData);
       console.log('🟢 TRACKING STARTED for DeerManagement outing:', outing.id);
       trackingService.startTracking(outing.id, 'deer');

       setShowCheckin(false);
       setCheckinData({
         date: new Date().toISOString().split('T')[0],
         location_id: '',
         place_name: '',
         start_time: new Date().toTimeString().slice(0, 5),
       });
     } catch (error) {
       console.error('Error checking in:', error);
     }
   };

  const handleCheckout = async (checkoutData) => {
     console.log('🔴 CHECK OUT TRIGGERED - DeerManagement', 'outingId:', activeOuting?.id);
     if (!activeOuting) {
       alert('No active outing to check out from');
       return;
     }
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
       console.log('🔴 DeerManagement CHECKOUT: finalTrack has', finalTrack.length, 'points');
       console.log('🔴 DeerManagement CHECKOUT: submitData.shot_anything:', submitData.shot_anything);
       console.log('🔴 DeerManagement CHECKOUT: submitData keys:', Object.keys(submitData).join(', '));

       await endOutingWithData(activeOuting.id, submitData, finalTrack);
       console.log('🔴 CHECKOUT SUCCESS - Outing finalized:', activeOuting.id);
       setShowCheckout(false);
     } catch (error) {
       console.error('🔴 CHECKOUT ERROR:', error.message, error.status, error.response?.data);
       alert('Error during checkout: ' + error.message);
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
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Deer Management</h1>
            <p className="text-muted-foreground">Record your deer stalking outings</p>
          </div>
          {!activeOuting && (
            <button
              onClick={() => {
                console.log('🔵 CHECK-IN BUTTON CLICKED - setShowCheckin(true) called');
                setShowCheckin(true);
              }}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap mt-2"
            >
              <Plus className="w-5 h-5" />
              Start New Outing
            </button>
          )}
          {activeOuting && (
            <div className="px-6 py-3 bg-primary/20 text-primary rounded-lg font-medium mt-2">
              Active outing (ID: {activeOuting.id.slice(0, 8)}...)
            </div>
          )}
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

        {/* Modals rendered via Portal */}
        {createPortal(
          <>
            {(showCheckin || showCheckout) && (
              <div className="fixed inset-0 z-[50000] bg-black/50" />
            )}
            {showCheckin && (
              <>
                {console.log('🔵 CHECK-IN MODAL RENDERING - showCheckin is TRUE')}
                <div className="fixed inset-0 z-[50001] flex items-center justify-center">
                    <CheckinModal
                    data={checkinData}
                    locations={locations}
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

function CheckinModal({ data, locations, onSubmit, onChange, onClose }) {
  return (
    <div className="bg-card rounded-lg max-w-md w-full p-6">
      <h2 className="text-xl font-bold mb-4">Check In</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={data.date}
            onChange={(e) => onChange('date', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <select
            value={data.location_id}
            onChange={(e) => onChange('location_id', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            required
          >
            <option value="">Select a location</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.place_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Place Name</label>
          <input
            type="text"
            value={data.place_name}
            onChange={(e) => onChange('place_name', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Check-in Time</label>
          <input
            type="time"
            value={data.start_time}
            onChange={(e) => onChange('start_time', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            required
          />
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Check In
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}