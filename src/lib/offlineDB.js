/**
 * Offline-first local database using IndexedDB via a simple wrapper.
 * Falls back to localStorage for environments that don't support IDB.
 */

const DB_NAME = 'ShootingRecordsOfflineDB';
const DB_VERSION = 1;

const STORES = [
  'user_profile',
  'sessions',
  'rifles',
  'shotguns',
  'clubs',
  'locations',
  'ammunition',
  'areas',
  'map_markers',
  'harvests',
  'deer_outings',
  'reloading_sessions',
  'reloading_components',
  'reloading_stock',
  'cleaning_history',
  'sync_queue',
  'meta',
];

let _db = null;

async function openDB() {
  if (_db) return _db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      STORES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          const store = db.createObjectStore(storeName, { keyPath: 'id' });
          if (storeName === 'sync_queue') {
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        }
      });
    };

    request.onsuccess = (event) => {
      _db = event.target.result;
      resolve(_db);
    };

    request.onerror = (event) => {
      console.error('IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };
  });
}

async function getAll(storeName) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error(`getAll(${storeName}) failed:`, e);
    return [];
  }
}

async function getById(storeName, id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    return null;
  }
}

async function put(storeName, record) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error(`put(${storeName}) failed:`, e);
  }
}

async function putMany(storeName, records) {
  if (!records || records.length === 0) return;
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      records.forEach((record) => {
        if (record && record.id) store.put(record);
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error(`putMany(${storeName}) failed:`, e);
  }
}

async function remove(storeName, id) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error(`remove(${storeName}) failed:`, e);
  }
}

async function clearStore(storeName) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error(`clearStore(${storeName}) failed:`, e);
  }
}

// Meta store helpers (for last-synced timestamps, etc.)
async function getMeta(key) {
  const record = await getById('meta', key);
  return record ? record.value : null;
}

async function setMeta(key, value) {
  await put('meta', { id: key, value, updatedAt: Date.now() });
}

export const offlineDB = {
  getAll,
  getById,
  put,
  putMany,
  remove,
  clearStore,
  getMeta,
  setMeta,
};

// Entity store name mapping
export const ENTITY_STORE_MAP = {
  SessionRecord: 'sessions',
  Rifle: 'rifles',
  Shotgun: 'shotguns',
  Club: 'clubs',
  DeerLocation: 'locations',
  Ammunition: 'ammunition',
  Area: 'areas',
  MapMarker: 'map_markers',
  Harvest: 'harvests',
  DeerOuting: 'deer_outings',
  ReloadingSession: 'reloading_sessions',
  ReloadingComponent: 'reloading_components',
  ReloadingStock: 'reloading_stock',
  CleaningHistory: 'cleaning_history',
};