import { base44 } from '@/api/base44Client';

export async function loadOwnedAmmunitionWithReloads(currentUser) {
  const [ammunition = [], reloadSessions = []] = await Promise.all([
    base44.entities.Ammunition.list('-updated_date', 500),
    base44.entities.ReloadingSession.filter({ created_by: currentUser.email }),
  ]);

  const reloadSessionIds = new Set(reloadSessions.map(session => session.id));

  return ammunition.filter((ammo) => {
    if (ammo.archived === true || ammo.is_deleted === true) return false;

    const createdByUser = ammo.created_by === currentUser.email;
    const linkedReloadSession = reloadSessionIds.has(ammo.reload_session_id) || reloadSessionIds.has(ammo.source_id);
    const linkedReloadNotes = reloadSessions.some(session => ammo.notes?.includes(`reload_batch:${session.id}`));
    const isLinkedReloadAmmo = (linkedReloadSession || linkedReloadNotes) && (ammo.quantity_in_stock || 0) > 0;

    return createdByUser || isLinkedReloadAmmo;
  });
}