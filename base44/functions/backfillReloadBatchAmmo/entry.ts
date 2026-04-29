/**
 * One-time backfill: for each ReloadingSession that doesn't already have
 * a linked Ammunition entry tagged reload_batch:<id>, check if there's an
 * unlabelled "Reloaded" ammo for the same caliber and tag it, or create one.
 *
 * Safe to run multiple times — idempotent.
 * Only callable by admin users.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const [sessions, ammoList] = await Promise.all([
      base44.asServiceRole.entities.ReloadingSession.filter({ created_by: user.email }),
      base44.asServiceRole.entities.Ammunition.filter({ created_by: user.email }),
    ]);

    const results = [];

    for (const session of sessions) {
      // Already tagged?
      const alreadyTagged = ammoList.find(a => a.notes && a.notes.includes(`reload_batch:${session.id}`));
      if (alreadyTagged) {
        results.push({ session_id: session.id, batch: session.batch_number, status: 'already_linked', ammo_id: alreadyTagged.id });
        continue;
      }

      // Find an unlabelled Reloaded entry for same caliber that mentions this batch number
      const byBatchNumber = ammoList.find(a =>
        (a.brand === 'Reloaded' || (a.brand || '').startsWith('Reloaded')) &&
        a.caliber === session.caliber &&
        a.notes && a.notes.includes(session.batch_number)
      );

      if (byBatchNumber) {
        // Tag it
        const newNotes = `reload_batch:${session.id} | ${byBatchNumber.notes || ''}`;
        await base44.asServiceRole.entities.Ammunition.update(byBatchNumber.id, { notes: newNotes });
        results.push({ session_id: session.id, batch: session.batch_number, status: 'tagged_existing', ammo_id: byBatchNumber.id });
        continue;
      }

      // No ammo entry at all — create one (only if rounds_loaded > 0)
      if (session.rounds_loaded > 0) {
        const batchNotes = `reload_batch:${session.id} | Batch ${session.batch_number}`;
        const newAmmo = await base44.asServiceRole.entities.Ammunition.create({
          brand: 'Reloaded',
          caliber: session.caliber,
          bullet_type: 'Custom',
          quantity_in_stock: session.rounds_loaded,
          units: 'rounds',
          cost_per_unit: session.cost_per_round || 0,
          date_purchased: session.date,
          low_stock_threshold: 10,
          notes: batchNotes,
        });
        // Need to set created_by properly — the SDK does this automatically via the user context
        results.push({ session_id: session.id, batch: session.batch_number, status: 'created_new', ammo_id: newAmmo.id });
      } else {
        results.push({ session_id: session.id, batch: session.batch_number, status: 'skipped_no_rounds' });
      }
    }

    return Response.json({
      success: true,
      sessions_processed: sessions.length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});