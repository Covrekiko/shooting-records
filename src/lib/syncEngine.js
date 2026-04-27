/**
 * Sync engine — orchestrates sync queue processing when connectivity returns.
 * Singleton that auto-starts when imported.
 */

import { runSync, getPendingCount } from './syncQueue';
import { connectivityManager } from './connectivityManager';
import { offlineDB } from './offlineDB';

export const SYNC_STATE = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  DONE: 'done',
  FAILED: 'failed',
};

const stateListeners = new Set();
const pendingListeners = new Set();

let _syncState = SYNC_STATE.IDLE;
let _pendingCount = 0;
let _lastSyncResult = null;
let _isSyncing = false;

function setSyncState(state, result) {
  _syncState = state;
  if (result) _lastSyncResult = result;
  stateListeners.forEach((cb) => {
    try { cb({ state: _syncState, result: _lastSyncResult, pendingCount: _pendingCount }); } catch {}
  });
}

async function updatePendingCount() {
  _pendingCount = await getPendingCount();
  pendingListeners.forEach((cb) => {
    try { cb(_pendingCount); } catch {}
  });
}

export async function triggerSync() {
  if (_isSyncing) return;
  if (!connectivityManager.isOnline()) return;

  const count = await getPendingCount();
  if (count === 0) {
    setSyncState(SYNC_STATE.IDLE);
    return;
  }

  _isSyncing = true;
  setSyncState(SYNC_STATE.SYNCING);

  try {
    const result = await runSync(async (progress) => {
      await updatePendingCount();
    });

    await updatePendingCount();

    if (result.failed > 0 || result.conflicts > 0) {
      setSyncState(SYNC_STATE.FAILED, result);
    } else {
      setSyncState(SYNC_STATE.DONE, result);
      // Go back to idle after 3s
      setTimeout(() => setSyncState(SYNC_STATE.IDLE), 3000);
    }
  } catch (e) {
    console.error('[sync] Sync engine error:', e);
    setSyncState(SYNC_STATE.FAILED, { error: e?.message });
  } finally {
    _isSyncing = false;
  }
}

// Auto-sync when coming online
connectivityManager.subscribe((online) => {
  if (online) {
    // Small delay to let connection stabilize
    setTimeout(triggerSync, 1500);
  }
});

// Poll pending count every 15s (reduced from 5s for performance)
setInterval(updatePendingCount, 15000);

// Initial count
updatePendingCount();

export const syncEngine = {
  subscribe: (cb) => {
    stateListeners.add(cb);
    // Fire immediately with current state
    cb({ state: _syncState, result: _lastSyncResult, pendingCount: _pendingCount });
    return () => stateListeners.delete(cb);
  },

  subscribeToPending: (cb) => {
    pendingListeners.add(cb);
    cb(_pendingCount);
    return () => pendingListeners.delete(cb);
  },

  triggerSync,

  getSyncState: () => _syncState,
  getPendingCount: () => _pendingCount,
  getLastResult: () => _lastSyncResult,
};

// Save user profile to local DB for offline access
export async function cacheUserProfile(user) {
  if (!user) return;
  await offlineDB.put('user_profile', { id: 'current_user', ...user, cachedAt: Date.now() });
}

export async function getCachedUserProfile() {
  return offlineDB.getById('user_profile', 'current_user');
}