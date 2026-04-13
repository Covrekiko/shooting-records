import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import CheckinBanner from '@/components/CheckinBanner';
import { useGeolocation, calculateDistance } from '@/hooks/useGeolocation';
import { useGpsTracking } from '@/hooks/useGpsTracking';
import LocationMap from '@/components/LocationMap';
import BoundaryMapViewer from '@/components/BoundaryMapViewer';
import GpsPathViewer from '@/components/GpsPathViewer';
import { Plus, Clock, Map } from 'lucide-react';

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];

export default function DeerManagement() {
  const [activeSession, setActiveSession] = useState(null);
  const [locations, setLocations] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const { location } = useGeolocation();
  const [nearbyLocation, setNearbyLocation] = useState(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const gpsTrack = useGpsTracking(!!activeSession);
  const [viewingTrack, setViewingTrack] = useState(null);

  const [checkinData, setCheckinData] = useState({
    date: new Date().toISOString().split('T')[0],
    location_id: '',
    place_name: '',
    start_time: new Date().toTimeString().slice(0, 5),
  });

  const [checkoutData, setCheckoutData] = useState({
    end_time: new Date().toTimeString().slice(0, 5),
    shot_anything: false,
    deer_species: '',
    pest_species: '',
    deer_species_other: '',
    number_shot: '',
    rifle_id: '',
    ammunition_used: '',
    notes: '',
    photos: [],
  });

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await base44.auth.me();

        const [locationsList, riflesList, activeSession] = await Promise.all([
          base44.entities.DeerLocation.filter({ created_by: currentUser.email }),
          base44.entities.Rifle.filter({ created_by: currentUser.email }),
          base44.entities.DeerManagement.filter({
            created_by: currentUser.email,
            active_checkin: true,
          }),
        ]);

        setLocations(locationsList);
        setRifles(riflesList);
        if (activeSession.length > 0) {
          setActiveSession(activeSession[0]);
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
    try {
      const session = await base44.entities.DeerManagement.create({
        ...checkinData,
        active_checkin: true,
      });
      setActiveSession(session);
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

  const handleCheckout = async (e) => {
   e.preventDefault();
   try {
     const uploadedPhotos = [];
     if (checkoutData.photos && checkoutData.photos.length > 0) {
       for (const photo of checkoutData.photos) {
         if (photo.startsWith('data:')) {
           const blob = await fetch(photo).then(r => r.blob());
           const { file_url } = await base44.integrations.Core.UploadFile({ file: blob });
           uploadedPhotos.push(file_url);
         } else {
           uploadedPhotos.push(photo);
         }
       }
     }
     const submitData = { ...checkoutData, photos: uploadedPhotos, active_checkin: false, gps_track: gpsTrack };
     if (!checkoutData.shot_anything) {
       submitData.number_shot = null;
       submitData.deer_species = null;
       submitData.rifle_id = null;
       submitData.ammunition_used = null;
     }
     await base44.entities.DeerManagement.update(activeSession.id, submitData);
      setActiveSession(null);
      setShowCheckout(false);
      setCheckoutData({
        end_time: new Date().toTimeString().slice(0, 5),
        shot_anything: false,
        deer_species: '',
        pest_species: '',
        deer_species_other: '',
        number_shot: '',
        rifle_id: '',
        ammunition_used: '',
        notes: '',
        photos: [],
      });
    } catch (error) {
      console.error('Error checking out:', error);
    }
  };

  if (loading) {
    return (
      <div>
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

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
          {!activeSession && (
            <button
              onClick={() => setShowCheckin(true)}
              disabled={!!activeSession}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2 whitespace-nowrap mt-2"
            >
              <Plus className="w-5 h-5" />
              Start New Outing
            </button>
          )}
        </div>



        {activeSession && (
          <div className="bg-accent border border-border rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Active Session
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Location: {activeSession.place_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Check-in: {activeSession.start_time}
                </p>
              </div>
              <div className="flex gap-2">
                {activeSession.boundary_map_data && (
                  <button
                    onClick={() => setShowLocationMap(true)}
                    className="px-6 py-2 bg-secondary text-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <Map className="w-5 h-5" />
                    View Map
                  </button>
                )}
                <button
                  onClick={() => setShowCheckout(true)}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  Check Out
                </button>
              </div>
            </div>
          </div>
        )}

        {showLocationMap && activeSession && (
          <BoundaryMapViewer
            mapData={activeSession.boundary_map_data}
            center={activeSession.location ? activeSession.location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ? [parseFloat(activeSession.location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/)[1]), parseFloat(activeSession.location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/)[2])] : null : null}
            onClose={() => setShowLocationMap(false)}
          />
        )}

        {viewingTrack && (
          <GpsPathViewer track={viewingTrack} onClose={() => setViewingTrack(null)} />
        )}

        {showCheckin && (
          <CheckinModal
            data={checkinData}
            locations={locations}
            onSubmit={handleCheckin}
            onChange={(field, value) =>
              setCheckinData({ ...checkinData, [field]: value })
            }
            onClose={() => setShowCheckin(false)}
          />
        )}

        {showCheckout && activeSession && (
          <CheckoutModal
            data={checkoutData}
            rifles={rifles}
            onSubmit={handleCheckout}
            onChange={(field, value) =>
              setCheckoutData({ ...checkoutData, [field]: value })
            }
            onClose={() => setShowCheckout(false)}
          />
        )}
      </main>
    </div>
  );
}

function CheckinModal({ data, locations, onSubmit, onChange, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
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
    </div>
  );
}

async function handlePhotoUpload(files, data, onChange) {
  if (!files || files.length === 0) return;
  
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange('photos', [...(data.photos || []), e.target.result]);
    };
    reader.readAsDataURL(file);
  }
}

function CheckoutModal({ data, rifles, onSubmit, onChange, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-card rounded-lg max-w-md w-full p-6 my-8">
        <h2 className="text-xl font-bold mb-4">Check Out</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Check-out Time</label>
            <input
              type="time"
              value={data.end_time}
              onChange={(e) => onChange('end_time', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Did you shoot anything?</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => onChange('shot_anything', false)}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                  !data.shot_anything
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border hover:bg-secondary'
                }`}
              >
                No
              </button>
              <button
                type="button"
                onClick={() => onChange('shot_anything', true)}
                className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                  data.shot_anything
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border hover:bg-secondary'
                }`}
              >
                Yes
              </button>
            </div>
          </div>

          {data.shot_anything && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">What did you shoot?</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => onChange('deer_species', 'deer')}
                    className={`flex-1 px-3 py-2 rounded-lg transition-colors ${data.deer_species === 'deer' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-secondary'}`}
                  >
                    Deer
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange('deer_species', 'pest')}
                    className={`flex-1 px-3 py-2 rounded-lg transition-colors ${data.deer_species === 'pest' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-secondary'}`}
                  >
                    Pest Control
                  </button>
                </div>
              </div>
              {data.deer_species === 'deer' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Deer Species</label>
                  <select
                    value={data.deer_species_other || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange('deer_species_other', val);
                      if (val && val !== 'Other') {
                        onChange('deer_species', val);
                      }
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    required
                  >
                    <option value="">Select species</option>
                    {DEER_SPECIES.map((species) => (
                      <option key={species} value={species}>
                        {species}
                      </option>
                    ))}
                  </select>
                  {data.deer_species_other === 'Other' && (
                    <input
                      type="text"
                      placeholder="Enter custom deer species"
                      value={data.deer_species}
                      onChange={(e) => onChange('deer_species', e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background mt-2"
                      required
                    />
                  )}
                </div>
              )}
              {data.deer_species === 'pest' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Pest Species</label>
                  <select
                    value={data.pest_species}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChange('pest_species', val);
                      onChange('deer_species', val);
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    required
                  >
                    <option value="">Select pest species</option>
                    <option value="Fox">Fox</option>
                    <option value="Rabbit">Rabbit</option>
                    <option value="Hare">Hare</option>
                    <option value="Crow">Crow</option>
                    <option value="Magpie">Magpie</option>
                    <option value="Pigeon">Pigeon</option>
                    <option value="Squirrel">Squirrel</option>
                    <option value="Other">Other</option>
                  </select>
                  {data.pest_species === 'Other' && (
                    <input
                      type="text"
                      placeholder="Enter custom pest species"
                      value={data.pest_species}
                      onChange={(e) => {
                        const val = e.target.value;
                        onChange('pest_species', val);
                        onChange('deer_species', val);
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background mt-2"
                      required
                    />
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Number Shot</label>
                <input
                  type="number"
                  value={data.number_shot}
                  onChange={(e) => onChange('number_shot', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  required={data.shot_anything}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rifle Used</label>
                <select
                  value={data.rifle_id}
                  onChange={(e) => onChange('rifle_id', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="">Select a rifle</option>
                  {rifles.map((rifle) => (
                    <option key={rifle.id} value={rifle.id}>
                      {rifle.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ammunition Used</label>
                <input
                  type="text"
                  value={data.ammunition_used}
                  onChange={(e) => onChange('ammunition_used', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={data.notes}
              onChange={(e) => onChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              rows="2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Photos</label>
            <div className="flex gap-2 mb-3">
              <label className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center cursor-pointer font-medium transition-colors">
                📁 Choose Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(e.files, data, onChange)}
                  className="hidden"
                />
              </label>
              <label className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center cursor-pointer font-medium transition-colors">
                📷 Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhotoUpload(e.files, data, onChange)}
                  className="hidden"
                />
              </label>
            </div>
            {data.photos && data.photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.photos.map((photo, idx) => (
                  <div key={idx} className="relative group">
                    <img src={photo} alt="preview" className="h-20 w-20 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => onChange('photos', data.photos.filter((_, i) => i !== idx))}
                      className="absolute top-0 right-0 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              Check Out
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
    </div>
  );
}