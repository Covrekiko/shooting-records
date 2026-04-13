import { base44 } from '@/api/base44Client';

const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
const SESSION_KEY = 'activeShootingSession';

export const sessionManager = {
  // Start a session
  startSession: (sessionData) => {
    const session = {
      ...sessionData,
      startTime: Date.now(),
      id: `session_${Date.now()}`,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  // Get active session
  getActiveSession: () => {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (!session) return null;
    
    const parsed = JSON.parse(session);
    const elapsed = Date.now() - parsed.startTime;
    
    // Session expired
    if (elapsed > SESSION_TIMEOUT) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    
    return parsed;
  },

  // Check if session is about to expire (warn at 30 min remaining)
  isSessionExpiring: () => {
    const session = sessionManager.getActiveSession();
    if (!session) return false;
    
    const elapsed = Date.now() - session.startTime;
    const remaining = SESSION_TIMEOUT - elapsed;
    
    return remaining < 30 * 60 * 1000; // 30 minutes
  },

  // End session
  endSession: () => {
    sessionStorage.removeItem(SESSION_KEY);
  },

  // Clear expired sessions
  clearExpiredSessions: () => {
    const session = sessionManager.getActiveSession();
    if (!session && sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.removeItem(SESSION_KEY);
    }
  },
};