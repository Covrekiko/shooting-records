import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function isReloadedAmmunition(ammo = {}) {
  return ammo.ammo_type === 'reloaded'
    || ammo.type === 'reloaded'
    || ammo.source === 'reloaded'
    || ammo.source_type === 'reload_batch'
    || Boolean(ammo.reload_session_id || ammo.reload_batch_id || ammo.source_id);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ammunitionId } = await req.json();
    if (!ammunitionId) {
      return Response.json({ error: 'Missing ammunitionId' }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.Ammunition.get(ammunitionId);
    if (!existing) {
      return Response.json({ error: 'Ammunition not found' }, { status: 404 });
    }

    if (existing.created_by !== user.email) {
      return Response.json({ error: 'Forbidden: ammunition does not belong to you' }, { status: 403 });
    }

    if (isReloadedAmmunition(existing)) {
      const cleanup = await base44.functions.invoke('deleteReloadedAmmunitionWithSessionCleanup', { ammunitionId });
      return Response.json({ success: true, reloaded: true, ...(cleanup.data || {}) });
    }

    await base44.asServiceRole.entities.Ammunition.delete(ammunitionId);

    return Response.json({ success: true, deleted: true, ammunitionId });
  } catch (error) {
    console.error('[deleteAmmunitionForUser] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});