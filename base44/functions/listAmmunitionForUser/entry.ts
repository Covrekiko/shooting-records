import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function isVisibleAmmunition(ammo, reloadSessions, userEmail) {
  if (!ammo) return false;
  if (ammo.archived === true || ammo.is_deleted === true || ammo.status === 'deleted' || ammo.reload_session_deleted === true) return false;

  const sessions = reloadSessions || [];
  const linkedSessions = sessions.filter((session) => {
    const ids = [ammo.reload_session_id, ammo.source_id, ammo.reload_batch_id].filter(Boolean);
    return ids.includes(session.id) || ammo.notes?.includes(`reload_batch:${session.id}`) || (ammo.batch_number && session.batch_number && ammo.batch_number === session.batch_number);
  });
  const linkedToDeletedSession = linkedSessions.some((session) => session.isDeleted === true || session.is_deleted === true || session.archived === true || session.status === 'deleted' || session.reload_session_deleted === true);
  if (linkedToDeletedSession) return false;

  const createdByUser = ammo.created_by === userEmail;
  const isReloaded = ammo.ammo_type === 'reloaded' || ammo.type === 'reloaded' || ammo.source === 'reloaded' || ammo.source_type === 'reload_batch';
  const hasStock = (ammo.quantity_in_stock || 0) > 0;

  if (createdByUser) return true;
  return isReloaded && hasStock && linkedSessions.length > 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [ammunition, reloadSessions] = await Promise.all([
      base44.asServiceRole.entities.Ammunition.filter({ created_by: user.email }),
      base44.asServiceRole.entities.ReloadingSession.filter({ created_by: user.email }),
    ]);

    const linkedReloadAmmo = [];
    for (const session of reloadSessions || []) {
      const matches = await base44.asServiceRole.entities.Ammunition.filter({ reload_session_id: session.id });
      linkedReloadAmmo.push(...(matches || []));
    }

    const byId = new Map([...(ammunition || []), ...linkedReloadAmmo].map((item) => [item.id, item]));
    const visible = [...byId.values()]
      .filter((ammo) => isVisibleAmmunition(ammo, reloadSessions, user.email))
      .sort((a, b) => new Date(b.updated_date || b.created_date) - new Date(a.updated_date || a.created_date));

    return Response.json({ success: true, ammunition: visible });
  } catch (error) {
    console.error('[listAmmunitionForUser] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});