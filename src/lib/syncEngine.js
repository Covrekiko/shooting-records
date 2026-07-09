/**
 * Sync engine — orchestrates sync queue processing when connectivity returns.
 * Singleton that auto-starts when imported.
 */

import { runSync, getPendingCount } from './syncQueue';
import { connectivityManager } from './connectivityManager';
import { offlineDB } from './offlineDB';
import { base44, savedAuthToken } from '@/api/base44Client';
import { clearUserCaches, readCurrentUserCache, writeUserCache } from './authCacheIsolation';

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

  // Ensure the SDK has a token before making API calls
  if (savedAuthToken) base44.auth.setToken(savedAuthToken);

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

// Poll pending count every 30s (reduced for performance)
setInterval(updatePendingCount, 30000);

// Initial count
updatePendingCount().catch(() => {});

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

// Save user profile to local DB for offline access (with localStorage fallback)
export async function cacheUserProfile(user) {
  if (!user) return;
  const cachedAt = Date.now();
  try { writeUserCache(localStorage, user, cachedAt); } catch {}
  try {
    await offlineDB.put('user_profile', { id: 'current_user', ...user, cachedAt });
    if (user.id) await offlineDB.put('user_profile', { id: `user:${user.id}`, ...user, cachedAt });
    if (user.email) await offlineDB.put('user_profile', { id: `email:${String(user.email).toLowerCase()}`, ...user, cachedAt });
  } catch {}
}

export async function getCachedUserProfile() {
  try {
    const cached = readCurrentUserCache(localStorage);
    if (cached) return cached;
  } catch {}
  try {
    const cached = await offlineDB.getById('user_profile', 'current_user');
    if (cached?.id || cached?.email) return cached;
  } catch {}
  return null;
}

export async function clearCachedUserProfiles() {
  try { clearUserCaches(localStorage); } catch {}
  try { await offlineDB.clearStore('user_profile'); } catch {}
}