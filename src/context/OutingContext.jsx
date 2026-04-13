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
      // Create DeerOuting (map system)
      const outing = await base44.entities.DeerOuting.create({
        location_name: data.place_name || data.location_name,
        start_time: new Date((data.date || data.start_time) + 'T' + (data.start_time || '').slice(0, 5)).toISOString(),
        gps_track: [],
        active: true,
      });
      
      // Create DeerManagement session (deer management system)
      if (data.place_name && data.date && data.start_time) {
        await base44.entities.DeerManagement.create({
          date: data.date,
          location_id: data.location_id || '',
          place_name: data.place_name,
          start_time: data.start_time,
          active_checkin: true,
        });
      }
      
      setActiveOuting(outing);
      return outing;
    } catch (error) {
      console.error('Error starting outing:', error);
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

  const updateGpsTrack = async (outingId, track) => {
    try {
      await base44.entities.DeerOuting.update(outingId, {
        gps_track: track,
      });
    } catch (error) {
      console.error('Error updating GPS track:', error);
    }
  };

  return (
    <OutingContext.Provider
      value={{
        activeOuting,
        loading,
        startOuting,
        endOuting,
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