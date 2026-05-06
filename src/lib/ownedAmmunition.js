import { base44 } from '@/api/base44Client';
import { getRepository } from '@/lib/offlineSupport';
import { offlineDB } from '@/lib/offlineDB';
import { appParams } from '@/lib/app-params';

const sdkDiagLogged = new Set();

const sdkDebugLogOnce = (key, message, details = {}) => {
  try {
    if (window.localStorage.getItem('SR_SDK_DEBUG') !== 'true' || sdkDiagLogged.has(key)) return;
    sdkDiagLogged.add(key);
    const baseUrl = appParams.appBaseUrl || appParams.serverUrl || window.location.origin;
    console.warn(message, {
      ...details,
      route: window.location.pathname,
      online: navigator.onLine,
      baseUrlHost: baseUrl ? new URL(baseUrl, window.location.origin).host : '',
      timestamp: new Date().toISOString(),
    });
  } catch {}
};

const filterVisibleOwnedAmmo = (items, currentUser, reloadSessions = []) => {
  const reloadSessionIds = new Set(reloadSessions.map(session => session.id));
  return items.filter((ammo) => {
    if (ammo.archived === true || ammo.is_deleted === true || ammo.status === 'deleted' || ammo.reload_session_deleted === true) return false;

    const createdByUser = ammo.created_by === currentUser.email;
    const linkedReloadSession = reloadSessionIds.has(ammo.reload_session_id) || reloadSessionIds.has(ammo.source_id) || reloadSessionIds.has(ammo.reload_batch_id);
    const linkedReloadNotes = reloadSessions.some(session => ammo.notes?.includes(`reload_batch:${session.id}`));
    const isReloaded = ammo.ammo_type === 'reloaded' || ammo.type === 'reloaded' || ammo.source === 'reloaded' || ammo.source_type === 'reload_batch';
    const hasStock = (ammo.quantity_in_stock || 0) > 0;
    const isLinkedReloadAmmo = isReloaded && hasStock && (createdByUser || linkedReloadSession || linkedReloadNotes);

    return createdByUser || isLinkedReloadAmmo;
  });
};

const flattenAmmunition = (ammo) => ({
  ...ammo,
  ...(ammo?.data || {}),
  id: ammo?.id,
  created_by: ammo?.created_by,
  created_date: ammo?.created_date,
  updated_date: ammo?.updated_date,
});

export async function loadOwnedAmmunitionWithReloads(currentUser) {
  if (!currentUser?.email) return [];

  if (navigator.onLine) {
    try {
      const response = await base44.functions.invoke('listAmmunitionForUser', {});
      const ammunition = (response.data.ammunition || []).map(flattenAmmunition);
      await offlineDB.putMany('ammunition', ammunition).catch(() => {});
      return ammunition;
    } catch (error) {
      sdkDebugLogOnce('listAmmunitionForUser.failed', '[SDK_DIAG] loadOwnedAmmunitionWithReloads failed', {
        call: 'base44.functions.invoke(listAmmunitionForUser)',
        component: 'lib/ownedAmmunition',
        error: error?.message || 'Ammunition unavailable',
        status: error?.status || error?.response?.status || null,
      });
    }
  }

  const [ammunition = [], reloadSessions = []] = await Promise.all([
    offlineDB.getAll('ammunition'),
    offlineDB.getAll('reloading_sessions'),
  ]);

  const cachedAmmo = filterVisibleOwnedAmmo(ammunition.map(flattenAmmunition), currentUser, reloadSessions);
  if (cachedAmmo.length > 0) return cachedAmmo;

  throw new Error('Ammo stock unavailable, retrying');
}