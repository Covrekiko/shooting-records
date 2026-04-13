import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import CheckinBanner from '@/components/CheckinBanner';
import { useGeolocation, calculateDistance } from '@/hooks/useGeolocation';
import GpsPathViewer from '@/components/GpsPathViewer';
import { Clock, CheckCircle, Plus } from 'lucide-react';
import { decrementAmmoStock } from '@/lib/ammoUtils';
import { sessionManager } from '@/lib/sessionManager';
import { trackingService } from '@/lib/trackingService';

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

  const [checkoutData, setCheckoutData] = useState({
    checkout_time: new Date().toTimeString().slice(0, 5),
    rifles_used: [
      {
        rifle_id: '',
        rounds_fired: '',
        meters_range: '',
        ammunition_brand: '',
        caliber: '',
        bullet_type: '',
        grain: '',
      }
    ],
    notes: '',
    photos: [],
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
          base44.entities.TargetShooting.filter({
            created_by: currentUser.email,
            active_checkin: true,
          }),
        ]);

        setClubs(clubsList);
        setRifles(riflesList);
        setAmmunition(ammoList);
        if (activeSession.length > 0) {
          const session = activeSession[0];
          setActiveSession(session);
          // Initialize GPS track from existing session
          setGpsTrack(session.gps_track || []);
          console.log('✅ TargetShooting: Loaded active session with', session.gps_track?.length || 0, 'GPS points');
        }
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
     const unsubscribe = trackingService.subscribe(setGpsTrack);
     return unsubscribe;
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
     console.log('🟢 CHECK IN TRIGGERED - TargetShooting');
     try {
       const session = await base44.entities.TargetShooting.create({
         ...checkinData,
         active_checkin: true,
       });
       setActiveSession(session);
       console.log('🟢 TRACKING STARTED for TargetShooting session:', session.id);
       trackingService.startTracking(session.id, 'target');
       setGpsTrack([]);

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
   console.log('🔴 CHECK OUT TRIGGERED - TargetShooting');
   // Validate at least one rifle with required fields
   const hasValidRifle = checkoutData.rifles_used.some(r => r.rifle_id && r.rounds_fired && r.meters_range);
   if (!hasValidRifle) {
     alert('Please add at least one rifle with rounds and distance');
     return;
   }
   try {
     // Decrement ammo stock for each rifle used
     const uniqueAmmoIds = new Set();
     for (const rifle of checkoutData.rifles_used) {
       if (rifle.ammunition_id && rifle.rounds_fired && !uniqueAmmoIds.has(rifle.ammunition_id)) {
         await decrementAmmoStock(rifle.ammunition_id, parseInt(rifle.rounds_fired));
         uniqueAmmoIds.add(rifle.ammunition_id);
       }
     }
     // Extract photo URLs from photo objects
     const photoUrls = checkoutData.photos.map(photo => typeof photo === 'string' ? photo : photo.url);
     const finalTrack = trackingService.stopTracking();
     console.log('🔴 TRACKING STOPPED - saved', finalTrack.length, 'GPS points');

     await base44.entities.TargetShooting.update(activeSession.id, {
       ...checkoutData,
       photos: photoUrls,
       active_checkin: false,
       gps_track: finalTrack,
     });
      setActiveSession(null);
      setGpsTrack([]);
      setShowCheckout(false);
      setCheckoutData({
        checkout_time: new Date().toTimeString().slice(0, 5),
        rifles_used: [
          {
            rifle_id: '',
            rounds_fired: '',
            meters_range: '',
            ammunition_brand: '',
            caliber: '',
            bullet_type: '',
            grain: '',
          }
        ],
        notes: '',
        photos: [],
      });
      setViewingTrack(null);
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
          <h1 className="text-4xl font-bold mb-2">Target Shooting</h1>
          <p className="text-muted-foreground">Record your rifle shooting sessions</p>
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

        {/* Check-in Modal */}
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

        {/* GPS Track Viewer */}
        {viewingTrack && (
          <GpsPathViewer track={viewingTrack} onClose={() => setViewingTrack(null)} />
        )}

        {showCheckout && activeSession && (
          <CheckoutModal
            data={checkoutData}
            setData={setCheckoutData}
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
  
  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  try {
    const newPhotos = [...(data.photos || [])];
    for (const file of files) {
      // Validate file
      if (file.size > maxFileSize) {
        console.error(`File ${file.name} exceeds 5MB limit`);
        continue;
      }
      if (!validTypes.includes(file.type)) {
        console.error(`File ${file.name} is not a valid image type`);
        continue;
      }
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // Analyze target photo for accuracy
      let photoData = { url: file_url };
      try {
        const result = await base44.functions.invoke('analyzeTargetPhoto', { photo_url: file_url });
        if (result?.data?.analysis) {
          photoData.analysis = result.data.analysis;
        }
      } catch (analysisError) {
        console.warn('Photo analysis skipped:', analysisError.message);
      }
      newPhotos.push(photoData);
    }
    onChange('photos', newPhotos);
  } catch (error) {
    console.error('Photo upload error:', error);
  }
}

function CheckoutModal({ data, setData, rifles, ammunition, onSubmit, onClose }) {
  const [errors, setErrors] = useState({});

  const validateAndSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    data.rifles_used.forEach((rifle, idx) => {
      const missing = [];
      if (!rifle.rifle_id) missing.push('Rifle');
      if (!rifle.rounds_fired) missing.push('Rounds fired');
      if (!rifle.meters_range) missing.push('Meters range');
      if (!rifle.ammunition_brand && !rifle.caliber && !rifle.bullet_type && !rifle.grain) missing.push('Ammunition details');
      if (missing.length > 0) {
        newErrors[`rifle_${idx}`] = `Required: ${missing.join(', ')}`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit(e);
  };

  const updateRifleEntry = (index, field, value) => {
    const updated = [...data.rifles_used];
    updated[index] = { ...updated[index], [field]: value };
    setData({ ...data, rifles_used: updated });
  };

  const addRifleEntry = () => {
    setData({
      ...data,
      rifles_used: [...data.rifles_used, { rifle_id: '', rounds_fired: '', meters_range: '', ammunition_brand: '', bullet_type: '', grain: '' }]
    });
  };

  const removeRifleEntry = (index) => {
    setData({
      ...data,
      rifles_used: data.rifles_used.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-card rounded-lg max-w-md w-full p-6 mt-4">
        <h2 className="text-xl font-bold mb-4">Check Out</h2>
        <form onSubmit={validateAndSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Check-out Time</label>
            <input
              type="time"
              value={data.checkout_time}
              onChange={(e) => setData({ ...data, checkout_time: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-bold">Firearms Used</label>
              <button
                type="button"
                onClick={addRifleEntry}
                className="text-xs bg-secondary hover:bg-primary hover:text-primary-foreground px-2 py-1 rounded"
              >
                + Add Rifle
              </button>
            </div>

            {data.rifles_used.map((rifle, index) => (
              <div key={index} className="bg-secondary/30 p-3 rounded-lg mb-3 space-y-2">
                {errors[`rifle_${index}`] && (
                  <p className="text-red-600 text-xs font-medium">{errors[`rifle_${index}`]}</p>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Rifle {index + 1}</span>
                  {data.rifles_used.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRifleEntry(index)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <select
                  value={rifle.rifle_id}
                  onChange={(e) => updateRifleEntry(index, 'rifle_id', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-background"
                >
                  <option value="">Select rifle</option>
                  {rifles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Rounds fired"
                  value={rifle.rounds_fired}
                  onChange={(e) => updateRifleEntry(index, 'rounds_fired', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-background"
                />
                <input
                  type="number"
                  placeholder="Meters range"
                  value={rifle.meters_range}
                  onChange={(e) => updateRifleEntry(index, 'meters_range', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-background"
                />
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Ammunition</label>
                  <select
                    value={rifle.ammunition_id || ''}
                    onChange={(e) => {
                      const selectedAmmo = ammunition.find(a => a.id === e.target.value);
                      const updated = [...data.rifles_used];
                      updated[index] = {
                        ...updated[index],
                        ammunition_id: e.target.value,
                        ammunition_brand: selectedAmmo?.brand || '',
                        caliber: selectedAmmo?.caliber || '',
                        bullet_type: selectedAmmo?.bullet_type || '',
                        grain: selectedAmmo?.grain || ''
                      };
                      setData({ ...data, rifles_used: updated });
                    }}
                    className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-background mb-2"
                  >
                    <option value="">Select saved ammunition</option>
                    {ammunition.length > 0 ? ammunition.map((ammo) => (
                      <option key={ammo.id} value={ammo.id}>
                        {ammo.brand} {ammo.caliber ? `(${ammo.caliber})` : ''} {ammo.bullet_type ? `- ${ammo.bullet_type}` : ''}
                      </option>
                    )) : <option disabled>No ammunition available</option>}
                  </select>
                  <span className="text-xs text-muted-foreground">Or enter manually:</span>
                </div>
                <input
                  type="text"
                  placeholder="Ammunition brand"
                  value={rifle.ammunition_brand || ''}
                  onChange={(e) => updateRifleEntry(index, 'ammunition_brand', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-background"
                />
                <input
                  type="text"
                  placeholder="Caliber"
                  value={rifle.caliber || ''}
                  onChange={(e) => updateRifleEntry(index, 'caliber', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-background"
                />
                <input
                  type="text"
                  placeholder="Bullet type"
                  value={rifle.bullet_type || ''}
                  onChange={(e) => updateRifleEntry(index, 'bullet_type', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-background"
                />
                <input
                  type="text"
                  placeholder="Grain"
                  value={rifle.grain || ''}
                  onChange={(e) => updateRifleEntry(index, 'grain', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-background"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={data.notes}
              onChange={(e) => setData({ ...data, notes: e.target.value })}
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
                  onChange={(e) => handlePhotoUpload(e.target.files, data, (field, value) => setData({ ...data, [field]: value }))}
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
                  onChange={(e) => handlePhotoUpload(e.target.files, data, (field, value) => setData({ ...data, [field]: value }))}
                  className="hidden"
                />
              </label>
            </div>
            {data.photos && data.photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.photos.map((photo, idx) => {
                  const photoUrl = typeof photo === 'string' ? photo : photo.url;
                  const analysis = typeof photo === 'object' ? photo.analysis : null;
                  return (
                    <div key={idx} className="relative group">
                      <div className="relative">
                        <img src={photoUrl} alt="preview" className="h-20 w-20 object-cover rounded" />
                        {analysis && (
                          <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground text-xs px-1 rounded-tl">\n                            {analysis.accuracy_percentage}%
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setData({ ...data, photos: data.photos.filter((_, i) => i !== idx) })}
                        className="absolute top-0 right-0 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
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