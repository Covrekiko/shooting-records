import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Backend function to restore all stock before deleting a session record.
 * Handles: Target Shooting, Clay Shooting, Deer Management
 * Restores: Ammunition stock, Rifle round counts, Shotgun cartridge counts
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
    console.log(`🟡 [restoreSessionStock] Session:`, {
      id: session.id,
      category: session.category,
      rifles_used: session.rifles_used?.length || 0,
      ammunition_id: session.ammunition_id,
      rounds_fired: session.rounds_fired,
      total_count: session.total_count,
      rifle_id: session.rifle_id,
      shotgun_id: session.shotgun_id,
    });

    const restorations = [];

    // ─── TARGET SHOOTING ───────────────────────────────────────────────────────
    if (session.category === 'target_shooting' && Array.isArray(session.rifles_used)) {
      console.log(`🟡 Processing ${session.rifles_used.length} rifle(s) for target shooting`);

      for (const rifle of session.rifles_used) {
        const roundsFired = parseInt(rifle.rounds_fired) || 0;
        if (roundsFired <= 0) continue;

        // Restore ammunition stock
        if (rifle.ammunition_id) {
          try {
            const ammo = await base44.entities.Ammunition.get(rifle.ammunition_id);
            const newQty = (ammo.quantity_in_stock || 0) + roundsFired;
            await base44.entities.Ammunition.update(rifle.ammunition_id, { quantity_in_stock: newQty });
            restorations.push({ type: 'ammo', id: rifle.ammunition_id, qty: roundsFired, new_stock: newQty });
            console.log(`🟢 Ammo ${rifle.ammunition_id}: +${roundsFired} → ${newQty}`);
          } catch (e) {
            console.warn(`⚠️ Ammo ${rifle.ammunition_id} not found:`, e.message);
          }
        }

        // Restore rifle total_rounds_fired
        if (rifle.rifle_id) {
          try {
            const rifleRecord = await base44.entities.Rifle.get(rifle.rifle_id);
            const newTotal = Math.max(0, (rifleRecord.total_rounds_fired || 0) - roundsFired);
            await base44.entities.Rifle.update(rifle.rifle_id, { total_rounds_fired: newTotal });
            restorations.push({ type: 'rifle_rounds', id: rifle.rifle_id, qty: roundsFired });
            console.log(`🟢 Rifle ${rifle.rifle_id}: total_rounds_fired ${rifleRecord.total_rounds_fired} → ${newTotal}`);
          } catch (e) {
            console.warn(`⚠️ Rifle ${rifle.rifle_id} not found:`, e.message);
          }
        }
      }
    }

    // ─── CLAY SHOOTING ─────────────────────────────────────────────────────────
    if (session.category === 'clay_shooting') {
      const roundsFired = parseInt(session.rounds_fired) || 0;

      // Restore ammunition stock
      if (session.ammunition_id && roundsFired > 0) {
        try {
          const ammo = await base44.entities.Ammunition.get(session.ammunition_id);
          const newQty = (ammo.quantity_in_stock || 0) + roundsFired;
          await base44.entities.Ammunition.update(session.ammunition_id, { quantity_in_stock: newQty });
          restorations.push({ type: 'ammo', id: session.ammunition_id, qty: roundsFired, new_stock: newQty });
          console.log(`🟢 Clay ammo ${session.ammunition_id}: +${roundsFired} → ${newQty}`);
        } catch (e) {
          console.warn(`⚠️ Clay ammo ${session.ammunition_id} not found:`, e.message);
        }
      }

      // Restore shotgun cartridge count
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

    // ─── DEER MANAGEMENT ───────────────────────────────────────────────────────
    if (session.category === 'deer_management') {
      const shotsFired = parseInt(session.total_count) || 0;

      // Restore ammunition stock
      if (session.ammunition_id && shotsFired > 0) {
        try {
          const ammo = await base44.entities.Ammunition.get(session.ammunition_id);
          const newQty = (ammo.quantity_in_stock || 0) + shotsFired;
          await base44.entities.Ammunition.update(session.ammunition_id, { quantity_in_stock: newQty });
          restorations.push({ type: 'ammo', id: session.ammunition_id, qty: shotsFired, new_stock: newQty });
          console.log(`🟢 Deer ammo ${session.ammunition_id}: +${shotsFired} → ${newQty}`);
        } catch (e) {
          console.warn(`⚠️ Deer ammo ${session.ammunition_id} not found:`, e.message);
        }
      }

      // Restore rifle total_rounds_fired
      if (session.rifle_id && shotsFired > 0) {
        try {
          const rifleRecord = await base44.entities.Rifle.get(session.rifle_id);
          const newTotal = Math.max(0, (rifleRecord.total_rounds_fired || 0) - shotsFired);
          await base44.entities.Rifle.update(session.rifle_id, { total_rounds_fired: newTotal });
          restorations.push({ type: 'rifle_rounds', id: session.rifle_id, qty: shotsFired });
          console.log(`🟢 Deer rifle ${session.rifle_id}: total_rounds_fired → ${newTotal}`);
        } catch (e) {
          console.warn(`⚠️ Deer rifle ${session.rifle_id} not found:`, e.message);
        }
      }
    }

    console.log(`🟢 [restoreSessionStock] Done. ${restorations.length} restoration(s) applied.`);

    return Response.json({ success: true, sessionId, restorations });
  } catch (error) {
    console.error('🔴 [restoreSessionStock] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});