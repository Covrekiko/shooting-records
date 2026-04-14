import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const OutingContext = createContext();

export function OutingProvider({ children }) {
  const [activeOuting, setActiveOuting] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load active outing on mount
  useEffect(() => {
    loadActiveOuting();
  }, []);

  const loadActiveOuting = async () => {
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) {
        setActiveOuting(null);
        setLoading(false);
        return;
      }
      
      const currentUser = await base44.auth.me();
      const outings = await base44.entities.DeerOuting.filter({
        created_by: currentUser.email,
        active: true,
      });
      setActiveOuting(outings.length > 0 ? outings[0] : null);
    } catch (error) {
      console.error('Error loading active outing:', error);
    } finally {
      setLoading(false);
    }
  };

  const startOuting = async (data) => {
     try {
       console.log('🟢 CHECK IN SAVE STARTED - OutingContext, data:', data.place_name);

       // Construct proper ISO date-time from date and time inputs
       const [year, month, day] = (data.date || '').split('-');
       const [hours, minutes] = (data.start_time || '').split(':');
       const isoDateTime = new Date(year, parseInt(month) - 1, day, hours, minutes).toISOString();

       // Create DeerOuting (map system)
       const outing = await base44.entities.DeerOuting.create({
         location_name: data.place_name || data.location_name,
         area_id: data.location_id || data.area_id || '',
         start_time: isoDateTime,
         gps_track: [],
         active: true,
       });

       console.log('🟢 CHECK IN SAVE SUCCESS - DeerOuting created with ID:', outing.id, 'start_time:', isoDateTime);

       // Create SessionRecord for deer management - this is the primary record
       if (data.place_name && data.date && data.start_time) {
         const sr = await base44.entities.SessionRecord.create({
           category: 'deer_management',
           date: data.date,
           location_id: data.location_id || '',
           location_name: data.place_name,
           start_time: data.start_time,
           status: 'active',
           notes: '',
           photos: [],
           gps_track: [],
           checkin_time: data.start_time,
         });
         console.log('🟢 SessionRecord created with ID:', sr.id);
       }

       setActiveOuting(outing);
       return outing;
     } catch (error) {
       console.error('🔴 Error starting outing:', error);
       throw error;
     }
   };

  const endOuting = async (outingId) => {
    try {
      await base44.entities.DeerOuting.update(outingId, {
        end_time: new Date().toISOString(),
        active: false,
      });
      setActiveOuting(null);
    } catch (error) {
      console.error('Error ending outing:', error);
      throw error;
    }
  };

  const endOutingWithData = async (outingId, checkoutData, gpsTrack) => {
     try {
       const currentUser = await base44.auth.me();
       console.log('🟢 endOutingWithData called - outingId:', outingId, 'gpsTrack:', gpsTrack?.length || 0, 'points', 'checkoutData:', checkoutData);

       // Update DeerOuting
       const updateOutingPayload = {
         end_time: new Date().toISOString(),
         active: false,
         gps_track: gpsTrack || [],
       };

       await base44.entities.DeerOuting.update(outingId, updateOutingPayload);
       console.log('🟢 DeerOuting updated and closed - ID:', outingId, 'GPS points saved:', gpsTrack?.length || 0);

       // Update SessionRecord with checkout data - find by location_name and active status
       const sessionRecords = await base44.entities.SessionRecord.filter({
         created_by: currentUser.email,
         category: 'deer_management',
         status: 'active',
       });
       console.log('🟢 Found', sessionRecords.length, 'active SessionRecord(s) for deer management');

       if (sessionRecords.length > 0) {
         const srId = sessionRecords[0].id;
         const endTimeStr = new Date().toTimeString().slice(0, 5);

         const updateSrPayload = {
           status: 'completed',
           checkout_time: endTimeStr,
           end_time: endTimeStr,
           gps_track: gpsTrack || [],
           notes: checkoutData.notes || '',
           photos: checkoutData.photos || [],
           species_list: checkoutData.shot_anything ? (checkoutData.species_list || []) : [],
           total_count: checkoutData.shot_anything ? (checkoutData.total_count || '0') : '0',
           number_shot: checkoutData.shot_anything ? parseInt(checkoutData.total_count || 0) : 0,
           rifle_id: checkoutData.shot_anything ? (checkoutData.rifle_id || null) : null,
           ammunition_used: checkoutData.shot_anything ? (checkoutData.ammunition_used || null) : null,
           ammunition_id: checkoutData.shot_anything ? (checkoutData.ammunition_id || null) : null,
         };
         console.log('🟢 Updating SessionRecord ID:', srId, 'with checkout data - gps:', gpsTrack?.length || 0, 'points');

         await base44.entities.SessionRecord.update(srId, updateSrPayload);
         console.log('🟢 SessionRecord updated and closed - ID:', srId, 'new status: completed');
       } else {
         console.warn('⚠️ No active SessionRecord found to update');
       }

       setActiveOuting(null);
     } catch (error) {
       console.error('🔴 Error ending outing with data:', error.message, error.status, error.response?.data);
       throw error;
     }
   };

  const updateGpsTrack = async (outingId, track) => {
    try {
      await base44.entities.DeerOuting.update(outingId, { gps_track: track });
      // Only update local state minimally — avoid triggering full re-renders
      setActiveOuting(prev => prev ? { ...prev, gps_track: track } : null);
    } catch (error) {
      // Silently ignore rate limit errors on GPS sync
      if (error?.status !== 429) {
        console.error('❌ Error updating GPS track:', error);
      }
    }
  };

  return (
    <OutingContext.Provider
      value={{
        activeOuting,
        loading,
        startOuting,
        endOuting,
        endOutingWithData,
        updateGpsTrack,
        reload: loadActiveOuting,
      }}
    >
      {children}
    </OutingContext.Provider>
  );
}

export function useOuting() {
  const context = useContext(OutingContext);
  if (!context) {
    throw new Error('useOuting must be used within OutingProvider');
  }
  return context;
}