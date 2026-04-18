/**
 * Connectivity manager — single source of truth for online/offline status.
 * Fires callbacks when status changes.
 */

const listeners = new Set();
let _isOnline = navigator.onLine;

function notify(online) {
  _isOnline = online;
  listeners.forEach((cb) => {
    try { cb(online); } catch (e) {}
  });
}

window.addEventListener('online', () => notify(true));
window.addEventListener('offline', () => notify(false));

// Also poll with a real HTTP check every 30s to catch captive portals / broken connections
async function pingCheck() {
  try {
    // Use a tiny cachebust to avoid cache
    await fetch(`/favicon.ico?_=${Date.now()}`, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!_isOnline) notify(true);
  } catch {
    if (_isOnline) notify(false);
  }
}

// Poll every 30 seconds
setInterval(pingCheck, 30000);

export const connectivityManager = {
  isOnline: () => _isOnline,

  subscribe: (cb) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  // Force a connectivity check right now
  check: pingCheck,
};