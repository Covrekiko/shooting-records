import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { trackingService } from '@/lib/trackingService';
import { offlineDB } from '@/lib/offlineDB';

const defaultOutingContext = {
  activeOuting: null,
  loading: false,
  startOuting: async () => null,
  endOuting: async () => null,
  endOutingWithData: async () => null,
  updateGpsTrack: async () => null,
  reload: async () => null,
};

const OutingContext = createContext(defaultOutingContext);

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
        // Try offline fallback
        const cached = await offlineDB.getById('meta', 'active_outing').catch(() => null);
        if (cached?.value) setActiveOuting(cached.value);
        setLoading(false);
        return;
      }
      
      const currentUser = await base44.auth.me();
      const outings = await base44.entities.DeerOuting.filter({
        created_by: currentUser.email,
        active: true,
      }).catch(async () => {
        // Offline: check local cache
        const cached = await offlineDB.getById('meta', 'active_outing').catch(() => null);
        return cached?.value ? [cached.value] : [];
      });
      
      if (outings.length > 0) {
        const outing = outings[0];
        // Check for orphaned outings (>1 hour old)
        const createdDate = new Date(outing.created_date);
        const outingAgeMinutes = (Date.now() - createdDate.getTime()) / 60000;
        
        if (outingAgeMinutes > 24 * 60) {
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
          // Persist active outing locally for offline restore
          offlineDB.put('meta', { id: 'active_outing', value: outing }).catch(() => {});

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

       // Support both: full ISO start_time (from auto-checkin) or separate date+time strings (from manual check-in form)
       let isoDateTime;
       if (data.start_time && data.start_time.includes('T')) {
         // Already a full ISO datetime (e.g. from auto-checkin)
         isoDateTime = data.start_time;
       } else {
         const [year, month, day] = (data.date || new Date().toISOString().split('T')[0]).split('-');
         const [hours, minutes] = (data.start_time || '00:00').split(':');
         isoDateTime = new Date(year, parseInt(month) - 1, day, hours, minutes).toISOString();
       }

       // Extract plain date and time strings for SessionRecord
       const isoDate = isoDateTime.split('T')[0];
       const isoTime = isoDateTime.split('T')[1]?.slice(0, 5) || '00:00';

       // Create DeerOuting (map system) - primary record with area_id link
       const outing = await base44.entities.DeerOuting.create({
         location_name: data.place_name || data.location_name || '',
         area_id: data.location_id || data.area_id || '',
         start_time: isoDateTime,
         gps_track: [],
         active: true,
       });

       console.log('🟢 CHECK IN SAVE SUCCESS - DeerOuting created with ID:', outing.id, 'areaId:', outing.area_id, 'start_time:', isoDateTime);

       // Create SessionRecord for deer management - mirror with location_id AND explicit outing_id link
       // Support both manual (place_name/location_id) and auto-checkin (location_name/area_id) field names
       const srLocationId = data.location_id || data.area_id;
       const srLocationName = data.place_name || data.location_name;
       if (srLocationName && srLocationId) {
         const sr = await base44.entities.SessionRecord.create({
           category: 'deer_management',
           date: isoDate,
           location_id: srLocationId,
           location_name: srLocationName,
           start_time: isoTime,
           status: 'active',
           notes: '',
           photos: [],
           gps_track: [],
           checkin_time: isoTime,
           outing_id: outing.id,
         });
         console.log('🟢 SessionRecord created with ID:', sr.id, 'location_id:', sr.location_id, 'outing_id:', outing.id);
       }

       setActiveOuting(outing);
       // Persist locally for offline restore
       offlineDB.put('meta', { id: 'active_outing', value: outing }).catch(() => {});

       // Start GPS tracking for this outing
       if (navigator.geolocation) {
         trackingService.startTracking(outing.id, 'deer');
       }

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
      offlineDB.remove('meta', 'active_outing').catch(() => {});
    } catch (error) {
      console.error('Error ending outing:', error);
      throw error;
    }
  };

  const endOutingWithData = async (outingId, checkoutData, gpsTrack) => {
      try {
        const currentUser = await base44.auth.me();
        if ((gpsTrack?.length || 0) === 0) {
          console.warn('No GPS points were recorded for this deer outing. Checkout will continue without a route.');
        }

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

          const roundsFired = checkoutData.shot_anything
            ? (parseInt(checkoutData.rounds_fired) > 0 ? parseInt(checkoutData.rounds_fired) : parseInt(checkoutData.total_count || 0))
            : 0;

          const updateSrPayload = {
            status: 'completed',
            checkout_time: endTimeStr,
            end_time: endTimeStr,
            gps_track: gpsTrack || [],
            notes: checkoutData.notes || '',
            photos: checkoutData.photos || [],
            species_list: checkoutData.shot_anything ? (checkoutData.species_list || []) : [],
            total_count: checkoutData.shot_anything ? (checkoutData.total_count || '0') : '0',
            rounds_fired: roundsFired,
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
          console.warn('⚠️ No SessionRecord found for outing:', outingId, 'creating completed record');
          const endTimeStr = new Date().toTimeString().slice(0, 5);
          const outingStart = activeOuting?.start_time ? new Date(activeOuting.start_time) : new Date();
          const startTimeStr = Number.isNaN(outingStart.getTime()) ? endTimeStr : outingStart.toTimeString().slice(0, 5);
          const dateStr = Number.isNaN(outingStart.getTime()) ? new Date().toISOString().split('T')[0] : outingStart.toISOString().split('T')[0];
          const roundsFired = checkoutData.shot_anything
            ? (parseInt(checkoutData.rounds_fired) > 0 ? parseInt(checkoutData.rounds_fired) : parseInt(checkoutData.total_count || 0))
            : 0;

          await base44.entities.SessionRecord.create({
            category: 'deer_management',
            title: activeOuting?.location_name || checkoutData.place_name || 'Deer Management Outing',
            date: dateStr,
            status: 'completed',
            outing_id: outingId,
            location_id: activeOuting?.area_id || activeOuting?.location_id || checkoutData.location_id || '',
            location_name: activeOuting?.location_name || checkoutData.place_name || '',
            checkin_time: startTimeStr,
            checkout_time: endTimeStr,
            start_time: startTimeStr,
            end_time: endTimeStr,
            gps_track: gpsTrack || [],
            notes: checkoutData.notes || '',
            photos: checkoutData.photos || [],
            species_list: checkoutData.shot_anything ? (checkoutData.species_list || []) : [],
            total_count: checkoutData.shot_anything ? (checkoutData.total_count || '0') : '0',
            rounds_fired: roundsFired,
            number_shot: checkoutData.shot_anything ? parseInt(checkoutData.total_count || 0) : 0,
            rifle_id: checkoutData.shot_anything ? (checkoutData.rifle_id || null) : null,
            ammunition_used: checkoutData.shot_anything ? (checkoutData.ammunition_used || null) : null,
            ammunition_id: checkoutData.shot_anything ? (checkoutData.ammunition_id || null) : null,
          });
        }

        setActiveOuting(null);
        // Clear local cache of active outing
        offlineDB.remove('meta', 'active_outing').catch(() => {});

        // Stop GPS tracking after successful checkout
        trackingService.stopTracking();
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
  return useContext(OutingContext) || defaultOutingContext;
}