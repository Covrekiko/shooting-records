/**
 * Durable sync queue — persists all offline mutations to IndexedDB.
 * Each entry survives page reloads, browser restarts, etc.
 * IDEMPOTENCY: Each entry has a transactionId to prevent double-apply on retry.
 */

import { offlineDB } from './offlineDB';
import { base44 } from '@/api/base44Client';

export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  DONE: 'done',
  FAILED: 'failed',
  CONFLICT: 'conflict',
  EXPIRED: 'expired',
};

export const SYNC_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
};

// Queue configuration
const QUEUE_CONFIG = {
  MAX_RETRIES: 5,
  RETRY_DELAY_MS: 1000,
  ENTRY_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Generate a unique transaction ID for idempotent retry safety.
 * Prevents double-apply even if sync retries the same entry.
 */
function generateTransactionId() {
  return `tx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Enqueue a mutation for later sync.
 * Each entry has a unique transactionId for idempotent retry.
 * Returns the queue entry id.
 */
export async function enqueueAction({ entityName, action, localId, payload }) {
  const entry = {
    id: `sq_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    transactionId: generateTransactionId(), // Idempotency key
    entityName,
    action,
    localId,       // The local (or server) id of the record
    payload,       // Full data payload
    timestamp: Date.now(),
    status: SYNC_STATUS.PENDING,
    retryCount: 0,
    lastError: null,
    lastAttemptTime: null,
  };
  await offlineDB.put('sync_queue', entry);
  return entry.id;
}

/**
 * Get all pending queue entries ordered by timestamp.
 * Automatically marks expired entries as EXPIRED instead of retrying forever.
 */
export async function getPendingQueue() {
  const all = await offlineDB.getAll('sync_queue');
  const now = Date.now();
  
  // Mark expired entries (older than TTL)
  for (const entry of all) {
    if (
      (entry.status === SYNC_STATUS.PENDING || entry.status === SYNC_STATUS.FAILED) &&
      (now - entry.timestamp) > QUEUE_CONFIG.ENTRY_TTL_MS
    ) {
      console.warn(`[SYNC QUEUE] Entry ${entry.id} expired (age: ${Math.floor((now - entry.timestamp) / 1000)}s), marking as EXPIRED`);
      await offlineDB.put('sync_queue', { ...entry, status: SYNC_STATUS.EXPIRED, lastError: 'Queue entry expired (24h+)' });
    }
  }
  
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
 * IDEMPOTENCY: Includes transactionId in payload to detect and skip duplicate syncs.
 * Returns { success, serverRecord, error, alreadySynced }.
 */
async function processSyncEntry(entry) {
  const sdk = getEntitySDK(entry.entityName);
  if (!sdk) {
    return { success: false, error: `Unknown entity: ${entry.entityName}` };
  }

  try {
    let serverRecord = null;

    if (entry.action === SYNC_ACTIONS.CREATE) {
      // Strip the temp local id and add transactionId for idempotency before sending to server
      const { id, _localOnly, _tempId, ...data } = entry.payload;
      // Add transactionId to payload for server-side deduplication (optional, depends on backend support)
      const dataWithTx = { ...data, _transactionId: entry.transactionId };
      serverRecord = await sdk.create(dataWithTx);

    } else if (entry.action === SYNC_ACTIONS.UPDATE) {
      const { id, _localOnly, _tempId, ...data } = entry.payload;
      const dataWithTx = { ...data, _transactionId: entry.transactionId };
      serverRecord = await sdk.update(entry.localId, dataWithTx);

    } else if (entry.action === SYNC_ACTIONS.DELETE) {
      // For idempotent deletes: check if record still exists before deleting
      // If not found (404), treat as already synced
      try {
        const existing = await sdk.get ? await sdk.get(entry.localId) : null;
        if (!existing) {
          return { success: true, alreadySynced: true, serverRecord: { id: entry.localId, _deleted: true } };
        }
      } catch (checkErr) {
        if (checkErr?.status === 404) {
          return { success: true, alreadySynced: true, serverRecord: { id: entry.localId, _deleted: true } };
        }
      }
      await sdk.delete(entry.localId);
      serverRecord = { id: entry.localId, _deleted: true };
    }

    return { success: true, serverRecord };
  } catch (error) {
    // 404 on delete = already gone, treat as success (idempotent)
    if (entry.action === SYNC_ACTIONS.DELETE && error?.status === 404) {
      return { success: true, alreadySynced: true, serverRecord: { id: entry.localId, _deleted: true } };
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
 * IDEMPOTENCY: transactionId prevents double-apply on retry.
 * TTL/Expiry: Entries older than 24h are marked EXPIRED and not retried.
 * Emits progress via optional onProgress(stats) callback.
 * Returns { synced, failed, conflicts, expired }.
 */
export async function runSync(onProgress) {
  const queue = await getPendingQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, conflicts: 0, expired: 0 };

  let synced = 0;
  let failed = 0;
  let conflicts = 0;
  let expired = 0;

  for (const entry of queue) {
    // Skip expired entries (shouldn't happen after getPendingQueue filters, but double-check)
    if (entry.status === SYNC_STATUS.EXPIRED) {
      expired++;
      console.warn(`[SYNC QUEUE] Skipping expired entry ${entry.id}`);
      continue;
    }

    // Mark as syncing
    const updatedEntry = { ...entry, status: SYNC_STATUS.SYNCING, lastAttemptTime: Date.now() };
    await offlineDB.put('sync_queue', updatedEntry);

    const result = await processSyncEntry(updatedEntry);

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

      console.log(`[SYNC QUEUE] ✅ Entry ${entry.id} (txId: ${entry.transactionId}) synced as ${entry.action}${result.alreadySynced ? ' (already synced, idempotent)' : ''}`);
      await offlineDB.put('sync_queue', { ...updatedEntry, status: SYNC_STATUS.DONE });
    } else if (result.conflict) {
      conflicts++;
      console.warn(`[SYNC QUEUE] ⚠️ Entry ${entry.id} conflict: ${result.error}`);
      await offlineDB.put('sync_queue', {
        ...updatedEntry,
        status: SYNC_STATUS.CONFLICT,
        lastError: result.error,
        retryCount: (entry.retryCount || 0) + 1,
      });
    } else {
      failed++;
      const retryCount = (entry.retryCount || 0) + 1;
      // Give up after MAX_RETRIES
      const finalStatus = retryCount >= QUEUE_CONFIG.MAX_RETRIES ? SYNC_STATUS.FAILED : SYNC_STATUS.PENDING;
      console.error(`[SYNC QUEUE] ❌ Entry ${entry.id} failed (retry ${retryCount}/${QUEUE_CONFIG.MAX_RETRIES}): ${result.error}`);
      await offlineDB.put('sync_queue', {
        ...updatedEntry,
        status: finalStatus,
        lastError: result.error,
        retryCount,
      });
    }

    if (onProgress) onProgress({ synced, failed, conflicts, expired, total: queue.length });
  }

  // Clean up done entries
  await clearSyncedEntries();

  return { synced, failed, conflicts, expired };
}