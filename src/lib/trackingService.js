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
  // Validate session health (check if tracking was lost due to app crash/close)
  async validateSessionHealth(sessionId) {
    try {
      // Fetch session from DB to check its state
      const sessions = await base44.entities.SessionRecord.filter({ id: sessionId });
      if (sessions.length === 0) {
        console.warn('⚠️ Session not found:', sessionId);
        return null;
      }
      
      const session = sessions[0];
      const createdDate = new Date(session.created_date);
      const sessionAgeMinutes = (Date.now() - createdDate.getTime()) / 60000;
      
      // If session is >1 hour old and still active, mark as abandoned
      if (session.status === 'active' && sessionAgeMinutes > 60) {
        console.warn('⚠️ Orphaned session detected - age:', sessionAgeMinutes, 'minutes');
        return { ...session, orphaned: true };
      }
      
      return { ...session, orphaned: false };
    } catch (error) {
      console.error('❌ Error validating session health:', error);
      return null;
    }
  },

  // Start GPS tracking for a session
  startTracking(sessionId, sessionType) {
    // Prevent duplicate tracking sessions
    if (trackingState.isTracking && trackingState.sessionId === sessionId) {
      console.warn('⚠️ Tracking already active for this session, ignoring duplicate start request');
      return;
    }
    
    if (trackingState.isTracking && trackingState.sessionId !== sessionId) {
      console.warn('⚠️ Tracking already active for different session (ID:', trackingState.sessionId, '), stopping previous...');
      this.stopTracking();
    }

    trackingState.isTracking = true;
    trackingState.sessionId = sessionId;
    trackingState.sessionType = sessionType;
    trackingState.track = [];

    if (!navigator.geolocation) {
      console.error('❌ GEOLOCATION NOT SUPPORTED');
      trackingState.isTracking = false;
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
      
      // Notify all listeners with fresh copy
      const trackSnapshot = [...trackingState.track];
      trackingListeners.forEach(listener => listener(trackSnapshot));
    };

    let permissionDenied = false;

    const handlePositionError = (error) => {
       if (error?.code === 1) {
         console.warn('Geolocation permission denied. User must allow geolocation access.');
         permissionDenied = true;
         // Stop tracking on permission denial
         trackingState.isTracking = false;
         trackingListeners.forEach(listener => listener([]));
       } else if (error?.code === 2) {
         console.warn('GPS position unavailable. Check GPS/network.');
       }
     };

    try {
      const watchId = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        handlePositionError,
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }  // 30s timeout for mobile
      );
      
      trackingState.watchId = watchId;
    } catch (err) {
      console.error('❌ EXCEPTION in watchPosition:', err);
      trackingState.isTracking = false;
    }
  },

  // Stop GPS tracking and return the track
  stopTracking() {
    // Save track before clearing
    const finalTrack = [...trackingState.track];
    
    // Clear watch
    if (trackingState.watchId !== null) {
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

  // Get current state (for debugging/testing)
  getState() {
    return { ...trackingState };
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