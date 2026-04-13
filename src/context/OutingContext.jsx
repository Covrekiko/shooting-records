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
      console.log('🟢 startOuting called with data:', data);
      // Create DeerOuting (map system)
      const outing = await base44.entities.DeerOuting.create({
        location_name: data.place_name || data.location_name,
        area_id: data.area_id || '',
        start_time: new Date((data.date || data.start_time) + 'T' + (data.start_time || '').slice(0, 5)).toISOString(),
        gps_track: [],
        active: true,
      });
      
      console.log('🟢 DeerOuting created with ID:', outing.id, 'GPS tracking will start immediately');
      
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
      console.log('🟢 endOutingWithData called - saving GPS track with', gpsTrack?.length || 0, 'points');
      
      // Update DeerOuting
      await base44.entities.DeerOuting.update(outingId, {
        end_time: new Date().toISOString(),
        active: false,
        gps_track: gpsTrack || [],
      });
      console.log('🟢 DeerOuting updated and closed with GPS track saved');

      // Update DeerManagement with checkout data if it exists
      if (checkoutData) {
        const deerManagements = await base44.entities.DeerManagement.filter({
          active_checkin: true,
        });
        if (deerManagements.length > 0) {
          await base44.entities.DeerManagement.update(deerManagements[0].id, {
            ...checkoutData,
            active_checkin: false,
            end_time: checkoutData.end_time || new Date().toTimeString().slice(0, 5),
            gps_track: gpsTrack || [],
          });
          console.log('🟢 DeerManagement session updated and closed');
        }
      }
      
      setActiveOuting(null);
    } catch (error) {
      console.error('🔴 Error ending outing with data:', error);
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