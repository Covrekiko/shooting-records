import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Backend function to restore all stock before deleting a session record.
 * Handles: Target Shooting, Clay Shooting, Deer Management
 * Restores: Ammunition stock, Rifle round counts, Shotgun cartridge counts
 * Also cleans up AmmoSpending log entries for this session.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    console.log(`🟡 [restoreSessionStock] Starting restore for session: ${sessionId}`);

    const session = await base44.entities.SessionRecord.get(sessionId);
    console.log(`🟡 [restoreSessionStock] Session category: ${session.category}`);

    const restorations = [];

    // Helper: restore ammo stock
    const restoreAmmo = async (ammunitionId, qty) => {
      if (!ammunitionId || qty <= 0) return;
      try {
        const ammo = await base44.entities.Ammunition.get(ammunitionId);
        const newQty = (ammo.quantity_in_stock || 0) + qty;
        await base44.entities.Ammunition.update(ammunitionId, { quantity_in_stock: newQty });
        restorations.push({ type: 'ammo', id: ammunitionId, qty, new_stock: newQty });
        console.log(`🟢 Ammo ${ammunitionId}: +${qty} → ${newQty}`);
      } catch (e) {
        console.warn(`⚠️ Ammo ${ammunitionId} not found or already deleted:`, e.message);
      }
    };

    // Helper: restore rifle round count
    const restoreRifleRounds = async (rifleId, qty) => {
      if (!rifleId || qty <= 0) return;
      try {
        const rifle = await base44.entities.Rifle.get(rifleId);
        const newTotal = Math.max(0, (rifle.total_rounds_fired || 0) - qty);
        await base44.entities.Rifle.update(rifleId, { total_rounds_fired: newTotal });
        restorations.push({ type: 'rifle_rounds', id: rifleId, qty });
        console.log(`🟢 Rifle ${rifleId}: total_rounds_fired → ${newTotal}`);
      } catch (e) {
        console.warn(`⚠️ Rifle ${rifleId} not found:`, e.message);
      }
    };

    // ─── TARGET SHOOTING ─────────────────────────────────────────────────
    if (session.category === 'target_shooting' && Array.isArray(session.rifles_used)) {
      // Accumulate rounds per ammo ID (mirrors checkout logic — multiple rifles may share same ammo)
      const ammoTotals = {};
      for (const rifle of session.rifles_used) {
        const roundsFired = parseInt(rifle.rounds_fired) || 0;
        if (roundsFired <= 0) continue;

        if (rifle.ammunition_id) {
          ammoTotals[rifle.ammunition_id] = (ammoTotals[rifle.ammunition_id] || 0) + roundsFired;
        }
        if (rifle.rifle_id) {
          await restoreRifleRounds(rifle.rifle_id, roundsFired);
        }
      }
      // Restore each unique ammo entry once with the accumulated total
      for (const [ammoId, totalRounds] of Object.entries(ammoTotals)) {
        await restoreAmmo(ammoId, totalRounds);
      }
    }

    // ─── CLAY SHOOTING ───────────────────────────────────────────────────
    if (session.category === 'clay_shooting') {
      const roundsFired = parseInt(session.rounds_fired) || 0;

      if (session.ammunition_id && roundsFired > 0) {
        await restoreAmmo(session.ammunition_id, roundsFired);
      }

      if (session.shotgun_id && roundsFired > 0) {
        try {
          const shotgun = await base44.entities.Shotgun.get(session.shotgun_id);
          const newTotal = Math.max(0, (shotgun.total_cartridges_fired || 0) - roundsFired);
          await base44.entities.Shotgun.update(session.shotgun_id, { total_cartridges_fired: newTotal });
          restorations.push({ type: 'shotgun_cartridges', id: session.shotgun_id, qty: roundsFired });
          console.log(`🟢 Shotgun ${session.shotgun_id}: total_cartridges_fired → ${newTotal}`);
        } catch (e) {
          console.warn(`⚠️ Shotgun ${session.shotgun_id} not found:`, e.message);
        }
      }
    }

    // ─── DEER MANAGEMENT ─────────────────────────────────────────────────
    if (session.category === 'deer_management') {
      const shotsFired = parseInt(session.total_count) || 0;

      if (session.ammunition_id && shotsFired > 0) {
        await restoreAmmo(session.ammunition_id, shotsFired);
      }

      if (session.rifle_id && shotsFired > 0) {
        await restoreRifleRounds(session.rifle_id, shotsFired);
      }
    }

    // ─── CLEAN UP AmmoSpending LOG ENTRIES ───────────────────────────────
    // Remove any spending log entries that reference this session ID OR the linked outing ID.
    // This handles the case where ammo was decremented using the DeerOuting ID (activeOuting.id)
    // but the record being deleted is a SessionRecord with a different ID.
    try {
      const allSpending = await base44.entities.AmmoSpending.filter({ created_by: user.email });
      let deletedLogs = 0;

      // Also collect the outing_id from the session record so we can match spending logged with that ID
      const outingId = session.outing_id || null;

      for (const record of allSpending) {
        const matchesSession = record.notes && record.notes.includes(`session:${sessionId}`);
        const matchesOuting = outingId && record.notes && record.notes.includes(`session:${outingId}`);
        if (matchesSession || matchesOuting) {
          await base44.entities.AmmoSpending.delete(record.id);
          deletedLogs++;
        }
      }
      if (deletedLogs > 0) {
        console.log(`🟢 Cleaned up ${deletedLogs} AmmoSpending log entries for session ${sessionId} (outingId: ${outingId})`);
      }
    } catch (e) {
      console.warn(`⚠️ Could not clean AmmoSpending logs:`, e.message);
    }

    console.log(`🟢 [restoreSessionStock] Done. ${restorations.length} restoration(s) applied.`);
    return Response.json({ success: true, sessionId, restorations });

  } catch (error) {
    console.error('🔴 [restoreSessionStock] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});