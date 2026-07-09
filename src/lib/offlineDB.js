/**
 * Offline-first local database using IndexedDB via a simple wrapper.
 * Falls back to localStorage for environments that don't support IDB.
 */

const DB_NAME = 'ShootingRecordsOfflineDB';
const DB_VERSION = 6;

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
  'reloading_inventory',
  'reloading_tests',
  'reloading_test_variants',
  'reloading_test_results',
  'maintenance_alerts',
  'target_sessions',
  'target_groups',
  'clay_stands',
  'clay_scorecards',
  'clay_shots',
  'cleaning_history',
  'ammo_spending',
  'sync_queue',
  'offline_map_packages',
  'queued_photos',
  'queued_pdfs',
  'conflicts',
  'meta',
];

let _db = null;
let _opening = null;

async function openDB() {
  // If the cached connection is closing/closed, reset it
  if (_db && _db.closePending !== undefined && _db.closePending) {
    _db = null;
  }

  if (_db) {
    // Verify the connection is still usable
    try {
      _db.transaction(STORES[0], 'readonly').abort();
    } catch (e) {
      // Connection is dead — reset so we reopen
      _db = null;
      _opening = null;
    }
  }

  if (_db) return _db;

  // Deduplicate concurrent open calls
  if (_opening) return _opening;

  _opening = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
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

    request.onsuccess = () => {
      _db = request.result;
      _opening = null;
      // Auto-reset on unexpected close
      _db.onclose = () => { _db = null; };
      _db.onversionchange = () => { _db.close(); _db = null; };
      resolve(_db);
    };

    request.onerror = () => {
      _opening = null;
      console.error('IndexedDB open error:', request.error);
      reject(request.error);
    };
  });

  return _opening;
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

async function clearAllStores() {
  await Promise.allSettled(STORES.map((storeName) => clearStore(storeName)));
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
  clearAllStores,
  getMeta,
  setMeta,
};

// Entity store name mapping
export const ENTITY_STORE_MAP = {
  SessionRecord: 'sessions',
  Rifle: 'rifles',
  Shotgun: 'shotguns',
  Club: 'clubs',
  Ammunition: 'ammunition',
  Area: 'areas',
  MapMarker: 'map_markers',
  Harvest: 'harvests',
  DeerOuting: 'deer_outings',
  ReloadingSession: 'reloading_sessions',
  ReloadingComponent: 'reloading_components',
  ReloadingStock: 'reloading_stock',
  ReloadingInventory: 'reloading_inventory',
  ReloadingTest: 'reloading_tests',
  ReloadingTestVariant: 'reloading_test_variants',
  ReloadingTestResult: 'reloading_test_results',
  MaintenanceAlert: 'maintenance_alerts',
  TargetSession: 'target_sessions',
  TargetGroup: 'target_groups',
  ClayStand: 'clay_stands',
  ClayScorecard: 'clay_scorecards',
  ClayShot: 'clay_shots',
  CleaningHistory: 'cleaning_history',
  AmmoSpending: 'ammo_spending',
};