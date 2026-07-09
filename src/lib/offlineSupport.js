/**
 * Backwards-compatible offline support layer.
 * Now delegates to the new offline-first architecture.
 */

export { connectivityManager } from './connectivityManager';
export { syncEngine, triggerSync, cacheUserProfile, getCachedUserProfile, clearCachedUserProfiles } from './syncEngine';
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

const PRECACHE_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
let _preCacheInProgress = false;

export async function preCacheUserData(userEmail) {
  if (!connectivityManager.isOnline()) return;
  if (_preCacheInProgress) return;

  // Skip if we pre-cached recently
  const lastPreCache = await offlineDB.getMeta('lastPreCache').catch(() => 0);
  if (lastPreCache && Date.now() - lastPreCache < PRECACHE_COOLDOWN_MS) return;

  _preCacheInProgress = true;
  try {
    const entities = [
      { name: 'SessionRecord', method: () => base44.entities.SessionRecord.filter({ created_by: userEmail }) },
      { name: 'Rifle', method: () => base44.entities.Rifle.filter({ created_by: userEmail }) },
      { name: 'Shotgun', method: () => base44.entities.Shotgun.filter({ created_by: userEmail }) },
      { name: 'Club', method: () => base44.entities.Club.filter({ created_by: userEmail }) },
      { name: 'Area', method: () => base44.entities.Area.filter({ created_by: userEmail }) },
      { name: 'MapMarker', method: () => base44.entities.MapMarker.filter({ created_by: userEmail }) },
      { name: 'Harvest', method: () => base44.entities.Harvest.filter({ created_by: userEmail }) },
      { name: 'DeerOuting', method: () => base44.entities.DeerOuting.filter({ created_by: userEmail }) },
      { name: 'Ammunition', method: async () => {
        const response = await base44.functions.invoke('listAmmunitionForUser', {});
        return response.data.ammunition || [];
      } },
      { name: 'ReloadingComponent', method: () => base44.entities.ReloadingComponent.filter({ created_by: userEmail }) },
      { name: 'ReloadingSession', method: () => base44.entities.ReloadingSession.filter({ created_by: userEmail }) },
      { name: 'ReloadingInventory', method: () => base44.entities.ReloadingInventory.filter({ created_by: userEmail }) },
      { name: 'ReloadingTest', method: () => base44.entities.ReloadingTest.filter({ created_by: userEmail }) },
      { name: 'ReloadingTestVariant', method: () => base44.entities.ReloadingTestVariant.filter({ created_by: userEmail }) },
      { name: 'ReloadingTestResult', method: () => base44.entities.ReloadingTestResult.filter({ created_by: userEmail }) },
      { name: 'TargetSession', method: () => base44.entities.TargetSession.filter({ created_by: userEmail }) },
      { name: 'TargetGroup', method: () => base44.entities.TargetGroup.filter({ created_by: userEmail }) },
      { name: 'ClayStand', method: () => base44.entities.ClayStand.filter({ created_by: userEmail }) },
      { name: 'ClayScorecard', method: () => base44.entities.ClayScorecard.filter({ created_by: userEmail }) },
      { name: 'ClayShot', method: () => base44.entities.ClayShot.filter({ created_by: userEmail }) },
      { name: 'MaintenanceAlert', method: () => base44.entities.MaintenanceAlert.filter({ created_by: userEmail }) },
      { name: 'CleaningHistory', method: () => base44.entities.CleaningHistory.filter({ created_by: userEmail }) },
      { name: 'AmmoSpending', method: () => base44.entities.AmmoSpending.filter({ created_by: userEmail }) },
    ];

    // Process in small batches of 3 to avoid overwhelming the server
    const batchSize = 3;
    for (let i = 0; i < entities.length; i += batchSize) {
      const batch = entities.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async ({ name, method }) => {
          const storeName = ENTITY_STORE_MAP[name];
          if (!storeName) return;
          const records = await method();
          if (records?.length) await offlineDB.putMany(storeName, records);
        })
      );
    }

    await offlineDB.setMeta('lastPreCache', Date.now());
  } catch (e) {
    console.warn('[offline] Pre-cache failed:', e?.message);
  } finally {
    _preCacheInProgress = false;
  }
}

// Legacy compatibility shim
export const offlineManager = {
  isOnline: () => connectivityManager.isOnline(),
  onOnlineStatusChange: (cb) => connectivityManager.subscribe(cb),
};