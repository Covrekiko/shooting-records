/**
 * useAutoCheckin
 * Monitors user location against saved clubs/areas.
 * If user stays inside a location for DWELL_MS (10 min), triggers onAutoCheckin.
 *
 * Props:
 *   enabled      – boolean (from user setting)
 *   clubs        – array of Club entities with a `location` "lat,lng" string
 *   areas        – array of Area entities with polygon_coordinates [[lat,lng],...]
 *   hasActiveSession – boolean, prevents duplicate check-in
 *   onAutoCheckin(match) – called with { type:'club'|'area', id, name, lat, lng }
 */

import { useEffect, useRef, useCallback } from 'react';

const DWELL_MS = 10 * 60 * 1000; // 10 minutes
const POLL_INTERVAL_MS = 30 * 1000; // poll every 30s
const CLUB_RADIUS_KM = 0.3; // 300m radius for clubs

// Haversine distance in km
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Point-in-polygon (ray casting) for area boundaries
function pointInPolygon(lat, lng, polygon) {
  // polygon: array of [lat, lng]
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect =
      yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function useAutoCheckin({ enabled, clubs = [], areas = [], hasActiveSession, onAutoCheckin }) {
  // dwellStart[locationKey] = timestamp when user first entered
  const dwellRef = useRef({});
  const firedRef = useRef(new Set()); // locations already triggered this session
  const watchIdRef = useRef(null);
  const pollRef = useRef(null);
  const lastPositionRef = useRef(null);

  const checkLocation = useCallback(
    (lat, lng) => {
      if (hasActiveSession) return;

      const now = Date.now();
      const matched = new Set();

      // Check clubs
      clubs.forEach((club) => {
        const m = club.location?.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (!m) return;
        const clat = parseFloat(m[1]);
        const clng = parseFloat(m[2]);
        const dist = haversine(lat, lng, clat, clng);
        if (dist <= CLUB_RADIUS_KM) {
          matched.add(`club_${club.id}`);
        }
      });

      // Check areas
      areas.forEach((area) => {
        const poly = area.polygon_coordinates; // [[lat,lng],...]
        if (!poly || poly.length < 3) return;
        if (pointInPolygon(lat, lng, poly)) {
          matched.add(`area_${area.id}`);
        }
      });

      // Update dwell timers
      matched.forEach((key) => {
        if (!dwellRef.current[key]) {
          dwellRef.current[key] = now;
        }
        const dwell = now - dwellRef.current[key];
        if (dwell >= DWELL_MS && !firedRef.current.has(key)) {
          firedRef.current.add(key);
          // Build match info
          if (key.startsWith('club_')) {
            const id = key.replace('club_', '');
            const club = clubs.find((c) => c.id === id);
            if (club) onAutoCheckin({ type: 'club', id: club.id, name: club.name, clubType: club.type });
          } else {
            const id = key.replace('area_', '');
            const area = areas.find((a) => a.id === id);
            if (area) onAutoCheckin({ type: 'area', id: area.id, name: area.name });
          }
        }
      });

      // Remove dwell for locations user left
      Object.keys(dwellRef.current).forEach((key) => {
        if (!matched.has(key)) {
          delete dwellRef.current[key];
          firedRef.current.delete(key);
        }
      });
    },
    [clubs, areas, hasActiveSession, onAutoCheckin]
  );

  useEffect(() => {
    if (!enabled) {
      // Clear everything
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      clearInterval(pollRef.current);
      dwellRef.current = {};
      firedRef.current.clear();
      return;
    }

    if (!navigator.geolocation) return;

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastPositionRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        checkLocation(pos.coords.latitude, pos.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 60000 }
    );

    // Also poll every 30s in case watchPosition stalls
    pollRef.current = setInterval(() => {
      if (lastPositionRef.current) {
        checkLocation(lastPositionRef.current.lat, lastPositionRef.current.lng);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      clearInterval(pollRef.current);
    };
  }, [enabled, checkLocation]);

  // Reset fired set when active session ends
  useEffect(() => {
    if (!hasActiveSession) {
      firedRef.current.clear();
      dwellRef.current = {};
    }
  }, [hasActiveSession]);
}