import { base44 } from '@/api/base44Client';
import { getRepository } from '@/lib/offlineSupport';

export async function loadOwnedAmmunitionWithReloads(currentUser) {
  if (navigator.onLine) {
    const response = await base44.functions.invoke('listAmmunitionForUser', {});
    return response.data.ammunition || [];
  }

  const [ammunition = [], reloadSessions = []] = await Promise.all([
    getRepository('Ammunition').list('-updated_date', 500),
    getRepository('ReloadingSession').filter({ created_by: currentUser.email }),
  ]);

  const reloadSessionIds = new Set(reloadSessions.map(session => session.id));

  return ammunition.filter((ammo) => {
    if (ammo.archived === true || ammo.is_deleted === true || ammo.status === 'deleted' || ammo.reload_session_deleted === true) return false;

    const createdByUser = ammo.created_by === currentUser.email;
    const linkedReloadSession = reloadSessionIds.has(ammo.reload_session_id) || reloadSessionIds.has(ammo.source_id) || reloadSessionIds.has(ammo.reload_batch_id);
    const linkedReloadNotes = reloadSessions.some(session => ammo.notes?.includes(`reload_batch:${session.id}`));
    const isReloaded = ammo.ammo_type === 'reloaded' || ammo.type === 'reloaded' || ammo.source === 'reloaded' || ammo.source_type === 'reload_batch';
    const hasStock = (ammo.quantity_in_stock || 0) > 0;
    const isLinkedReloadAmmo = isReloaded && hasStock && (createdByUser || linkedReloadSession || linkedReloadNotes);

    return createdByUser || isLinkedReloadAmmo;
  });
}