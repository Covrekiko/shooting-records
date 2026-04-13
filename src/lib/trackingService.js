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
    
    if (trackingState.isTracking) {
      console.warn('⚠️ Tracking already active, stopping previous...');
      this.stopTracking();
    }

    trackingState.isTracking = true;
    trackingState.sessionId = sessionId;
    trackingState.sessionType = sessionType;
    trackingState.track = [];

    if (!navigator.geolocation) {
      console.error('❌ Geolocation not supported');
      return;
    }

    trackingState.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const timestamp = Date.now();
        const point = { lat: latitude, lng: longitude, timestamp };
        trackingState.track.push(point);
        
        console.log('📍 GPS UPDATE RECEIVED -', trackingState.track.length, 'total points');
        console.log('   Location:', latitude, longitude);
        
        // Notify all listeners
        trackingListeners.forEach(listener => listener(trackingState.track));
      },
      (error) => {
        console.error('❌ GPS ERROR:', error?.message || error);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  },

  // Stop GPS tracking and return the track
  stopTracking() {
    console.log('🔴 TRACKING STOPPED - saved', trackingState.track.length, 'points');
    
    if (trackingState.watchId !== null) {
      navigator.geolocation.clearWatch(trackingState.watchId);
    }

    const finalTrack = [...trackingState.track];
    
    trackingState.isTracking = false;
    trackingState.sessionId = null;
    trackingState.sessionType = null;
    trackingState.track = [];
    trackingState.watchId = null;

    trackingListeners.forEach(listener => listener([]));
    
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