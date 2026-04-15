import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { trackingService } from '@/lib/trackingService';

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
      
      if (outings.length > 0) {
        const outing = outings[0];
        // Check for orphaned outings (>1 hour old)
        const createdDate = new Date(outing.created_date);
        const outingAgeMinutes = (Date.now() - createdDate.getTime()) / 60000;
        
        if (outingAgeMinutes > 60) {
          console.warn('⚠️ Orphaned outing detected (age:', outingAgeMinutes, 'minutes) - closing automatically');
          // Mark outing and linked session as completed
          await base44.entities.DeerOuting.update(outing.id, {
            active: false,
            end_time: new Date().toISOString(),
          });
          // Close linked session record
          const sessions = await base44.entities.SessionRecord.filter({
            created_by: currentUser.email,
            outing_id: outing.id,
          });
          if (sessions.length > 0) {
            await base44.entities.SessionRecord.update(sessions[0].id, {
              status: 'completed',
              notes: (sessions[0].notes || '') + '\n[Auto-closed: outing orphaned after app restart]'
            });
          }
          setActiveOuting(null);
        } else {
          // Fresh outing - resume tracking if not already running
          setActiveOuting(outing);
          if (navigator.geolocation && !trackingService.isTracking()) {
            console.log('🟢 Resuming GPS tracking for active outing after app restart - ID:', outing.id);
            trackingService.startTracking(outing.id, 'deer');
          }
        }
      } else {
        setActiveOuting(null);
      }
    } catch (error) {
      console.error('Error loading active outing:', error);
    } finally {
      setLoading(false);
    }
  };

  const startOuting = async (data) => {
     try {
       console.log('🟢 CHECK IN SAVE STARTED - OutingContext, areaId:', data.location_id, 'placeName:', data.place_name);

       // Construct proper ISO date-time from date and time inputs
       const [year, month, day] = (data.date || '').split('-');
       const [hours, minutes] = (data.start_time || '').split(':');
       const isoDateTime = new Date(year, parseInt(month) - 1, day, hours, minutes).toISOString();

       // Create DeerOuting (map system) - primary record with area_id link
       const outing = await base44.entities.DeerOuting.create({
         location_name: data.place_name || '',
         area_id: data.location_id || '',
         start_time: isoDateTime,
         gps_track: [],
         active: true,
       });

       console.log('🟢 CHECK IN SAVE SUCCESS - DeerOuting created with ID:', outing.id, 'areaId:', outing.area_id, 'start_time:', isoDateTime);

       // Create SessionRecord for deer management - mirror with location_id AND explicit outing_id link
       if (data.place_name && data.date && data.start_time && data.location_id) {
         const sr = await base44.entities.SessionRecord.create({
           category: 'deer_management',
           date: data.date,
           location_id: data.location_id,
           location_name: data.place_name,
           start_time: data.start_time,
           status: 'active',
           notes: '',
           photos: [],
           gps_track: [],
           checkin_time: data.start_time,
           outing_id: outing.id,
         });
         console.log('🟢 SessionRecord created with ID:', sr.id, 'location_id:', sr.location_id, 'outing_id:', outing.id);
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

        // CRITICAL: Stop tracking AFTER collecting points but BEFORE saving, to prevent data loss on failure
        // GPS points are already in finalTrack passed to this function

        // Update DeerOuting - try up to 2 times on failure
        let outingUpdateSuccess = false;
        let outingUpdateError = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const updateOutingPayload = {
              end_time: new Date().toISOString(),
              active: false,
              gps_track: gpsTrack || [],
            };
            await base44.entities.DeerOuting.update(outingId, updateOutingPayload);
            console.log('🟢 DeerOuting updated and closed - ID:', outingId, 'GPS points saved:', gpsTrack?.length || 0);
            outingUpdateSuccess = true;
            break;
          } catch (err) {
            outingUpdateError = err;
            if (attempt === 1) {
              console.warn('⚠️ DeerOuting update failed (attempt 1), retrying...');
              await new Promise(r => setTimeout(r, 500));
            }
          }
        }

        if (!outingUpdateSuccess) {
          throw new Error('Failed to update DeerOuting after 2 attempts: ' + outingUpdateError?.message);
        }

        // Update SessionRecord with checkout data - find by explicit outing_id link
        const sessionRecords = await base44.entities.SessionRecord.filter({
          created_by: currentUser.email,
          category: 'deer_management',
          outing_id: outingId,
        });
        console.log('🟢 Found', sessionRecords.length, 'SessionRecord(s) linked to outing:', outingId);

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

          // Retry on SessionRecord update as well
          let srUpdateSuccess = false;
          let srUpdateError = null;
          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              await base44.entities.SessionRecord.update(srId, updateSrPayload);
              console.log('🟢 SessionRecord updated and closed - ID:', srId, 'new status: completed');
              srUpdateSuccess = true;
              break;
            } catch (err) {
              srUpdateError = err;
              if (attempt === 1) {
                console.warn('⚠️ SessionRecord update failed (attempt 1), retrying...');
                await new Promise(r => setTimeout(r, 500));
              }
            }
          }

          if (!srUpdateSuccess) {
            throw new Error('Failed to update SessionRecord after 2 attempts: ' + srUpdateError?.message);
          }
        } else {
          console.warn('⚠️ No SessionRecord found for outing:', outingId);
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