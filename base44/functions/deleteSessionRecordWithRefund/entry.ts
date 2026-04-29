/**
 * DELETE SESSION RECORD WITH COMPLETE REFUND
 * 
 * Correct order:
 * 1. Load full SessionRecord
 * 2. Identify ALL ammo usage (rifles_used[], ammo_id, etc)
 * 3. Refund each Ammunition.quantity_in_stock
 * 4. Delete AmmoSpending entries
 * 5. Reverse firearm/shotgun counters
 * 6. Delete SessionRecord
 * 7. Return success with refund summary
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // STEP 1: Load full SessionRecord
    console.log(`[DELETE REFUND] Loading SessionRecord: ${sessionId}`);
    const record = await base44.asServiceRole.entities.SessionRecord.get(sessionId);
    if (!record) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    // Verify ownership
    if (record.created_by !== user.email) {
      return Response.json({ error: 'Forbidden: not your record' }, { status: 403 });
    }

    const refundSummary = {
      category: record.category,
      ammunition_refunded: {},
      firearm_reversal: null,
      error: null,
    };

    // STEP 2: Identify ALL ammo usage linked to this record
    const ammoToRefund = [];

    if (record.category === 'target_shooting') {
      // TARGET: rifles_used[] array with individual ammunition_id per rifle
      if (record.rifles_used && Array.isArray(record.rifles_used)) {
        for (const rifle of record.rifles_used) {
          if (rifle.ammunition_id && rifle.rounds_fired) {
            ammoToRefund.push({
              ammo_id: rifle.ammunition_id,
              rounds: parseInt(rifle.rounds_fired),
              rifle_id: rifle.rifle_id,
            });
          }
        }
      }
    } else if (record.category === 'clay_shooting') {
      // CLAY: ammunition_id at top level
      if (record.ammunition_id && record.rounds_fired) {
        ammoToRefund.push({
          ammo_id: record.ammunition_id,
          rounds: parseInt(record.rounds_fired),
          shotgun_id: record.shotgun_id,
        });
      }
    } else if (record.category === 'deer_management') {
      // DEER: ammunition_id at top level
      if (record.ammunition_id && record.total_count) {
        ammoToRefund.push({
          ammo_id: record.ammunition_id,
          rounds: parseInt(record.total_count),
          rifle_id: record.rifle_id,
        });
      }
    }

    console.log(`[DELETE REFUND] Found ${ammoToRefund.length} ammo entries to refund`);

    // STEP 3: Refund each Ammunition.quantity_in_stock
    for (const ammo of ammoToRefund) {
      try {
        const ammoEntry = await base44.asServiceRole.entities.Ammunition.get(ammo.ammo_id);
        if (!ammoEntry) {
          console.warn(`[DELETE REFUND] Ammunition ${ammo.ammo_id} not found, skipping`);
          continue;
        }

        const newStock = (ammoEntry.quantity_in_stock || 0) + ammo.rounds;
        await base44.asServiceRole.entities.Ammunition.update(ammo.ammo_id, {
          quantity_in_stock: newStock,
        });

        refundSummary.ammunition_refunded[ammo.ammo_id] = {
          before: ammoEntry.quantity_in_stock,
          refunded: ammo.rounds,
          after: newStock,
        };

        console.log(`[DELETE REFUND] Ammo ${ammo.ammo_id}: ${ammoEntry.quantity_in_stock} → +${ammo.rounds} → ${newStock}`);
      } catch (err) {
        console.error(`[DELETE REFUND] Error refunding ammo ${ammo.ammo_id}:`, err.message);
        refundSummary.error = `Failed to refund ammunition ${ammo.ammo_id}`;
        return Response.json(refundSummary, { status: 400 });
      }
    }

    // STEP 4: Delete AmmoSpending entries for this record
    try {
      const spending = await base44.asServiceRole.entities.AmmoSpending.filter({
        created_by: user.email,
      });
      const matchingSpending = spending.filter(s => s.session_id === sessionId);
      for (const spend of matchingSpending) {
        await base44.asServiceRole.entities.AmmoSpending.delete(spend.id);
      }
      console.log(`[DELETE REFUND] Deleted ${matchingSpending.length} AmmoSpending entries`);
    } catch (err) {
      console.warn(`[DELETE REFUND] Could not delete AmmoSpending (may not exist):`, err.message);
      // Non-fatal — continue
    }

    // STEP 5: Reverse firearm/shotgun counters
    if (record.category === 'target_shooting' && record.rifles_used) {
      for (const rifle of record.rifles_used) {
        if (rifle.rifle_id && rifle.rounds_fired) {
          try {
            const rifleEntry = await base44.asServiceRole.entities.Rifle.get(rifle.rifle_id);
            if (rifleEntry) {
              const newTotal = Math.max(0, (rifleEntry.total_rounds_fired || 0) - parseInt(rifle.rounds_fired));
              await base44.asServiceRole.entities.Rifle.update(rifle.rifle_id, {
                total_rounds_fired: newTotal,
              });
              refundSummary.firearm_reversal = `Rifle: ${newTotal} rounds`;
              console.log(`[DELETE REFUND] Rifle ${rifle.rifle_id}: total_rounds reversed to ${newTotal}`);
            }
          } catch (err) {
            console.warn(`[DELETE REFUND] Error updating rifle ${rifle.rifle_id}:`, err.message);
          }
        }
      }
    } else if (record.category === 'clay_shooting' && record.shotgun_id && record.rounds_fired) {
      try {
        const shotgunEntry = await base44.asServiceRole.entities.Shotgun.get(record.shotgun_id);
        if (shotgunEntry) {
          const newTotal = Math.max(0, (shotgunEntry.total_cartridges_fired || 0) - parseInt(record.rounds_fired));
          await base44.asServiceRole.entities.Shotgun.update(record.shotgun_id, {
            total_cartridges_fired: newTotal,
          });
          refundSummary.firearm_reversal = `Shotgun: ${newTotal} cartridges`;
          console.log(`[DELETE REFUND] Shotgun ${record.shotgun_id}: total_cartridges_fired reversed to ${newTotal}`);
        }
      } catch (err) {
        console.warn(`[DELETE REFUND] Error updating shotgun ${record.shotgun_id}:`, err.message);
      }
    } else if (record.category === 'deer_management' && record.rifle_id && record.total_count) {
      try {
        const rifleEntry = await base44.asServiceRole.entities.Rifle.get(record.rifle_id);
        if (rifleEntry) {
          const newTotal = Math.max(0, (rifleEntry.total_rounds_fired || 0) - parseInt(record.total_count));
          await base44.asServiceRole.entities.Rifle.update(record.rifle_id, {
            total_rounds_fired: newTotal,
          });
          refundSummary.firearm_reversal = `Rifle: ${newTotal} rounds`;
          console.log(`[DELETE REFUND] Rifle ${record.rifle_id}: total_rounds reversed to ${newTotal}`);
        }
      } catch (err) {
        console.warn(`[DELETE REFUND] Error updating rifle ${record.rifle_id}:`, err.message);
      }
    }

    // STEP 6: Delete SessionRecord
    console.log(`[DELETE REFUND] Deleting SessionRecord ${sessionId}`);
    await base44.asServiceRole.entities.SessionRecord.delete(sessionId);

    // STEP 7: Return success
    refundSummary.success = true;
    refundSummary.message = `Record deleted, ${ammoToRefund.length} ammo refunded, firearms reversed`;
    return Response.json(refundSummary, { status: 200 });

  } catch (error) {
    console.error('[DELETE REFUND] FATAL ERROR:', error);
    return Response.json(
      { error: error.message, success: false },
      { status: 500 }
    );
  }
});