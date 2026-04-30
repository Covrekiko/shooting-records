import { queryClientInstance } from '@/lib/query-client';
import { offlineDB } from '@/lib/offlineDB';

const OFFLINE_DB_NAME = 'ShootingRecordsOfflineDB';

function deleteIndexedDbDatabase(name) {
  if (!window.indexedDB) return Promise.resolve();

  return new Promise((resolve) => {
    const request = window.indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

async function clearBrowserCaches() {
  if (!window.caches?.keys) return;
  const keys = await window.caches.keys();
  await Promise.all(keys.map((key) => window.caches.delete(key)));
}

export async function clearLocalAccountData() {
  queryClientInstance.clear();

  await Promise.allSettled([
    offlineDB.clearAllStores(),
    deleteIndexedDbDatabase(OFFLINE_DB_NAME),
    clearBrowserCaches(),
  ]);

  try { window.localStorage.clear(); } catch (_) {}
  try { window.sessionStorage.clear(); } catch (_) {}
}