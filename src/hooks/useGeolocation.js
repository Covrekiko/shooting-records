import { useState, useEffect } from 'react';

export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionAsked, setPermissionAsked] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      setLoading(false);
      return;
    }

    // Check permission status once and respect user decision
    if (navigator.permissions && navigator.permissions.query && !permissionAsked) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setPermissionAsked(true);
        if (result.state === 'denied') {
          setError('Geolocation permission denied in settings');
          setLoading(false);
          return;
        }
        // If granted or prompt, proceed with watch
        startWatching();
      }).catch(() => {
        // Fallback: try watching directly
        startWatching();
      });
    } else if (!permissionAsked) {
      startWatching();
    }

    function startWatching() {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          setError(null);
          setLoading(false);
        },
        (err) => {
          // Only set error if permission is explicitly denied
          if (err.code === 1) { // PERMISSION_DENIED
            setError('Geolocation permission denied');
          } else {
            setError(null); // Ignore temporary location errors
          }
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 5000,
        }
      );

      return watchId;
    }
  }, [permissionAsked]);

  return { location, loading, error };
}

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}