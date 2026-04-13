import { useEffect, useRef, useState } from 'react';

export function useGpsTracking(isTracking) {
  const [track, setTrack] = useState([]);
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!isTracking) return;

    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    const addPosition = (position) => {
      const { latitude, longitude } = position.coords;
      setTrack(prev => [...prev, {
        lat: latitude,
        lng: longitude,
        timestamp: Date.now()
      }]);
    };

    const handleError = (error) => {
      console.error('GPS tracking error:', error?.message || 'Unknown error');
    };

    watchIdRef.current = navigator.geolocation.watchPosition(addPosition, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });
    console.log('✅ WATCH STARTED (useGpsTracking):', watchIdRef.current);

    return () => {
      if (watchIdRef.current) {
        console.log('🛑 WATCH CLEARED (useGpsTracking):', watchIdRef.current);
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isTracking]);

  return track;
}