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
      // Create DeerOuting (map system)
      const outing = await base44.entities.DeerOuting.create({
        location_name: data.place_name || data.location_name,
        area_id: data.area_id || '',
        start_time: new Date((data.date || data.start_time) + 'T' + (data.start_time || '').slice(0, 5)).toISOString(),
        gps_track: [],
        active: true,
      });
      
      console.log('🟢 CHECK IN SAVE SUCCESS - DeerOuting created with ID:', outing.id);
      
      // Create DeerManagement session (deer management system)
      if (data.place_name && data.date && data.start_time) {
        await base44.entities.DeerManagement.create({
          date: data.date,
          location_id: data.location_id || '',
          place_name: data.place_name,
          start_time: data.start_time,
          active_checkin: true,
        });
        console.log('🟢 DeerManagement session created');
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
      console.log('🟢 endOutingWithData called - outingId:', outingId, 'gpsTrack:', gpsTrack?.length || 0, 'points');

      // Update DeerOuting
      const updateOutingPayload = {
        end_time: new Date().toISOString(),
        active: false,
        gps_track: gpsTrack || [],
      };
      console.log('🟢 Updating DeerOuting with payload:', JSON.stringify(updateOutingPayload).substring(0, 100));

      await base44.entities.DeerOuting.update(outingId, updateOutingPayload);
      console.log('🟢 DeerOuting updated and closed - ID:', outingId, 'GPS points saved:', gpsTrack?.length || 0);

      // Update DeerManagement with checkout data if it exists
      if (checkoutData) {
        const deerManagements = await base44.entities.DeerManagement.filter({
          created_by: currentUser.email,
          active_checkin: true,
        });
        console.log('🟢 Found', deerManagements.length, 'active DeerManagement sessions for user');

        if (deerManagements.length > 0) {
          const dmId = deerManagements[0].id;
          const updateDmPayload = {
            active_checkin: false,
            end_time: checkoutData.end_time || new Date().toTimeString().slice(0, 5),
            gps_track: gpsTrack || [],
            notes: checkoutData.notes || '',
            photos: checkoutData.photos || [],
            species_list: checkoutData.shot_anything ? (checkoutData.species_list || []) : [],
            total_count: checkoutData.shot_anything ? (checkoutData.total_count || null) : null,
            rifle_id: checkoutData.shot_anything ? (checkoutData.rifle_id || null) : null,
            ammunition_used: checkoutData.shot_anything ? (checkoutData.ammunition_used || null) : null,
          };
          console.log('🟢 Updating DeerManagement ID:', dmId, 'with checkout data - gps:', gpsTrack?.length || 0, 'points');

          await base44.entities.DeerManagement.update(dmId, updateDmPayload);
          console.log('🟢 DeerManagement session updated and closed - ID:', dmId);
        } else {
          console.warn('⚠️ No active DeerManagement session found to update');
        }
      }

      setActiveOuting(null);
    } catch (error) {
      console.error('🔴 Error ending outing with data:', error.message, error.status, error.response?.data);
      throw error;
    }
  };

  const updateGpsTrack = async (outingId, track) => {
    try {
      await base44.entities.DeerOuting.update(outingId, {
        gps_track: track,
      });
      // Update local state so the map renders the updated track
      setActiveOuting(prev => prev ? { ...prev, gps_track: track } : null);
      console.log('✅ GPS track updated and synced to state - points:', track.length);
    } catch (error) {
      console.error('❌ Error updating GPS track:', error);
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