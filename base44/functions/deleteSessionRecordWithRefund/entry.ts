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

const num = (value) => Number(value || 0);
const hasValue = (value) => value !== undefined && value !== null;

const getBrassState = (brass) => {
  const totalOwned = num(brass.total_owned ?? brass.quantity_total);
  const legacyAvailable = num(brass.available_to_reload ?? brass.quantity_remaining);
  const isLegacySplitMissing = !hasValue(brass.available_new_unloaded) && !hasValue(brass.available_used_recovered);
  const addedAsUsed = brass.is_used_brass === true;
  const available_new_unloaded = isLegacySplitMissing ? (addedAsUsed ? 0 : legacyAvailable) : num(brass.available_new_unloaded);
  const available_used_recovered = isLegacySplitMissing ? (addedAsUsed ? legacyAvailable : 0) : num(brass.available_used_recovered);
  const currently_loaded_new = hasValue(brass.currently_loaded_new) ? num(brass.currently_loaded_new) : (addedAsUsed ? 0 : num(brass.currently_loaded));
  const currently_loaded_used = hasValue(brass.currently_loaded_used) ? num(brass.currently_loaded_used) : (addedAsUsed ? num(brass.currently_loaded) : 0);
  const fired_new_awaiting_cleaning_or_inspection = hasValue(brass.fired_new_awaiting_cleaning_or_inspection) ? num(brass.fired_new_awaiting_cleaning_or_inspection) : (addedAsUsed ? 0 : num(brass.fired_awaiting_cleaning_or_inspection));
  const fired_used_awaiting_cleaning_or_inspection = hasValue(brass.fired_used_awaiting_cleaning_or_inspection) ? num(brass.fired_used_awaiting_cleaning_or_inspection) : (addedAsUsed ? num(brass.fired_awaiting_cleaning_or_inspection) : 0);
  const first_use_cost_remaining_quantity = hasValue(brass.first_use_cost_remaining_quantity) ? num(brass.first_use_cost_remaining_quantity) : (addedAsUsed ? 0 : available_new_unloaded);
  const cost_consumed_quantity = hasValue(brass.cost_consumed_quantity) ? num(brass.cost_consumed_quantity) : (addedAsUsed ? 0 : Math.max(0, totalOwned - available_new_unloaded));

  return {
    total_owned: totalOwned,
    available_new_unloaded,
    available_used_recovered,
    available_to_reload: available_new_unloaded + available_used_recovered,
    currently_loaded_new,
    currently_loaded_used,
    currently_loaded: currently_loaded_new + currently_loaded_used,
    fired_new_awaiting_cleaning_or_inspection,
    fired_used_awaiting_cleaning_or_inspection,
    fired_awaiting_cleaning_or_inspection: fired_new_awaiting_cleaning_or_inspection + fired_used_awaiting_cleaning_or_inspection,
    retired_or_discarded: num(brass.retired_or_discarded),
    first_use_cost_remaining_quantity,
    cost_consumed_quantity,
    reload_cycle_count: num(brass.reload_cycle_count ?? brass.times_reloaded),
    lifetime_reload_count: num(brass.lifetime_reload_count),
    reload_limit: num(brass.reload_limit ?? brass.max_reloads),
    anneal_count: num(brass.anneal_count),
    last_annealed_date: brass.last_annealed_date || '',
  };
};

const brassStateTotal = (state) =>
  num(state.available_new_unloaded) + num(state.available_used_recovered) + num(state.currently_loaded_new) + num(state.currently_loaded_used) + num(state.fired_new_awaiting_cleaning_or_inspection) + num(state.fired_used_awaiting_cleaning_or_inspection) + num(state.retired_or_discarded);

const normalizeBrassState = (state) => {
  const normalized = {
    ...state,
    total_owned: num(state.total_owned),
    available_new_unloaded: Math.max(0, num(state.available_new_unloaded)),
    available_used_recovered: Math.max(0, num(state.available_used_recovered)),
    currently_loaded_new: Math.max(0, num(state.currently_loaded_new)),
    currently_loaded_used: Math.max(0, num(state.currently_loaded_used)),
    fired_new_awaiting_cleaning_or_inspection: Math.max(0, num(state.fired_new_awaiting_cleaning_or_inspection)),
    fired_used_awaiting_cleaning_or_inspection: Math.max(0, num(state.fired_used_awaiting_cleaning_or_inspection)),
    retired_or_discarded: Math.max(0, num(state.retired_or_discarded)),
    first_use_cost_remaining_quantity: Math.max(0, num(state.first_use_cost_remaining_quantity)),
    cost_consumed_quantity: Math.max(0, num(state.cost_consumed_quantity)),
  };
  let overflow = brassStateTotal(normalized) - normalized.total_owned;
  const reduce = (field) => {
    if (overflow <= 0) return;
    const reduction = Math.min(normalized[field], overflow);
    normalized[field] -= reduction;
    overflow -= reduction;
  };
  reduce('available_used_recovered');
  reduce('available_new_unloaded');
  reduce('fired_used_awaiting_cleaning_or_inspection');
  reduce('fired_new_awaiting_cleaning_or_inspection');
  reduce('currently_loaded_used');
  reduce('currently_loaded_new');
  normalized.available_to_reload = normalized.available_new_unloaded + normalized.available_used_recovered;
  normalized.currently_loaded = normalized.currently_loaded_new + normalized.currently_loaded_used;
  normalized.fired_awaiting_cleaning_or_inspection = normalized.fired_new_awaiting_cleaning_or_inspection + normalized.fired_used_awaiting_cleaning_or_inspection;
  normalized.first_use_cost_remaining_quantity = Math.min(normalized.first_use_cost_remaining_quantity, normalized.available_new_unloaded);
  normalized.cost_consumed_quantity = Math.min(normalized.cost_consumed_quantity, normalized.total_owned);
  return normalized;
};

const stateUpdate = (state) => {
  const normalized = normalizeBrassState(state);
  return {
    total_owned: normalized.total_owned,
    quantity_total: normalized.total_owned,
    available_new_unloaded: normalized.available_new_unloaded,
    available_used_recovered: normalized.available_used_recovered,
    available_to_reload: normalized.available_to_reload,
    quantity_remaining: normalized.available_to_reload,
    currently_loaded_new: normalized.currently_loaded_new,
    currently_loaded_used: normalized.currently_loaded_used,
    currently_loaded: normalized.currently_loaded,
    fired_new_awaiting_cleaning_or_inspection: normalized.fired_new_awaiting_cleaning_or_inspection,
    fired_used_awaiting_cleaning_or_inspection: normalized.fired_used_awaiting_cleaning_or_inspection,
    fired_awaiting_cleaning_or_inspection: normalized.fired_awaiting_cleaning_or_inspection,
    retired_or_discarded: normalized.retired_or_discarded,
    first_use_cost_remaining_quantity: normalized.first_use_cost_remaining_quantity,
    cost_consumed_quantity: normalized.cost_consumed_quantity,
    reload_cycle_count: normalized.reload_cycle_count,
    times_reloaded: normalized.reload_cycle_count,
    lifetime_reload_count: normalized.lifetime_reload_count,
    reload_limit: normalized.reload_limit,
    max_reloads: normalized.reload_limit,
    anneal_count: normalized.anneal_count,
    last_annealed_date: normalized.last_annealed_date,
  };
};

async function logBrassMovement(base44, { brassId, reloadBatchId, recordId, ammunitionId, quantity, movementType, previousState, newState, notes }) {
  await base44.asServiceRole.entities.BrassMovementLog.create({
    brass_id: brassId,
    reload_batch_id: reloadBatchId || '',
    record_id: recordId || '',
    ammunition_id: ammunitionId || '',
    quantity: parseInt(quantity) || 0,
    movement_type: movementType,
    previous_state: previousState,
    new_state: newState,
    movement_date: new Date().toISOString(),
    notes: notes || '',
  });
}

async function getReloadSessionForAmmo(base44, ammo) {
  const sessionId = ammo.reload_session_id || ammo.source_id;
  if (!sessionId || ammo.source_type !== 'reload_batch') return null;
  return await base44.asServiceRole.entities.ReloadingSession.get(sessionId);
}

async function getReusedBrassStockRestoreWarning(base44, ammo, recordId, userEmail) {
  const firedLogs = await base44.asServiceRole.entities.BrassMovementLog.filter({ record_id: recordId, ammunition_id: ammo.id, movement_type: 'fired_from_loaded_ammo' });
  for (const firedLog of firedLogs) {
    const brassLogs = await base44.asServiceRole.entities.BrassMovementLog.filter({ brass_id: firedLog.brass_id });
    const orderedLogs = brassLogs.filter(log => log.movement_date).sort((a, b) => new Date(a.movement_date) - new Date(b.movement_date));
    const firedTime = new Date(firedLog.movement_date).getTime();
    const recoveredLog = orderedLogs.find(log => log.movement_type === 'recovered_after_firing' && new Date(log.movement_date).getTime() > firedTime);
    if (!recoveredLog) continue;
    const recoveredTime = new Date(recoveredLog.movement_date).getTime();
    const reusedLog = orderedLogs.find(log => log.movement_type === 'used_in_reload_batch' && log.reload_batch_id !== firedLog.reload_batch_id && new Date(log.movement_date).getTime() > recoveredTime);
    if (reusedLog) return { firedLog, recoveredLog, reusedLog, brassId: firedLog.brass_id };
  }
  return null;
}

async function restoreFiredBrassToLoadedForRecord(base44, ammo, quantity, recordId, userEmail) {
  const existingRestores = await base44.asServiceRole.entities.BrassMovementLog.filter({ record_id: recordId, movement_type: 'restored_after_record_delete' });
  if (existingRestores.some(log => log.ammunition_id === ammo.id)) return { restored: 0 };

  const firedLogs = await base44.asServiceRole.entities.BrassMovementLog.filter({ record_id: recordId, movement_type: 'fired_from_loaded_ammo' });
  const log = firedLogs.find(item => item.ammunition_id === ammo.id);
  const session = await getReloadSessionForAmmo(base44, ammo);
  const sessionBrass = session?.components?.find(c => c.type?.toLowerCase() === 'brass');
  const brassId = log?.brass_id || ammo.brass_component_id || session?.brass_component_id || sessionBrass?.component_id;
  if (!brassId) return { restored: 0 };

  const brass = await base44.asServiceRole.entities.ReloadingComponent.get(brassId);
  const previousState = getBrassState(brass);
  const qty = Math.min(parseInt(quantity) || log?.quantity || 0, previousState.fired_awaiting_cleaning_or_inspection);
  if (qty <= 0) return { restored: 0 };

  const useType = ammo.brass_use_type || session?.brass_use_type || sessionBrass?.brass_use_type || 'used';
  let newRestored = 0;
  let usedRestored = 0;

  if (useType === 'mixed') {
    const batchNew = num(ammo.brass_new_quantity_used ?? session?.brass_new_quantity_used ?? sessionBrass?.brass_new_quantity_used);
    const batchUsed = num(ammo.brass_used_quantity_used ?? session?.brass_used_quantity_used ?? sessionBrass?.brass_used_quantity_used);
    const totalBatchBrass = Math.max(1, batchNew + batchUsed);
    newRestored = Math.min(qty, previousState.fired_new_awaiting_cleaning_or_inspection, Math.round(qty * (batchNew / totalBatchBrass)));
    usedRestored = Math.min(qty - newRestored, previousState.fired_used_awaiting_cleaning_or_inspection);
  } else if (useType === 'new') {
    newRestored = Math.min(qty, previousState.fired_new_awaiting_cleaning_or_inspection);
    usedRestored = Math.min(qty - newRestored, previousState.fired_used_awaiting_cleaning_or_inspection);
  } else {
    usedRestored = Math.min(qty, previousState.fired_used_awaiting_cleaning_or_inspection);
    newRestored = Math.min(qty - usedRestored, previousState.fired_new_awaiting_cleaning_or_inspection);
  }

  const newState = {
    ...previousState,
    fired_new_awaiting_cleaning_or_inspection: Math.max(0, previousState.fired_new_awaiting_cleaning_or_inspection - newRestored),
    fired_used_awaiting_cleaning_or_inspection: Math.max(0, previousState.fired_used_awaiting_cleaning_or_inspection - usedRestored),
    currently_loaded_new: previousState.currently_loaded_new + newRestored,
    currently_loaded_used: previousState.currently_loaded_used + usedRestored,
  };
  await base44.asServiceRole.entities.ReloadingComponent.update(brassId, stateUpdate(newState));
  await logBrassMovement(base44, {
    brassId,
    reloadBatchId: log?.reload_batch_id || ammo.reload_session_id || ammo.source_id,
    recordId,
    ammunitionId: ammo.id,
    quantity: qty,
    movementType: 'restored_after_record_delete',
    previousState,
    newState,
    notes: 'Record deletion reversed fired brass movement',
  });
  return { restored: qty };
}

async function logSkippedAmmoStockRestore(base44, { ammo, recordId, quantity, warning }) {
  const brassId = warning?.brassId || ammo.brass_component_id;
  if (!brassId) return;
  const brass = await base44.asServiceRole.entities.ReloadingComponent.get(brassId);
  const state = getBrassState(brass);
  await logBrassMovement(base44, {
    brassId,
    reloadBatchId: warning?.firedLog?.reload_batch_id || ammo.reload_session_id || ammo.source_id,
    recordId,
    ammunitionId: ammo.id,
    quantity,
    movementType: 'stock_restore_skipped_brass_already_reused',
    previousState: state,
    newState: state,
    notes: 'Used brass was not restored because it was already recovered/reused in a later reload batch.',
  });
}

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
    if (user.role !== 'admin' && record.created_by !== user.email) {
      return Response.json({ error: 'Forbidden: not your record' }, { status: 403 });
    }

    if (record.isDeleted === true || record.status === 'deleted' || record.ammoRefunded === true) {
      return Response.json({ success: true, skipped: true, message: 'Record was already deleted or refunded.' }, { status: 200 });
    }

    const ownerEmail = record.created_by;

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
      // DEER: ammunition_id at top level; use actual shots fired before harvest total
      const deerRounds = parseInt(record.rounds_fired || record.total_count || record.number_shot || 0) || 0;
      if (record.ammunition_id && deerRounds > 0) {
        ammoToRefund.push({
          ammo_id: record.ammunition_id,
          rounds: deerRounds,
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
        if (user.role !== 'admin' && ammoEntry.created_by !== user.email) {
          return Response.json({ error: 'Forbidden: ammunition does not belong to you' }, { status: 403 });
        }

        const reusedWarning = ammoEntry.source_type === 'reload_batch'
          ? await getReusedBrassStockRestoreWarning(base44, ammoEntry, sessionId, user.email)
          : null;

        if (reusedWarning) {
          await logSkippedAmmoStockRestore(base44, { ammo: ammoEntry, recordId: sessionId, quantity: ammo.rounds, warning: reusedWarning });
          refundSummary.ammunition_refunded[ammo.ammo_id] = {
            before: ammoEntry.quantity_in_stock,
            refunded: 0,
            after: ammoEntry.quantity_in_stock,
            skipped: true,
            warning: 'Used brass was not restored because it was already recovered/reused in a later reload batch.',
          };
          console.warn(`[DELETE REFUND] Used brass restore skipped for ammo ${ammo.ammo_id}`);
          continue;
        }

        const newStock = (ammoEntry.quantity_in_stock || 0) + ammo.rounds;
        await base44.asServiceRole.entities.Ammunition.update(ammo.ammo_id, {
          quantity_in_stock: newStock,
        });
        const brassResult = ammoEntry.source_type === 'reload_batch'
          ? await restoreFiredBrassToLoadedForRecord(base44, ammoEntry, ammo.rounds, sessionId, user.email)
          : { restored: 0 };

        refundSummary.ammunition_refunded[ammo.ammo_id] = {
          before: ammoEntry.quantity_in_stock,
          refunded: ammo.rounds,
          after: newStock,
          brass_restored: brassResult.restored || 0,
        };

        console.log(`[DELETE REFUND] Ammo ${ammo.ammo_id}: ${ammoEntry.quantity_in_stock} → +${ammo.rounds} → ${newStock}, brass restored ${brassResult.restored || 0}`);
      } catch (err) {
        console.error(`[DELETE REFUND] Error refunding ammo ${ammo.ammo_id}:`, err.message);
        refundSummary.error = `Failed to refund ammunition ${ammo.ammo_id}`;
        return Response.json(refundSummary, { status: 400 });
      }
    }

    // STEP 4: Delete AmmoSpending entries for this record
    try {
      const spending = await base44.asServiceRole.entities.AmmoSpending.filter({
        created_by: ownerEmail,
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
              if (user.role !== 'admin' && rifleEntry.created_by !== user.email) {
                return Response.json({ error: 'Forbidden: rifle does not belong to you' }, { status: 403 });
              }
              const newTotal = Math.max(0, (rifleEntry.total_rounds_fired || 0) - parseInt(rifle.rounds_fired));
              await base44.asServiceRole.entities.Rifle.update(rifle.rifle_id, {
                total_rounds_fired: newTotal,
                rounds_at_last_cleaning: Math.min(rifleEntry.rounds_at_last_cleaning || 0, newTotal),
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
          if (user.role !== 'admin' && shotgunEntry.created_by !== user.email) {
            return Response.json({ error: 'Forbidden: shotgun does not belong to you' }, { status: 403 });
          }
          const newTotal = Math.max(0, (shotgunEntry.total_cartridges_fired || 0) - parseInt(record.rounds_fired));
          await base44.asServiceRole.entities.Shotgun.update(record.shotgun_id, {
            total_cartridges_fired: newTotal,
            cartridges_at_last_cleaning: Math.min(shotgunEntry.cartridges_at_last_cleaning || 0, newTotal),
          });
          refundSummary.firearm_reversal = `Shotgun: ${newTotal} cartridges`;
          console.log(`[DELETE REFUND] Shotgun ${record.shotgun_id}: total_cartridges_fired reversed to ${newTotal}`);
        }
      } catch (err) {
        console.warn(`[DELETE REFUND] Error updating shotgun ${record.shotgun_id}:`, err.message);
      }
    } else if (record.category === 'deer_management' && record.rifle_id) {
      try {
        const deerRounds = parseInt(record.rounds_fired || record.total_count || record.number_shot || 0) || 0;
        if (deerRounds > 0) {
          const rifleEntry = await base44.asServiceRole.entities.Rifle.get(record.rifle_id);
          if (rifleEntry) {
            if (user.role !== 'admin' && rifleEntry.created_by !== user.email) {
              return Response.json({ error: 'Forbidden: rifle does not belong to you' }, { status: 403 });
            }
            const newTotal = Math.max(0, (rifleEntry.total_rounds_fired || 0) - deerRounds);
            await base44.asServiceRole.entities.Rifle.update(record.rifle_id, {
              total_rounds_fired: newTotal,
              rounds_at_last_cleaning: Math.min(rifleEntry.rounds_at_last_cleaning || 0, newTotal),
            });
            refundSummary.firearm_reversal = `Rifle: ${newTotal} rounds`;
            console.log(`[DELETE REFUND] Rifle ${record.rifle_id}: total_rounds reversed by ${deerRounds} to ${newTotal}`);
          }
        }
      } catch (err) {
        console.warn(`[DELETE REFUND] Error updating rifle ${record.rifle_id}:`, err.message);
        refundSummary.error = `Failed to reverse rifle counter ${record.rifle_id}`;
        return Response.json(refundSummary, { status: 400 });
      }
    }

    // STEP 6: Soft-delete SessionRecord after restore succeeds
    console.log(`[DELETE REFUND] Soft-deleting SessionRecord ${sessionId}`);
    const now = new Date().toISOString();
    await base44.asServiceRole.entities.SessionRecord.update(sessionId, {
      isDeleted: true,
      deletedAt: now,
      status: 'deleted',
      ammoRefunded: true,
      ammoRefundedAt: now,
      armoryCountersReversed: true,
      countersReversedAt: now,
    });

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