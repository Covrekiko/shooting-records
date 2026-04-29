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

    console.log(`[AMMO DELETE DEBUG] record id: ${sessionId}`);

    const session = await base44.asServiceRole.entities.SessionRecord.get(sessionId);

    console.log(`[AMMO DELETE DEBUG] record type: ${session.category}`);
    console.log(`[AMMO DELETE DEBUG] session data: ammunition_id=${session.ammunition_id} rounds_fired=${session.rounds_fired} total_count=${session.total_count} rifles_used=${JSON.stringify(session.rifles_used?.map(r => ({ rifle_id: r.rifle_id, ammunition_id: r.ammunition_id, rounds_fired: r.rounds_fired })))}`);

    const restorations = [];

    // Helper: restore ammo stock
    const restoreAmmo = async (ammunitionId, qty, label) => {
      if (!ammunitionId || !(qty > 0)) {
        console.log(`[AMMO DELETE DEBUG] ammo usage found: false (no ammo id or qty=0) for ${label}`);
        return;
      }
      try {
        const ammo = await base44.asServiceRole.entities.Ammunition.get(ammunitionId);
        const stockBefore = ammo.quantity_in_stock || 0;
        const stockAfter = stockBefore + qty;
        console.log(`[AMMO DELETE DEBUG] ammo usage found: true`);
        console.log(`[AMMO DELETE DEBUG] ammo stock item id: ${ammunitionId}`);
        console.log(`[AMMO DELETE DEBUG] quantity used: ${qty}`);
        console.log(`[AMMO DELETE DEBUG] stock before: ${stockBefore}`);
        console.log(`[AMMO DELETE DEBUG] refund quantity: +${qty}`);
        await base44.asServiceRole.entities.Ammunition.update(ammunitionId, { quantity_in_stock: stockAfter });
        console.log(`[AMMO DELETE DEBUG] stock after: ${stockAfter}`);
        console.log(`[AMMO DELETE DEBUG] stock update success: true`);
        restorations.push({ type: 'ammo', id: ammunitionId, qty, new_stock: stockAfter, label });
      } catch (e) {
        console.warn(`[AMMO DELETE DEBUG] stock update success: false — Ammo ${ammunitionId} error: ${e.message}`);
      }
    };

    // Helper: restore rifle round count
    const restoreRifleRounds = async (rifleId, qty) => {
      if (!rifleId || !(qty > 0)) return;
      try {
        const rifle = await base44.asServiceRole.entities.Rifle.get(rifleId);
        const newTotal = Math.max(0, (rifle.total_rounds_fired || 0) - qty);
        await base44.asServiceRole.entities.Rifle.update(rifleId, { total_rounds_fired: newTotal });
        restorations.push({ type: 'rifle_rounds', id: rifleId, qty });
        console.log(`[restoreSessionStock] Rifle ${rifleId}: total_rounds_fired → ${newTotal}`);
      } catch (e) {
        console.warn(`[restoreSessionStock] Rifle ${rifleId} not found: ${e.message}`);
      }
    };

    // ─── TARGET SHOOTING ─────────────────────────────────────────────────
    if (session.category === 'target_shooting') {
      if (Array.isArray(session.rifles_used) && session.rifles_used.length > 0) {
        // Accumulate rounds per ammo ID
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
        for (const [ammoId, totalRounds] of Object.entries(ammoTotals)) {
          await restoreAmmo(ammoId, totalRounds, 'target_shooting via rifles_used');
        }
      } else {
        // Fallback: top-level ammunition_id (for records saved without rifles_used)
        const qty = parseInt(session.rounds_fired) || 0;
        if (session.ammunition_id && qty > 0) {
          await restoreAmmo(session.ammunition_id, qty, 'target_shooting top-level fallback');
          if (session.rifle_id) await restoreRifleRounds(session.rifle_id, qty);
        } else {
          console.log(`[AMMO DELETE DEBUG] ammo usage found: false — target session has no rifles_used and no top-level ammunition_id`);
        }
      }
    }

    // ─── CLAY SHOOTING ───────────────────────────────────────────────────
    if (session.category === 'clay_shooting') {
      const roundsFired = parseInt(session.rounds_fired) || 0;

      if (session.ammunition_id && roundsFired > 0) {
        await restoreAmmo(session.ammunition_id, roundsFired, 'clay_shooting');
      } else {
        console.log(`[AMMO DELETE DEBUG] ammo usage found: false — clay session ammunition_id=${session.ammunition_id} rounds_fired=${roundsFired}`);
      }

      if (session.shotgun_id && roundsFired > 0) {
        try {
          const shotgun = await base44.asServiceRole.entities.Shotgun.get(session.shotgun_id);
          const newTotal = Math.max(0, (shotgun.total_cartridges_fired || 0) - roundsFired);
          await base44.asServiceRole.entities.Shotgun.update(session.shotgun_id, { total_cartridges_fired: newTotal });
          restorations.push({ type: 'shotgun_cartridges', id: session.shotgun_id, qty: roundsFired });
          console.log(`[restoreSessionStock] Shotgun ${session.shotgun_id}: total_cartridges_fired → ${newTotal}`);
        } catch (e) {
          console.warn(`[restoreSessionStock] Shotgun ${session.shotgun_id} not found: ${e.message}`);
        }
      }
    }

    // ─── DEER MANAGEMENT ─────────────────────────────────────────────────
    if (session.category === 'deer_management') {
      // Prefer explicit rounds_fired; fall back to total_count for old records
      const shotsFired = parseInt(session.rounds_fired) > 0
        ? parseInt(session.rounds_fired)
        : parseInt(session.total_count) || 0;

      console.log(`[restoreSessionStock] Deer: rounds_fired=${session.rounds_fired}, total_count=${session.total_count}, using=${shotsFired}`);

      if (session.ammunition_id && shotsFired > 0) {
        await restoreAmmo(session.ammunition_id, shotsFired, 'deer_management');
        if (session.rifle_id) await restoreRifleRounds(session.rifle_id, shotsFired);
      } else {
        console.log(`[AMMO DELETE DEBUG] ammo usage found: false — deer session ammunition_id=${session.ammunition_id} shots_fired=${shotsFired}`);
      }
    }

    // ─── CLEAN UP AmmoSpending LOG ENTRIES ───────────────────────────────
    try {
      const allSpending = await base44.asServiceRole.entities.AmmoSpending.filter({ created_by: user.email });
      let deletedLogs = 0;
      for (const record of allSpending) {
        if (record.notes && record.notes.includes(`session:${sessionId}`)) {
          await base44.asServiceRole.entities.AmmoSpending.delete(record.id);
          deletedLogs++;
        }
      }
      if (deletedLogs > 0) {
        console.log(`[restoreSessionStock] Cleaned up ${deletedLogs} AmmoSpending log entries for session ${sessionId}`);
      }
    } catch (e) {
      console.warn(`[restoreSessionStock] Could not clean AmmoSpending logs: ${e.message}`);
    }

    console.log(`[AMMO DELETE DEBUG] inventory refresh triggered: true — ${restorations.length} restoration(s) applied`);
    return Response.json({ success: true, sessionId, restorations });

  } catch (error) {
    console.error('[restoreSessionStock] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});