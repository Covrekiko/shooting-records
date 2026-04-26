/**
 * Connectivity manager — single source of truth for online/offline status.
 * Fires callbacks when status changes.
 */

const listeners = new Set();
let _isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

function notify(online) {
  _isOnline = online;
  listeners.forEach((cb) => {
    try { cb(online); } catch (e) {}
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => notify(true));
  window.addEventListener('offline', () => notify(false));
}

// Also poll with a real HTTP check every 30s to catch captive portals / broken connections
async function pingCheck() {
  if (typeof fetch === 'undefined') return;
  try {
    // Ping our own manifest (always exists, tiny, no redirect)
    await fetch(`/manifest.json?_=${Date.now()}`, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!_isOnline) notify(true);
  } catch {
    // Only mark offline if browser also says offline — avoids false positives from CORS/CSP
    if (_isOnline && !navigator.onLine) notify(false);
  }
}

// Poll every 30 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(pingCheck, 30000);
}

export const connectivityManager = {
  isOnline: () => _isOnline,

  subscribe: (cb) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  // Force a connectivity check right now
  check: pingCheck,
};