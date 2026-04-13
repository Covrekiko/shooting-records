import { base44 } from '@/api/base44Client';

let trackingState = {
  isTracking: false,
  sessionId: null,
  sessionType: null, // 'clay' | 'target' | 'deer'
  track: [],
  watchId: null,
};

const trackingListeners = new Set();

export const trackingService = {
  // Start GPS tracking for a session
  startTracking(sessionId, sessionType) {
    console.log('🟢 TRACKING STARTED - sessionId:', sessionId, 'type:', sessionType);
    console.log('🟢 WATCH ID ASSIGNED:', trackingState.watchId);
    
    if (trackingState.isTracking) {
      console.warn('⚠️ Tracking already active, stopping previous...');
      this.stopTracking();
    }

    trackingState.isTracking = true;
    trackingState.sessionId = sessionId;
    trackingState.sessionType = sessionType;
    trackingState.track = [];

    if (!navigator.geolocation) {
      console.error('❌ GEOLOCATION NOT SUPPORTED');
      return;
    }

    // Create wrapper function to ensure proper context
    const handlePositionUpdate = (position) => {
      if (!trackingState.isTracking) {
        console.warn('⚠️ Tracking is off, ignoring GPS update');
        return;
      }
      
      const { latitude, longitude } = position.coords;
      const timestamp = Date.now();
      const point = { lat: latitude, lng: longitude, timestamp };
      trackingState.track.push(point);
      
      console.log('📍 GPS UPDATE RECEIVED - sessionId:', trackingState.sessionId, 'type:', trackingState.sessionType);
      console.log('   Points:', trackingState.track.length, 'Location:', latitude, longitude);
      
      // Notify all listeners with fresh copy
      const trackSnapshot = [...trackingState.track];
      trackingListeners.forEach(listener => listener(trackSnapshot));
    };

    const handlePositionError = (error) => {
      console.error('❌ GPS ERROR - Code:', error?.code, 'Message:', error?.message || error);
      if (error?.code === 1) {
        console.error('   → Permission denied. User must allow geolocation access.');
      } else if (error?.code === 2) {
        console.error('   → Position unavailable. Check GPS/network.');
      } else if (error?.code === 3) {
        console.error('   → Timeout. GPS signal lost or delayed.');
      }
    };

    trackingState.watchId = navigator.geolocation.watchPosition(
      handlePositionUpdate,
      handlePositionError,
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }  // 30s timeout for mobile
    );
    
    console.log('🟢 WATCH STARTED with ID:', trackingState.watchId);
  },

  // Stop GPS tracking and return the track
  stopTracking() {
    console.log('🔴 TRACKING STOPPED - sessionId:', trackingState.sessionId, 'type:', trackingState.sessionType);
    console.log('🔴 ROUTE SAVED with', trackingState.track.length, 'GPS points');
    
    // Save track before clearing
    const finalTrack = [...trackingState.track];
    
    // Clear watch
    if (trackingState.watchId !== null) {
      console.log('🔴 WATCH CLEARED - ID:', trackingState.watchId);
      navigator.geolocation.clearWatch(trackingState.watchId);
    } else {
      console.warn('⚠️ Watch ID was null, possibly never started');
    }

    // Reset state
    trackingState.isTracking = false;
    trackingState.sessionId = null;
    trackingState.sessionType = null;
    trackingState.track = [];
    trackingState.watchId = null;

    // Notify listeners
    trackingListeners.forEach(listener => listener([]));
    
    console.log('🔴 POINTS SAVED TO DATABASE:', finalTrack.length, 'coordinates');
    return finalTrack;
  },

  // Get current track (live updates)
  getTrack() {
    return [...trackingState.track];
  },

  // Subscribe to track updates
  subscribe(listener) {
    trackingListeners.add(listener);
    return () => trackingListeners.delete(listener);
  },

  // Check if tracking is active
  isTracking() {
    return trackingState.isTracking;
  },

  // Get current session info
  getSessionInfo() {
    return {
      sessionId: trackingState.sessionId,
      sessionType: trackingState.sessionType,
      pointCount: trackingState.track.length,
    };
  },
};