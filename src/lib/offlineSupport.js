/**
 * Backwards-compatible offline support layer.
 * Now delegates to the new offline-first architecture.
 */

export { connectivityManager } from './connectivityManager';
export { syncEngine, triggerSync, cacheUserProfile, getCachedUserProfile } from './syncEngine';
export { getRepository } from './offlineEntityRepository';
export { offlineDB } from './offlineDB';
export { enqueueAction, getPendingQueue, getPendingCount } from './syncQueue';

/**
 * Pre-cache all critical entity data for a user.
 * Call this after login / on app load while online.
 */
import { base44 } from '@/api/base44Client';
import { offlineDB, ENTITY_STORE_MAP } from './offlineDB';
import { connectivityManager } from './connectivityManager';

export async function preCacheUserData(userEmail) {
  if (!connectivityManager.isOnline()) return;
  try {
    const entities = [
      { name: 'SessionRecord', method: () => base44.entities.SessionRecord.filter({ created_by: userEmail }) },
      { name: 'Rifle', method: () => base44.entities.Rifle.filter({ created_by: userEmail }) },
      { name: 'Shotgun', method: () => base44.entities.Shotgun.filter({ created_by: userEmail }) },
      { name: 'Club', method: () => base44.entities.Club.filter({ created_by: userEmail }) },
      { name: 'DeerLocation', method: () => base44.entities.DeerLocation.filter({ created_by: userEmail }) },
      { name: 'Ammunition', method: () => base44.entities.Ammunition.filter({ created_by: userEmail }) },
      { name: 'Area', method: () => base44.entities.Area.filter({ created_by: userEmail }) },
      { name: 'MapMarker', method: () => base44.entities.MapMarker.list() },
      { name: 'Harvest', method: () => base44.entities.Harvest.list() },
      { name: 'ReloadingComponent', method: () => base44.entities.ReloadingComponent.filter({ created_by: userEmail }) },
      { name: 'ReloadingSession', method: () => base44.entities.ReloadingSession.filter({ created_by: userEmail }) },
      { name: 'CleaningHistory', method: () => base44.entities.CleaningHistory.filter({ created_by: userEmail }) },
    ];

    await Promise.allSettled(
      entities.map(async ({ name, method }) => {
        const storeName = ENTITY_STORE_MAP[name];
        if (!storeName) return;
        const records = await method();
        if (records?.length) await offlineDB.putMany(storeName, records);
      })
    );

    await offlineDB.setMeta('lastPreCache', Date.now());
    console.log('[offline] Pre-cache complete');
  } catch (e) {
    console.warn('[offline] Pre-cache failed:', e?.message);
  }
}

// Legacy compatibility shim
export const offlineManager = {
  isOnline: () => connectivityManager.isOnline(),
  onOnlineStatusChange: (cb) => connectivityManager.subscribe(cb),
};