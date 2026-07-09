/**
 * Offline-aware entity repository.
 * 
 * Usage (mirrors the base44 SDK):
 *   import { getRepository } from '@/lib/offlineEntityRepository';
 *   const repo = getRepository('SessionRecord');
 *   const records = await repo.list();          // local cache or server
 *   const record  = await repo.create(data);   // immediate local + queues sync
 *   await repo.update(id, data);               // immediate local + queues sync
 *   await repo.delete(id);                     // immediate local + queues sync
 *   await repo.refresh();                      // force fetch from server and cache
 */

import { base44, savedAuthToken } from '@/api/base44Client';
import { offlineDB, ENTITY_STORE_MAP } from './offlineDB';
import { enqueueAction, removeQueuedMutationsForLocalRecord, SYNC_ACTIONS } from './syncQueue';
import { connectivityManager } from './connectivityManager';
import { collectOfflinePhotoRefs, discardOfflinePhotoRefs } from './offlinePhotoStore';
import { getCurrentCachePointer } from './authCacheIsolation';

function generateTempId() {
  return `_local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getStoreName(entityName) {
  return ENTITY_STORE_MAP[entityName] || null;
}

function getCacheOwnerKey() {
  if (typeof window === 'undefined') return '';
  return getCurrentCachePointer(window.localStorage)?.key || '';
}

function tagForCurrentOwner(record) {
  const ownerKey = getCacheOwnerKey();
  return ownerKey ? { ...record, _cacheOwnerKey: ownerKey } : record;
}

function belongsToCurrentOwner(record) {
  const ownerKey = getCacheOwnerKey();
  if (!ownerKey || !record?._cacheOwnerKey) return true;
  return record._cacheOwnerKey === ownerKey;
}

function filterForCurrentOwner(records = []) {
  return records.filter(belongsToCurrentOwner);
}

class EntityRepository {
  constructor(entityName) {
    this.entityName = entityName;
    this.storeName = getStoreName(entityName);
    this._sdk = base44.entities[entityName];
  }

  _ensureToken() {
    if (savedAuthToken) base44.auth.setToken(savedAuthToken);
  }

  /**
   * List all records.
   * - Online: fetch from server, cache locally, return server data.
   * - Offline: return from local cache.
   */
  async list(sortField, limit) {
    if (connectivityManager.isOnline() && this.storeName) {
      this._ensureToken();
      try {
        const records = await this._sdk.list(sortField, limit);
        await offlineDB.putMany(this.storeName, records.map(tagForCurrentOwner));
        await offlineDB.setMeta(`${this.entityName}_lastFetch`, Date.now());
        return records;
      } catch (e) {
        // Fall through to local cache
        console.warn(`[offline] list(${this.entityName}) server failed, using cache`, e?.message);
      }
    }
    return this.storeName ? filterForCurrentOwner(await offlineDB.getAll(this.storeName)) : [];
  }

  /**
   * Filter records by criteria.
   * - Online: fetch from server, merge into cache, return server data.
   * - Offline: filter local cache by criteria (simple equality matching).
   */
  async filter(criteria, sortField, limit) {
    if (connectivityManager.isOnline() && this.storeName) {
      this._ensureToken();
      try {
        const records = await this._sdk.filter(criteria, sortField, limit);
        await offlineDB.putMany(this.storeName, records.map(tagForCurrentOwner));
        return records;
      } catch (e) {
        console.warn(`[offline] filter(${this.entityName}) server failed, using cache`, e?.message);
      }
    }
    // Local filter
    if (!this.storeName) return [];
    const all = filterForCurrentOwner(await offlineDB.getAll(this.storeName));
    return all.filter((record) => {
      return Object.entries(criteria || {}).every(([key, val]) => record[key] === val);
    });
  }

  /**
   * Get a single record by id.
   */
  async get(id) {
    if (connectivityManager.isOnline()) {
      this._ensureToken();
      try {
        const record = await this._sdk.get(id);
        if (this.storeName) await offlineDB.put(this.storeName, tagForCurrentOwner(record));
        return record;
      } catch (e) {
        console.warn(`[offline] get(${this.entityName}, ${id}) server failed, using cache`);
      }
    }
    const localRecord = this.storeName ? await offlineDB.getById(this.storeName, id) : null;
    return belongsToCurrentOwner(localRecord) ? localRecord : null;
  }

  /**
   * Create a record.
   * - Always writes to local cache immediately.
   * - If online: sends to server and updates local cache with server record.
   * - If offline: queues sync action with a temp local id.
   */
  async create(data) {
    const tempId = generateTempId();
    const localRecord = {
      ...data,
      id: tempId,
      _localOnly: true,
      _tempId: tempId,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      ...(getCacheOwnerKey() ? { _cacheOwnerKey: getCacheOwnerKey() } : {}),
    };

    // Write locally first (optimistic)
    if (this.storeName) await offlineDB.put(this.storeName, localRecord);

    if (connectivityManager.isOnline()) {
      this._ensureToken();
      try {
        const serverRecord = await this._sdk.create(data);
        // Replace temp local record with real server record
        if (this.storeName) {
          await offlineDB.remove(this.storeName, tempId);
          await offlineDB.put(this.storeName, tagForCurrentOwner(serverRecord));
        }
        return serverRecord;
      } catch (e) {
        console.warn(`[offline] create(${this.entityName}) server failed, queuing`);
        // Queue for sync even though we tried online
        await enqueueAction({
          entityName: this.entityName,
          action: SYNC_ACTIONS.CREATE,
          localId: tempId,
          payload: localRecord,
        });
        return localRecord;
      }
    } else {
      // Queue for later sync
      await enqueueAction({
        entityName: this.entityName,
        action: SYNC_ACTIONS.CREATE,
        localId: tempId,
        payload: localRecord,
      });
      return localRecord;
    }
  }

  /**
   * Update a record.
   * - Always updates local cache immediately (optimistic).
   * - If online: sends to server and updates local cache.
   * - If offline: queues sync action.
   */
  async update(id, data) {
    // Get current local record to merge
    const existing = this.storeName ? await offlineDB.getById(this.storeName, id) : null;
    const mergedRecord = {
      ...(existing || {}),
      ...data,
      id,
      updated_date: new Date().toISOString(),
      ...(getCacheOwnerKey() ? { _cacheOwnerKey: getCacheOwnerKey() } : {}),
    };

    if (this.storeName) await offlineDB.put(this.storeName, mergedRecord);

    if (connectivityManager.isOnline()) {
      this._ensureToken();
      try {
        const serverRecord = await this._sdk.update(id, data);
        if (this.storeName) await offlineDB.put(this.storeName, tagForCurrentOwner(serverRecord));
        return serverRecord;
      } catch (e) {
        console.warn(`[offline] update(${this.entityName}, ${id}) server failed, queuing`);
        await enqueueAction({
          entityName: this.entityName,
          action: SYNC_ACTIONS.UPDATE,
          localId: id,
          payload: mergedRecord,
        });
        return mergedRecord;
      }
    } else {
      await enqueueAction({
        entityName: this.entityName,
        action: SYNC_ACTIONS.UPDATE,
        localId: id,
        payload: mergedRecord,
      });
      return mergedRecord;
    }
  }

  /**
   * Delete a record.
   * - Always removes from local cache immediately (optimistic).
   * - If online: deletes on server.
   * - If offline: queues sync action.
   */
  async delete(id) {
    const existing = this.storeName ? await offlineDB.getById(this.storeName, id) : null;
    if (existing?._localOnly || String(id).startsWith('_local_')) {
      const removed = await removeQueuedMutationsForLocalRecord(this.entityName, id);
      const photoRefs = removed.flatMap((entry) => collectOfflinePhotoRefs(entry.payload));
      if (photoRefs.length) await discardOfflinePhotoRefs(photoRefs);
      if (this.storeName) await offlineDB.remove(this.storeName, id);
      return;
    }

    if (this.storeName) await offlineDB.remove(this.storeName, id);

    if (connectivityManager.isOnline()) {
      this._ensureToken();
      try {
        await this._sdk.delete(id);
        return;
      } catch (e) {
        if (e?.status === 404) return; // Already gone
        console.warn(`[offline] delete(${this.entityName}, ${id}) server failed, queuing`);
        await enqueueAction({
          entityName: this.entityName,
          action: SYNC_ACTIONS.DELETE,
          localId: id,
          payload: { id },
        });
      }
    } else {
      await enqueueAction({
        entityName: this.entityName,
        action: SYNC_ACTIONS.DELETE,
        localId: id,
        payload: { id },
      });
    }
  }

  /**
   * Force a fresh fetch from server and update local cache.
   */
  async refresh(criteria) {
    if (!connectivityManager.isOnline()) return;
    this._ensureToken();
    try {
      const records = criteria
        ? await this._sdk.filter(criteria)
        : await this._sdk.list();
      if (this.storeName) await offlineDB.putMany(this.storeName, records.map(tagForCurrentOwner));
      return records;
    } catch (e) {
      console.warn(`[offline] refresh(${this.entityName}) failed`, e?.message);
    }
  }

  /**
   * Get schema (always from SDK, not cached).
   */
  async schema() {
    return this._sdk.schema();
  }

  /**
   * Bulk create (online only for now, queued individually offline).
   */
  async bulkCreate(dataArray) {
    if (connectivityManager.isOnline()) {
      this._ensureToken();
      try {
        const records = await this._sdk.bulkCreate(dataArray);
        if (this.storeName) await offlineDB.putMany(this.storeName, records.map(tagForCurrentOwner));
        return records;
      } catch (e) {
        console.warn(`[offline] bulkCreate(${this.entityName}) failed`);
      }
    }
    // Create individually offline
    const results = [];
    for (const data of dataArray) {
      results.push(await this.create(data));
    }
    return results;
  }
}

// Repository cache — one instance per entity
const _repositoryCache = {};

export function getRepository(entityName) {
  if (!_repositoryCache[entityName]) {
    _repositoryCache[entityName] = new EntityRepository(entityName);
  }
  return _repositoryCache[entityName];
}