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

        const [clubsList, shotgunsList, ammoList, activeSession] = await Promise.all([
          base44.entities.Club.filter({ created_by: currentUser.email }),
          base44.entities.Shotgun.filter({ created_by: currentUser.email }),
          base44.entities.Ammunition.filter({ created_by: currentUser.email }),
          base44.entities.SessionRecord.filter({
            created_by: currentUser.email,
            category: 'clay_shooting',
            status: 'active',
          }),
        ]);

        setClubs(clubsList);
        setShotguns(shotgunsList);
        setAmmunition(ammoList);
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
     console.log('🟢 CHECK IN CLICKED - ClayShooting');
     console.log('🟢 CHECK IN SAVE STARTED - club:', checkinData.club_id, 'date:', checkinData.date);
     try {
       // Find club name for location_name field
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
       console.log('🟢 CHECK IN SAVE SUCCESS - session id:', session.id, 'club:', selectedClub?.name);
       setActiveSession(session);
       trackingService.startTracking(session.id, 'clay');

       setShowCheckin(false);
       setCheckinData({
         date: new Date().toISOString().split('T')[0],
         club_id: '',
         checkin_time: new Date().toTimeString().slice(0, 5),
         notes: '',
       });
     } catch (error) {
       console.error('🟢 CHECK IN SAVE FAILED:', error.message);
       alert('Check-in failed: ' + error.message);
     }
   };

  const handleCheckout = async (formData) => {
     console.log('🔴 CHECK OUT CLICKED - ClayShooting, sessionId:', activeSession?.id);
     if (!activeSession) {
       alert('No active session to check out from');
       return;
     }
     try {
       // Photos are already uploaded as URLs by the modal's handlePhotoUpload
       const photoUrls = (formData.photos || []).filter(p => typeof p === 'string' && !p.startsWith('data:'));

       // Decrement ammo stock
       if (formData.ammunition_id && formData.rounds_fired) {
         await decrementAmmoStock(formData.ammunition_id, parseInt(formData.rounds_fired));
       }
       const finalTrack = trackingService.stopTracking();
       const endTimeStr = new Date().toTimeString().slice(0, 5);

       const updatePayload = {
        status: 'completed',
        checkout_time: formData.checkout_time || endTimeStr,
        end_time: endTimeStr,
        shotgun_id: formData.shotgun_id,
        rounds_fired: formData.rounds_fired ? parseInt(formData.rounds_fired) : 0,
        ammunition_id: formData.ammunition_id,
        ammunition_used: formData.ammunition_used,
        notes: formData.notes,
        photos: photoUrls,
        active_checkin: false,
        gps_track: finalTrack,
       };

       await base44.entities.SessionRecord.update(activeSession.id, updatePayload);
       console.log('🔴 CHECK OUT SAVE SUCCESS - Record updated:', activeSession.id);

       setActiveSession(null);
       setGpsTrack([]);
       setShowCheckout(false);
       setViewingTrack(null);
     } catch (error) {
       console.error('🔴 CHECK OUT SAVE FAILED:', error.message, error.status, error.response?.data);
       alert('Checkout failed: ' + error.message);
     }
   };

   // Subscribe to live GPS updates
    useEffect(() => {
      console.log('🔵 ClayShooting: Subscribed to trackingService');
      const unsubscribe = trackingService.subscribe((track) => {
        console.log('🔵 ClayShooting: trackingService listener fired with', track.length, 'points');
        setGpsTrack(track);
      });
      return () => {
        console.log('🔵 ClayShooting: Unsubscribed from trackingService');
        unsubscribe();
      };
    }, []);

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
      <main className="max-w-4xl mx-auto px-4 pt-4 md:pt-16 py-8 mobile-page-padding">
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
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2 mb-6"
          >
            <Plus className="w-5 h-5" />
            Start New Session
          </button>
        )}

        {/* Records List */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-4">Session Records</h2>
          <RecordsSection 
            category="clay_shooting"
            title="Session Records"
            emptyMessage="No clay shooting sessions recorded yet"
          />
        </div>

        {viewingTrack && createPortal(
          <GpsPathViewer track={viewingTrack} onClose={() => setViewingTrack(null)} />,
          document.body
        )}
        </main>
      {createPortal(
        <>
          {(showCheckin || showCheckout) && <div className="fixed inset-0 z-[50000] bg-black/50" />}
          {showCheckin && (
            <div className="fixed inset-0 z-[50001] flex flex-col justify-end">
              <CheckinModal
                data={checkinData}
                clubs={clubs}
                onSubmit={handleCheckin}
                onChange={(field, value) => setCheckinData({ ...checkinData, [field]: value })}
                onClose={() => setShowCheckin(false)}
              />
            </div>
          )}
          {showCheckout && activeSession && (
            <div className="fixed inset-0 z-[50001] flex flex-col justify-end sm:justify-center sm:items-center p-4 sm:p-0">
              <CheckoutModal
                shotguns={shotguns}
                ammunition={ammunition}
                onSubmit={handleCheckout}
                onClose={() => setShowCheckout(false)}
                gpsTrack={gpsTrack}
                onViewTrack={setViewingTrack}
              />
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}

function CheckinModal({ data, clubs, onSubmit, onChange, onClose }) {
  const [showAlert, setShowAlert] = useState(false);

  const handleClose = () => {
    const missingFields = [];
    if (!data.date) missingFields.push('Date');
    if (!data.club_id) missingFields.push('Club');
    if (!data.checkin_time) missingFields.push('Check-in Time');

    if (missingFields.length > 0) {
      setShowAlert(true);
    } else {
      onClose();
    }
  };

  return (
      <>
        <div className="bg-card w-full sm:max-w-md sm:rounded-lg rounded-t-2xl p-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4 sm:hidden" />
          <h2 className="text-xl font-bold mb-4">Check In</h2>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" value={data.date} onChange={(e) => onChange('date', e.target.value)} className="w-full px-3 py-3 border border-border rounded-lg bg-background text-base" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Club</label>
              <BottomSheetSelect
                value={data.club_id}
                onChange={(val) => onChange('club_id', val)}
                placeholder="Select a club"
                options={clubs.map(c => ({ value: c.id, label: c.name }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Check-in Time</label>
              <input type="time" value={data.checkin_time} onChange={(e) => onChange('checkin_time', e.target.value)} className="w-full px-3 py-3 border border-border rounded-lg bg-background text-base" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes (optional)</label>
              <textarea value={data.notes} onChange={(e) => onChange('notes', e.target.value)} className="w-full px-3 py-3 border border-border rounded-lg bg-background text-base" rows="3" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:opacity-90">Check In</button>
              <button type="button" onClick={handleClose} className="flex-1 px-4 py-3 border border-border rounded-xl text-base hover:bg-secondary">Cancel</button>
            </div>
          </form>
        </div>
        {showAlert && createPortal(
          <div className="fixed inset-0 z-[50000] bg-black/50" />,
          document.body
        )}
        {showAlert && createPortal(
          <MissingFieldsAlert
            fields={['Date', 'Club', 'Check-in Time']}
            onClose={() => setShowAlert(false)}
          />,
          document.body
        )}
      </>
  );
}

async function handlePhotoUpload(files, data, onChange) {
  if (!files || files.length === 0) return;
  
  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  
  const uploadedPhotos = [];
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

function CheckoutModal({ shotguns, ammunition, onSubmit, onClose, gpsTrack, onViewTrack }) {
   const [data, setData] = useState({
     checkout_time: new Date().toTimeString().slice(0, 5),
     shotgun_id: '',
     rounds_fired: '',
     ammunition_id: '',
     ammunition_used: '',
     notes: '',
     photos: [],
   });
   const [showAlert, setShowAlert] = useState(false);

   const onChange = (field, value) => setData(prev => ({ ...prev, [field]: value }));

   const handleCheckoutClick = () => {
     if (!data.shotgun_id || !data.rounds_fired) {
       setShowAlert(true);
       return;
     }
     onSubmit(data);
   };

   const handleClose = () => {
     onClose();
   };

   return (
       <>
       <div className="bg-card w-full sm:max-w-sm sm:rounded-lg rounded-t-2xl flex flex-col" style={{ maxHeight: 'min(90vh, 100vh - 100px)' }}>
           {/* Header */}
           <div className="flex-shrink-0 p-4 sm:p-5 border-b border-border">
             <h2 className="text-lg sm:text-xl font-bold">Check Out</h2>
           </div>

           {/* Scrollable Content */}
           <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
             <div className="p-4 sm:p-5 space-y-3.5">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5">Check-out Time</label>
              <input
                type="time"
                value={data.checkout_time}
                onChange={(e) => onChange('checkout_time', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5">Shotgun</label>
              <BottomSheetSelect
                value={data.shotgun_id}
                onChange={(val) => onChange('shotgun_id', val)}
                placeholder="Select a shotgun"
                options={shotguns.map(s => ({ value: s.id, label: s.name }))}
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5">Rounds Fired</label>
              <input
                type="number"
                min="0"
                value={data.rounds_fired}
                onChange={(e) => onChange('rounds_fired', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                required
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5">Ammunition</label>
              <BottomSheetSelect
                value={data.ammunition_id || ''}
                onChange={(val) => {
                  const selectedAmmo = ammunition.find(a => a.id === val);
                  onChange('ammunition_id', val);
                  if (selectedAmmo) {
                    onChange('ammunition_used', `${selectedAmmo.brand} ${selectedAmmo.caliber || ''} ${selectedAmmo.bullet_type || ''}`.trim());
                  }
                }}
                placeholder="Select saved ammunition"
                options={ammunition.map(a => ({ value: a.id, label: `${a.brand}${a.caliber ? ` (${a.caliber})` : ''}${a.bullet_type ? ` - ${a.bullet_type}` : ''}` }))}
              />
              {!data.ammunition_id && (
                <div className="mt-1.5">
                  <span className="text-xs text-muted-foreground">Or enter manually:</span>
                  <input
                    type="text"
                    placeholder="e.g. Federal 12 Gauge"
                    value={data.ammunition_used}
                    onChange={(e) => onChange('ammunition_used', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background mt-1"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5">Notes</label>
              <textarea
                value={data.notes}
                onChange={(e) => onChange('notes', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                rows="2"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1.5">Photos</label>
              <div className="flex gap-2 mb-2">
                <label className="flex-1 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center cursor-pointer font-medium transition-colors text-xs">
                  📁 Choose
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handlePhotoUpload(e.target.files, data, onChange)}
                    className="hidden"
                  />
                </label>
                <label className="flex-1 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center cursor-pointer font-medium transition-colors text-xs">
                  📷 Capture
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
                      <img src={photo} alt="preview" className="h-16 w-16 object-cover rounded" />
                      <button
                        type="button"
                        onClick={() => onChange('photos', data.photos.filter((_, i) => i !== idx))}
                        className="absolute top-0 right-0 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {gpsTrack && gpsTrack.length > 0 && (
              <button
                type="button"
                onClick={() => onViewTrack(gpsTrack)}
                className="w-full px-3 py-2 bg-secondary hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Map className="w-4 h-4" />
                View GPS Track
              </button>
            )}
            </div>
            </div>

          {/* Action Buttons */}
          <div className="flex-shrink-0 flex gap-2 p-4 sm:p-5 border-t border-border bg-card" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <button
              type="button"
              onClick={handleCheckoutClick}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium text-sm transition-all active:scale-95"
            >
              Check Out
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary text-sm font-medium transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
          </div>

          {showAlert && createPortal(
            <div className="fixed inset-0 z-[50000] bg-black/50" />,
            document.body
          )}
          {showAlert && createPortal(
            <MissingFieldsAlert
              fields={['Shotgun', 'Rounds Fired']}
              onClose={() => setShowAlert(false)}
            />,
            document.body
          )}
       </>
  );
}