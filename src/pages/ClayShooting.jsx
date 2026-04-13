import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import CheckinBanner from '@/components/CheckinBanner';
import { useGeolocation, calculateDistance } from '@/hooks/useGeolocation';
import { Clock, Plus } from 'lucide-react';
import { useGpsTracking } from '@/hooks/useGpsTracking';

export default function ClayShooting() {
  const [activeSession, setActiveSession] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [shotguns, setShotguns] = useState([]);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(true);
  const { location } = useGeolocation();
  const [nearbyClub, setNearbyClub] = useState(null);
  const gpsTrack = useGpsTracking(!!activeSession);

  const [checkinData, setCheckinData] = useState({
    date: new Date().toISOString().split('T')[0],
    club_id: '',
    checkin_time: new Date().toTimeString().slice(0, 5),
    notes: '',
  });

  const [checkoutData, setCheckoutData] = useState({
    checkout_time: new Date().toTimeString().slice(0, 5),
    shotgun_id: '',
    rounds_fired: '',
    ammunition_used: '',
    notes: '',
    photos: [],
  });

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await base44.auth.me();

        const [clubsList, shotgunsList, activeSession] = await Promise.all([
          base44.entities.Club.filter({ created_by: currentUser.email }),
          base44.entities.Shotgun.filter({ created_by: currentUser.email }),
          base44.entities.ClayShooting.filter({
            created_by: currentUser.email,
            active_checkin: true,
          }),
        ]);

        setClubs(clubsList);
        setShotguns(shotgunsList);
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
    if (location && clubs.length > 0) {
      clubs.forEach((club) => {
        const match = club.location?.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (match) {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            parseFloat(match[1]),
            parseFloat(match[2])
          );
          if (distance < 0.5) {
            setNearbyClub({ name: club.name, distance });
          }
        }
      });
    }
  }, [location, clubs]);

  const handleCheckin = async (e) => {
    e.preventDefault();
    try {
      const session = await base44.entities.ClayShooting.create({
        ...checkinData,
        active_checkin: true,
      });
      setActiveSession(session);
      setShowCheckin(false);
      setCheckinData({
        date: new Date().toISOString().split('T')[0],
        club_id: '',
        checkin_time: new Date().toTimeString().slice(0, 5),
        notes: '',
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
        for (const photoData of checkoutData.photos) {
          try {
            if (photoData.startsWith('data:')) {
              const res = await fetch(photoData);
              const blob = await res.blob();
              const result = await base44.integrations.Core.UploadFile({ file: blob });
              if (result?.file_url) uploadedPhotos.push(result.file_url);
            } else {
              uploadedPhotos.push(photoData);
            }
          } catch (err) {
            console.error('Photo upload error:', err);
          }
        }
      }
      await base44.entities.ClayShooting.update(activeSession.id, {
       ...checkoutData,
       rounds_fired: checkoutData.rounds_fired ? parseInt(checkoutData.rounds_fired) : 0,
       photos: uploadedPhotos,
       active_checkin: false,
       gps_track: gpsTrack,
      });
      setActiveSession(null);
      setShowCheckout(false);
      setCheckoutData({
       checkout_time: new Date().toTimeString().slice(0, 5),
       shotgun_id: '',
       rounds_fired: '',
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
      {nearbyClub && (
        <CheckinBanner
          location={nearbyClub.name}
          distance={nearbyClub.distance}
          onDismiss={() => setNearbyClub(null)}
          onCheckin={() => setShowCheckin(true)}
        />
      )}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Clay Shooting</h1>
          <p className="text-muted-foreground">Record your shotgun clay shooting sessions</p>
        </div>

        {activeSession ? (
          <div className="bg-accent border border-border rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Active Session
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Check-in: {activeSession.checkin_time}
                </p>
              </div>
              <button
                onClick={() => setShowCheckout(true)}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                Check Out
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCheckin(true)}
            disabled={!!activeSession}
            className="w-full md:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2 mb-6"
          >
            <Plus className="w-5 h-5" />
            Start New Session
          </button>
        )}

        {showCheckin && (
          <CheckinModal
            data={checkinData}
            clubs={clubs}
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
            shotguns={shotguns}
            onSubmit={handleCheckout}
            onChange={(field, value) =>
              setCheckoutData({ ...checkoutData, [field]: value })
            }
            onClose={() => setShowCheckout(false)}
            gpsTrack={gpsTrack}
          />
        )}
      </main>
    </div>
  );
}

function CheckinModal({ data, clubs, onSubmit, onChange, onClose }) {
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
            <label className="block text-sm font-medium mb-1">Club</label>
            <select
              value={data.club_id}
              onChange={(e) => onChange('club_id', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            >
              <option value="">Select a club</option>
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Check-in Time</label>
            <input
              type="time"
              value={data.checkin_time}
              onChange={(e) => onChange('checkin_time', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              value={data.notes}
              onChange={(e) => onChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              rows="3"
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
  
  const uploadedPhotos = [];
  for (const file of files) {
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      uploadedPhotos.push(response.file_url);
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
  }
  
  if (uploadedPhotos.length > 0) {
    onChange('photos', [...(data.photos || []), ...uploadedPhotos]);
  }
}

function CheckoutModal({ data, shotguns, onSubmit, onChange, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-card rounded-lg max-w-md w-full p-6 my-8">
        <h2 className="text-xl font-bold mb-4">Check Out</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Check-out Time</label>
            <input
              type="time"
              value={data.checkout_time}
              onChange={(e) => onChange('checkout_time', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Shotgun Used</label>
            <select
              value={data.shotgun_id}
              onChange={(e) => onChange('shotgun_id', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="">Select a shotgun</option>
              {shotguns.map((shotgun) => (
                <option key={shotgun.id} value={shotgun.id}>
                  {shotgun.name}
                </option>
              ))}
            </select>
          </div>
          <div>
           <label className="block text-sm font-medium mb-1">Rounds Fired</label>
           <input
             type="number"
             min="0"
             value={data.rounds_fired}
             onChange={(e) => onChange('rounds_fired', e.target.value)}
             className="w-full px-3 py-2 border border-border rounded-lg bg-background"
           />
          </div>
          <div>
           <label className="block text-sm font-medium mb-1">Ammunition Used</label>
           <input
             type="text"
             placeholder="e.g. Federal 12 Gauge"
             value={data.ammunition_used}
             onChange={(e) => onChange('ammunition_used', e.target.value)}
             className="w-full px-3 py-2 border border-border rounded-lg bg-background"
           />
          </div>
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
              <label className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center cursor-pointer font-medium transition-colors text-sm">
                📁 Choose Photo
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoUpload(e.target.files, data, onChange)}
                  className="hidden"
                />
              </label>
              <label className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center cursor-pointer font-medium transition-colors text-sm">
                📷 Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={(e) => handlePhotoUpload(e.target.files, data, onChange)}
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