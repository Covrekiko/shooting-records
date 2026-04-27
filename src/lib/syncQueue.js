/**
 * Durable sync queue — persists all offline mutations to IndexedDB.
 * Each entry survives page reloads, browser restarts, etc.
 */

import { offlineDB } from './offlineDB';
import { base44 } from '@/api/base44Client';

export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  DONE: 'done',
  FAILED: 'failed',
  CONFLICT: 'conflict',
};

export const SYNC_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
};

/**
 * Enqueue a mutation for later sync.
 * Returns the queue entry id.
 */
export async function enqueueAction({ entityName, action, localId, payload }) {
  const entry = {
    id: `sq_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    entityName,
    action,
    localId,       // The local (or server) id of the record
    payload,       // Full data payload
    timestamp: Date.now(),
    status: SYNC_STATUS.PENDING,
    retryCount: 0,
    lastError: null,
  };
  await offlineDB.put('sync_queue', entry);
  return entry.id;
}

/**
 * Get all pending queue entries ordered by timestamp.
 */
export async function getPendingQueue() {
  const all = await offlineDB.getAll('sync_queue');
  return all
    .filter((e) => e.status === SYNC_STATUS.PENDING || e.status === SYNC_STATUS.FAILED)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function getAllQueueEntries() {
  const all = await offlineDB.getAll('sync_queue');
  return all.sort((a, b) => a.timestamp - b.timestamp);
}

export async function getPendingCount() {
  const pending = await getPendingQueue();
  return pending.length;
}

/**
 * Clear successfully synced entries.
 */
export async function clearSyncedEntries() {
  const all = await offlineDB.getAll('sync_queue');
  const done = all.filter((e) => e.status === SYNC_STATUS.DONE);
  for (const entry of done) {
    await offlineDB.remove('sync_queue', entry.id);
  }
}

/**
 * The entity SDK map — resolves base44 entity SDK by name.
 */
function getEntitySDK(entityName) {
  return base44.entities[entityName];
}

/**
 * Process a single queue entry against the server.
 * Returns { success, serverRecord, error }.
 */
async function processSyncEntry(entry) {
  const sdk = getEntitySDK(entry.entityName);
  if (!sdk) {
    return { success: false, error: `Unknown entity: ${entry.entityName}` };
  }

  try {
    let serverRecord = null;

    if (entry.action === SYNC_ACTIONS.CREATE) {
      // Strip the temp local id before sending to server
      const { id, _localOnly, _tempId, ...data } = entry.payload;
      serverRecord = await sdk.create(data);

    } else if (entry.action === SYNC_ACTIONS.UPDATE) {
      const { id, _localOnly, _tempId, ...data } = entry.payload;
      serverRecord = await sdk.update(entry.localId, data);

    } else if (entry.action === SYNC_ACTIONS.DELETE) {
      await sdk.delete(entry.localId);
      serverRecord = { id: entry.localId, _deleted: true };
    }

    return { success: true, serverRecord };
  } catch (error) {
    // 404 on delete = already gone, treat as success
    if (entry.action === SYNC_ACTIONS.DELETE && error?.status === 404) {
      return { success: true, serverRecord: { id: entry.localId, _deleted: true } };
    }
    // 409 conflict
    if (error?.status === 409) {
      return { success: false, conflict: true, error: error.message };
    }
    return { success: false, error: error?.message || String(error) };
  }
}

/**
 * Run the full sync queue.
 * Emits progress via optional onProgress(stats) callback.
 * Returns { synced, failed, conflicts }.
 */
export async function runSync(onProgress) {
  const queue = await getPendingQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, conflicts: 0 };

  let synced = 0;
  let failed = 0;
  let conflicts = 0;

  for (const entry of queue) {
    // Mark as syncing
    await offlineDB.put('sync_queue', { ...entry, status: SYNC_STATUS.SYNCING });

    const result = await processSyncEntry(entry);

    if (result.success) {
      synced++;
      // If it was a CREATE, update local store with server id
      if (entry.action === SYNC_ACTIONS.CREATE && result.serverRecord) {
        const { ENTITY_STORE_MAP } = await import('./offlineDB');
            const storeName = ENTITY_STORE_MAP[entry.entityName];
            if (storeName && result.serverRecord) {
              if (entry.localId && entry.localId !== result.serverRecord.id) {
                await offlineDB.remove(storeName, entry.localId);
              }
              await offlineDB.put(storeName, result.serverRecord);
            }
      } else if (entry.action === SYNC_ACTIONS.DELETE && result.serverRecord?._deleted) {
        // Already removed from local store at delete time — nothing extra needed
      }

      await offlineDB.put('sync_queue', { ...entry, status: SYNC_STATUS.DONE });
    } else if (result.conflict) {
      conflicts++;
      await offlineDB.put('sync_queue', {
        ...entry,
        status: SYNC_STATUS.CONFLICT,
        lastError: result.error,
        retryCount: (entry.retryCount || 0) + 1,
      });
    } else {
      failed++;
      const retryCount = (entry.retryCount || 0) + 1;
      // Give up after 5 retries
      const finalStatus = retryCount >= 5 ? SYNC_STATUS.FAILED : SYNC_STATUS.PENDING;
      await offlineDB.put('sync_queue', {
        ...entry,
        status: finalStatus,
        lastError: result.error,
        retryCount,
      });
    }

    if (onProgress) onProgress({ synced, failed, conflicts, total: queue.length });
  }

  // Clean up done entries
  await clearSyncedEntries();

  return { synced, failed, conflicts };
}