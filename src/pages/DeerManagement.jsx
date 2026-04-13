import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import CheckinBanner from '@/components/CheckinBanner';
import { useGeolocation, calculateDistance } from '@/hooks/useGeolocation';
import { useGpsTracking } from '@/hooks/useGpsTracking';
import LocationMap from '@/components/LocationMap';
import BoundaryMapViewer from '@/components/BoundaryMapViewer';
import GpsPathViewer from '@/components/GpsPathViewer';
import { useOuting } from '@/context/OutingContext';
import { Plus, Clock, Map } from 'lucide-react';
import { decrementAmmoStock } from '@/lib/ammoUtils';
import { sessionManager } from '@/lib/sessionManager';

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];

export default function DeerManagement() {
  const { activeOuting, loading: outingLoading, startOuting, endOuting } = useOuting();
  const [activeSession, setActiveSession] = useState(null);
   const [locations, setLocations] = useState([]);
   const [rifles, setRifles] = useState([]);
   const [ammunition, setAmmunition] = useState([]);
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
     species_list: [
       { species: '', count: '' }
     ],
     rifle_id: '',
     ammunition_used: '',
     notes: '',
     photos: [],
   });

  useEffect(() => {
    sessionManager.clearExpiredSessions();
    async function loadData() {
      try {
        const currentUser = await base44.auth.me();

        const [locationsList, riflesList, ammoList, activeSession] = await Promise.all([
          base44.entities.DeerLocation.filter({ created_by: currentUser.email }),
          base44.entities.Rifle.filter({ created_by: currentUser.email }),
          base44.entities.Ammunition.filter({ created_by: currentUser.email }),
          base44.entities.DeerManagement.filter({
            created_by: currentUser.email,
            active_checkin: true,
          }),
        ]);

        setLocations(locationsList);
        setRifles(riflesList);
        setAmmunition(ammoList);
        
        // Use global outing context to determine active session
        if (activeOuting) {
          setActiveSession(null);
        } else if (activeSession.length > 0) {
          setActiveSession(activeSession[0]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeOuting]);

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
      // Use global startOuting which creates both records
      await startOuting(checkinData);
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
  if (checkoutData.shot_anything && checkoutData.species_list?.length) {
    const totalCount = checkoutData.species_list.reduce((sum, s) => sum + (parseInt(s.count) || 0), 0);
    if (!checkoutData.total_count || parseInt(checkoutData.total_count) !== totalCount) {
      alert(`Total shots (${checkoutData.total_count}) must match sum of species (${totalCount})`);
      return;
    }
  }
  try {
    const uploadedPhotos = [];
    if (checkoutData.photos && checkoutData.photos.length > 0) {
      for (const photoData of checkoutData.photos) {
        try {
          if (photoData.startsWith('data:')) {
            const res = await fetch(photoData);
            const blob = await res.blob();
            const result = await base44.integrations.Core.UploadFile({ file: blob });
            if (result?.file_url) {
              uploadedPhotos.push(result.file_url);
            }
          } else {
            uploadedPhotos.push(photoData);
          }
        } catch (photoError) {
          console.error('Error uploading photo:', photoError);
        }
      }
    }
    // Decrement ammo stock
    if (checkoutData.ammunition_id && checkoutData.total_count) {
      await decrementAmmoStock(checkoutData.ammunition_id, parseInt(checkoutData.total_count));
    }
    const submitData = { ...checkoutData, photos: uploadedPhotos, active_checkin: false, gps_track: gpsTrack };
     if (!checkoutData.shot_anything) {
       submitData.species_list = [];
       submitData.total_count = null;
       submitData.rifle_id = null;
       submitData.ammunition_used = null;
     }
     await base44.entities.DeerManagement.update(activeSession.id, submitData);
     
     // End outing on map if there's an active one
     if (activeOuting) {
       await endOuting(activeOuting.id);
     }
     
     setActiveSession(null);
     setShowCheckout(false);
     setCheckoutData({
        end_time: new Date().toTimeString().slice(0, 5),
        shot_anything: false,
        species_list: [
          { species: '', count: '' }
        ],
        rifle_id: '',
        ammunition_used: '',
        notes: '',
        photos: [],
      });
     setViewingTrack(null);
   } catch (error) {
     console.error('Error checking out:', error);
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
         {!activeSession && !activeOuting && (
           <button
             onClick={() => setShowCheckin(true)}
             className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 whitespace-nowrap mt-2"
           >
             <Plus className="w-5 h-5" />
             Start New Outing
           </button>
         )}
         {activeOuting && !activeSession && (
           <div className="px-6 py-3 bg-primary/20 text-primary rounded-lg font-medium mt-2">
             Active outing on map
           </div>
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

       {/* Modal Overlays */}
       {(showCheckin || showCheckout) && (
         <div className="fixed inset-0 z-[50000] bg-black/50 pointer-events-auto" />
       )}

       {showCheckin && (
         <div className="fixed inset-0 z-[50001] flex items-center justify-center pointer-events-auto">
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
       )}

       {showCheckout && activeSession && (
         <div className="fixed inset-0 z-[50001] flex items-center justify-center pointer-events-auto">
           <CheckoutModal
             data={checkoutData}
             rifles={rifles}
             ammunition={ammunition}
             onSubmit={handleCheckout}
             onChange={(field, value) =>
               setCheckoutData({ ...checkoutData, [field]: value })
             }
             onClose={() => setShowCheckout(false)}
           />
         </div>
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

function CheckoutModal({ data, rifles, ammunition, onSubmit, onChange, onClose }) {
 const addSpecies = () => {
   const speciesList = data.species_list || [{ species: '', count: '' }];
   onChange('species_list', [...speciesList, { species: '', count: '' }]);
 };

 const removeSpecies = (index) => {
   const speciesList = data.species_list || [{ species: '', count: '' }];
   onChange('species_list', speciesList.filter((_, i) => i !== index));
 };

 const updateSpecies = (index, field, value) => {
   const speciesList = data.species_list || [{ species: '', count: '' }];
   const updated = [...speciesList];
   updated[index] = { ...updated[index], [field]: value };
   onChange('species_list', updated);
 };

 return (
   <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[10000] overflow-y-auto">
     <div className="bg-card rounded-lg max-w-md w-full p-6 my-8 relative z-[10001]">
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
               <div className="flex items-center justify-between mb-3">
                 <label className="block text-sm font-bold">Species Harvested</label>
                 <button
                   type="button"
                   onClick={addSpecies}
                   className="text-xs bg-secondary hover:bg-primary hover:text-primary-foreground px-2 py-1 rounded"
                 >
                   + Add Species
                 </button>
               </div>
               {(data.species_list || [{ species: '', count: '' }]).map((entry, idx) => (
                 <div key={idx} className="bg-secondary/30 p-3 rounded-lg mb-3 space-y-2">
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-medium text-muted-foreground">Species {idx + 1}</span>
                     {(data.species_list || []).length > 1 && (
                       <button
                         type="button"
                         onClick={() => removeSpecies(idx)}
                         className="text-xs text-destructive hover:underline"
                       >
                         Remove
                       </button>
                     )}
                   </div>
                   <select
                     value={entry.species}
                     onChange={(e) => updateSpecies(idx, 'species', e.target.value)}
                     className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-background"
                     required
                   >
                     <option value="">Select species</option>
                     <optgroup label="Deer">
                       {DEER_SPECIES.map((species) => (
                         <option key={species} value={species}>
                           {species}
                         </option>
                       ))}
                     </optgroup>
                     <optgroup label="Pest Control">
                       <option value="Fox">Fox</option>
                       <option value="Rabbit">Rabbit</option>
                       <option value="Hare">Hare</option>
                       <option value="Crow">Crow</option>
                       <option value="Magpie">Magpie</option>
                       <option value="Pigeon">Pigeon</option>
                       <option value="Squirrel">Squirrel</option>
                     </optgroup>
                   </select>
                   <input
                     type="number"
                     min="1"
                     placeholder="Count"
                     value={entry.count}
                     onChange={(e) => updateSpecies(idx, 'count', e.target.value)}
                     className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-background"
                     required
                   />
                 </div>
               ))}
               </div>
               <div>
                 <label className="block text-sm font-medium mb-1">Total Shots Fired</label>
                 <input
                   type="number"
                   min="1"
                   placeholder="Total animals shot"
                   value={data.total_count || ''}
                   onChange={(e) => onChange('total_count', e.target.value)}
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
               <label className="block text-sm font-medium mb-1">Ammunition</label>
               <select
                 value={data.ammunition_id || ''}
                 onChange={(e) => {
                   const selectedAmmo = ammunition.find(a => a.id === e.target.value);
                   if (selectedAmmo) {
                     onChange('ammunition_used', `${selectedAmmo.brand} ${selectedAmmo.caliber || ''} ${selectedAmmo.bullet_type || ''} ${selectedAmmo.grain || ''}`.trim());
                   }
                   onChange('ammunition_id', e.target.value);
                 }}
                 className="w-full px-3 py-2 border border-border rounded-lg bg-background mb-2"
               >
                 <option value="">Select saved ammunition</option>
                 {ammunition.length > 0 ? ammunition.map((ammo) => (
                   <option key={ammo.id} value={ammo.id}>
                     {ammo.brand} {ammo.caliber ? `(${ammo.caliber})` : ''} {ammo.bullet_type ? `- ${ammo.bullet_type}` : ''}
                   </option>
                 )) : <option disabled>No ammunition available</option>}
               </select>
               <span className="text-xs text-muted-foreground">Or enter manually:</span>
               <input
                 type="text"
                 placeholder="e.g. Federal 308 Win"
                 value={data.ammunition_used}
                 onChange={(e) => onChange('ammunition_used', e.target.value)}
                 className="w-full px-3 py-2 border border-border rounded-lg bg-background mt-1"
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
                    multiple
                    onChange={(e) => handlePhotoUpload(e.target.files, data, onChange)}
                    className="hidden"
                  />
             </label>
             <label className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center cursor-pointer font-medium transition-colors">
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