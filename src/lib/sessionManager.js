import { base44 } from '@/api/base44Client';

const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour
const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes

class SessionManager {
  constructor() {
    this.sessionTimeout = null;
    this.refreshTimeout = null;
    this.onSessionExpired = null;
  }

  start(onExpired) {
    this.onSessionExpired = onExpired;
    this.resetTimeout();
    this.startTokenRefresh();
  }

  resetTimeout() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    this.sessionTimeout = setTimeout(async () => {
      // Check if token is still valid
      try {
        await base44.auth.me();
      } catch (err) {
        console.error('Session expired:', err);
        if (this.onSessionExpired) {
          this.onSessionExpired();
        }
      }
    }, SESSION_TIMEOUT);
  }

  startTokenRefresh() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    this.refreshTimeout = setInterval(async () => {
      try {
        // Verify token is still valid
        await base44.auth.me();
      } catch (err) {
        console.error('Token refresh failed:', err);
        if (this.onSessionExpired) {
          this.onSessionExpired();
        }
      }
    }, TOKEN_REFRESH_INTERVAL);
  }

  stop() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    if (this.refreshTimeout) {
      clearInterval(this.refreshTimeout);
    }
  }

  recordActivity() {
    // Reset timeout on user activity
    this.resetTimeout();
  }
}

export const sessionManager = new SessionManager();