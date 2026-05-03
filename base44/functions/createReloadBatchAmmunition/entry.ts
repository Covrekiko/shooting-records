import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json().catch(() => ({}));
    const { ammunitionData, quantityToAdd, reloadSessionId } = payload;

    if (!ammunitionData || !reloadSessionId) {
      return Response.json({ error: 'Missing ammunition data' }, { status: 400 });
    }

    const ammoList = await base44.asServiceRole.entities.Ammunition.filter({ created_by: user.email });
    const existing = ammoList.find((item) =>
      item.source_id === reloadSessionId ||
      item.reload_session_id === reloadSessionId ||
      (item.notes && item.notes.includes(`reload_batch:${reloadSessionId}`))
    );

    if (existing) {
      const updated = await base44.asServiceRole.entities.Ammunition.update(existing.id, {
        quantity_in_stock: (existing.quantity_in_stock || 0) + (Number(quantityToAdd) || 0),
        cost_per_unit: ammunitionData.cost_per_unit || existing.cost_per_unit || 0,
        source_id: reloadSessionId,
        reload_session_id: reloadSessionId,
        reload_batch_id: reloadSessionId,
      });

      await base44.asServiceRole.entities.ReloadingSession.update(reloadSessionId, {
        ammunition_id: updated.id,
        linked_ammunition_id: updated.id,
        ammo_created_quantity: (updated.quantity_in_stock || 0),
      });

      return Response.json({ ammunition: updated, status: 'updated' });
    }

    const created = await base44.asServiceRole.entities.Ammunition.create({
      ...ammunitionData,
      quantity_in_stock: Number(ammunitionData.quantity_in_stock) || Number(quantityToAdd) || 0,
      cost_per_unit: Number(ammunitionData.cost_per_unit) || 0,
      low_stock_threshold: Number(ammunitionData.low_stock_threshold) || 10,
      created_by: user.email,
      source_id: reloadSessionId,
      reload_session_id: reloadSessionId,
      reload_batch_id: reloadSessionId,
    });

    await base44.asServiceRole.entities.ReloadingSession.update(reloadSessionId, {
      ammunition_id: created.id,
      linked_ammunition_id: created.id,
      ammo_created_quantity: Number(ammunitionData.quantity_in_stock) || Number(quantityToAdd) || 0,
    });

    return Response.json({ ammunition: created, status: 'created' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});