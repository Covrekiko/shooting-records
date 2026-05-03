import { base44 } from '@/api/base44Client';

const num = (value) => Number(value || 0);
const hasValue = (value) => value !== undefined && value !== null;

export const getBrassState = (brass) => {
  const totalOwned = num(brass.total_owned ?? brass.quantity_total);
  const legacyAvailable = num(brass.available_to_reload ?? brass.quantity_remaining);
  const isLegacySplitMissing = !hasValue(brass.available_new_unloaded) && !hasValue(brass.available_used_recovered);
  const addedAsUsed = brass.is_used_brass === true;

  const available_new_unloaded = isLegacySplitMissing
    ? (addedAsUsed ? 0 : legacyAvailable)
    : num(brass.available_new_unloaded);
  const available_used_recovered = isLegacySplitMissing
    ? (addedAsUsed ? legacyAvailable : 0)
    : num(brass.available_used_recovered);

  const currently_loaded_new = hasValue(brass.currently_loaded_new)
    ? num(brass.currently_loaded_new)
    : (addedAsUsed ? 0 : num(brass.currently_loaded));
  const currently_loaded_used = hasValue(brass.currently_loaded_used)
    ? num(brass.currently_loaded_used)
    : (addedAsUsed ? num(brass.currently_loaded) : 0);

  const fired_new_awaiting_cleaning_or_inspection = hasValue(brass.fired_new_awaiting_cleaning_or_inspection)
    ? num(brass.fired_new_awaiting_cleaning_or_inspection)
    : (addedAsUsed ? 0 : num(brass.fired_awaiting_cleaning_or_inspection));
  const fired_used_awaiting_cleaning_or_inspection = hasValue(brass.fired_used_awaiting_cleaning_or_inspection)
    ? num(brass.fired_used_awaiting_cleaning_or_inspection)
    : (addedAsUsed ? num(brass.fired_awaiting_cleaning_or_inspection) : 0);

  const cost_consumed_quantity = hasValue(brass.cost_consumed_quantity)
    ? num(brass.cost_consumed_quantity)
    : (addedAsUsed ? 0 : Math.max(0, totalOwned - available_new_unloaded));
  const first_use_cost_remaining_quantity = hasValue(brass.first_use_cost_remaining_quantity)
    ? num(brass.first_use_cost_remaining_quantity)
    : (addedAsUsed ? 0 : available_new_unloaded);

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

export const brassStateTotal = (state) =>
  num(state.available_new_unloaded) +
  num(state.available_used_recovered) +
  num(state.currently_loaded_new) +
  num(state.currently_loaded_used) +
  num(state.fired_new_awaiting_cleaning_or_inspection) +
  num(state.fired_used_awaiting_cleaning_or_inspection) +
  num(state.retired_or_discarded);

export const exceedsBrassTotal = (state) => brassStateTotal(state) > num(state.total_owned);

export const normalizeBrassState = (state) => {
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

export const stateUpdate = (state) => {
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

export async function logBrassMovement({ brassId, reloadBatchId, recordId, ammunitionId, quantity, movementType, previousState, newState, notes }) {
  await base44.entities.BrassMovementLog.create({
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

async function getReloadSessionForAmmo(ammo) {
  const sessionId = ammo.reload_session_id || ammo.source_id;
  if (!sessionId || ammo.source_type !== 'reload_batch') return null;
  return await base44.entities.ReloadingSession.get(sessionId);
}

export async function moveLoadedAmmoToFiredBrass(ammo, quantity, recordId, sessionType) {
  const session = await getReloadSessionForAmmo(ammo);
  const brassId = ammo.brass_component_id || session?.brass_component_id || session?.components?.find(c => c.type === 'brass')?.component_id;
  if (!brassId) return;

  const brass = await base44.entities.ReloadingComponent.get(brassId);
  const previousState = getBrassState(brass);
  const qty = Math.min(parseInt(quantity) || 0, previousState.currently_loaded || parseInt(quantity) || 0);
  if (qty <= 0) return;

  const brassComponent = session?.components?.find(c => c.type === 'brass');
  const useType = ammo.brass_use_type || session?.brass_use_type || brassComponent?.brass_use_type || 'used';
  let newFired = 0;
  let usedFired = 0;

  if (useType === 'mixed') {
    const batchNew = num(ammo.brass_new_quantity_used ?? session?.brass_new_quantity_used ?? brassComponent?.brass_new_quantity_used);
    const batchUsed = num(ammo.brass_used_quantity_used ?? session?.brass_used_quantity_used ?? brassComponent?.brass_used_quantity_used);
    const totalBatchBrass = Math.max(1, batchNew + batchUsed);
    newFired = Math.min(qty, previousState.currently_loaded_new, Math.round(qty * (batchNew / totalBatchBrass)));
    usedFired = Math.min(qty - newFired, previousState.currently_loaded_used);
    const remaining = qty - newFired - usedFired;
    if (remaining > 0) {
      const extraNew = Math.min(remaining, previousState.currently_loaded_new - newFired);
      newFired += extraNew;
      usedFired += Math.min(remaining - extraNew, previousState.currently_loaded_used - usedFired);
    }
  } else if (useType === 'new') {
    newFired = Math.min(qty, previousState.currently_loaded_new);
    usedFired = Math.min(qty - newFired, previousState.currently_loaded_used);
  } else {
    usedFired = Math.min(qty, previousState.currently_loaded_used);
    newFired = Math.min(qty - usedFired, previousState.currently_loaded_new);
  }

  const newState = {
    ...previousState,
    currently_loaded_new: Math.max(0, previousState.currently_loaded_new - newFired),
    currently_loaded_used: Math.max(0, previousState.currently_loaded_used - usedFired),
    fired_new_awaiting_cleaning_or_inspection: previousState.fired_new_awaiting_cleaning_or_inspection + newFired,
    fired_used_awaiting_cleaning_or_inspection: previousState.fired_used_awaiting_cleaning_or_inspection + usedFired,
  };

  await base44.entities.ReloadingComponent.update(brassId, {
    ...stateUpdate(newState),
    times_fired: num(brass.times_fired) + qty,
  });

  await logBrassMovement({
    brassId,
    reloadBatchId: session?.id || ammo.reload_session_id || ammo.source_id,
    recordId,
    ammunitionId: ammo.id,
    quantity: qty,
    movementType: 'fired_from_loaded_ammo',
    previousState,
    newState,
    notes: `${sessionType || ''}${useType ? ` • ${useType} brass` : ''}`.trim(),
  });
}

export async function getReusedBrassStockRestoreWarning(ammo, recordId) {
  const user = await base44.auth.me();
  const firedLogs = await base44.entities.BrassMovementLog.filter({ created_by: user.email, record_id: recordId, ammunition_id: ammo.id, movement_type: 'fired_from_loaded_ammo' });

  for (const firedLog of firedLogs) {
    const brassLogs = await base44.entities.BrassMovementLog.filter({ created_by: user.email, brass_id: firedLog.brass_id });
    const orderedLogs = brassLogs
      .filter(log => log.movement_date)
      .sort((a, b) => new Date(a.movement_date) - new Date(b.movement_date));

    const firedTime = new Date(firedLog.movement_date).getTime();
    const recoveredLog = orderedLogs.find(log =>
      log.movement_type === 'recovered_after_firing' &&
      new Date(log.movement_date).getTime() > firedTime
    );

    if (!recoveredLog) continue;

    const recoveredTime = new Date(recoveredLog.movement_date).getTime();
    const reusedLog = orderedLogs.find(log =>
      log.movement_type === 'used_in_reload_batch' &&
      log.reload_batch_id !== firedLog.reload_batch_id &&
      new Date(log.movement_date).getTime() > recoveredTime
    );

    if (reusedLog) {
      return { firedLog, recoveredLog, reusedLog, brassId: firedLog.brass_id };
    }
  }

  return null;
}

export async function logSkippedAmmoStockRestore({ ammo, recordId, quantity, warning }) {
  const brassId = warning?.brassId || ammo.brass_component_id;
  if (!brassId) return;
  const brass = await base44.entities.ReloadingComponent.get(brassId);
  const state = getBrassState(brass);
  await logBrassMovement({
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

export async function restoreFiredBrassToLoadedForRecord(ammo, quantity, recordId) {
  const user = await base44.auth.me();
  const existingRestores = await base44.entities.BrassMovementLog.filter({ created_by: user.email, record_id: recordId, movement_type: 'restored_after_record_delete' });
  if (existingRestores.some(log => log.ammunition_id === ammo.id)) return;

  const firedLogs = await base44.entities.BrassMovementLog.filter({ created_by: user.email, record_id: recordId, movement_type: 'fired_from_loaded_ammo' });
  const log = firedLogs.find(item => item.ammunition_id === ammo.id);
  const session = await getReloadSessionForAmmo(ammo);
  const sessionBrass = session?.components?.find(c => c.type?.toLowerCase() === 'brass');
  const brassId = log?.brass_id || ammo.brass_component_id || session?.brass_component_id || sessionBrass?.component_id;
  if (!brassId) return;

  const brass = await base44.entities.ReloadingComponent.get(brassId);
  const previousState = getBrassState(brass);
  const qty = Math.min(parseInt(quantity) || log?.quantity || 0, previousState.fired_awaiting_cleaning_or_inspection);
  if (qty <= 0) return;

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

  await base44.entities.ReloadingComponent.update(brassId, stateUpdate(newState));
  await logBrassMovement({
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
}

export async function recoverFiredBrass(brass, quantity) {
  const previousState = getBrassState(brass);
  let qty = Math.min(parseInt(quantity) || previousState.fired_awaiting_cleaning_or_inspection, previousState.fired_awaiting_cleaning_or_inspection);
  if (qty <= 0) return;

  const newRecovered = Math.min(qty, previousState.fired_new_awaiting_cleaning_or_inspection);
  qty -= newRecovered;
  const usedRecovered = Math.min(qty, previousState.fired_used_awaiting_cleaning_or_inspection);
  const recoveredQty = newRecovered + usedRecovered;

  const newState = {
    ...previousState,
    fired_new_awaiting_cleaning_or_inspection: previousState.fired_new_awaiting_cleaning_or_inspection - newRecovered,
    fired_used_awaiting_cleaning_or_inspection: previousState.fired_used_awaiting_cleaning_or_inspection - usedRecovered,
    available_used_recovered: previousState.available_used_recovered + recoveredQty,
  };
  await base44.entities.ReloadingComponent.update(brass.id, stateUpdate(newState));
  await logBrassMovement({ brassId: brass.id, quantity: recoveredQty, movementType: 'recovered_after_firing', previousState, newState, notes: 'Recovered brass is now used/recovered stock' });
}

export async function annealBrass(brass, resetCycle) {
  const previousState = getBrassState(brass);
  const newState = {
    ...previousState,
    anneal_count: previousState.anneal_count + 1,
    last_annealed_date: new Date().toISOString().slice(0, 10),
    reload_cycle_count: resetCycle ? 0 : previousState.reload_cycle_count,
  };
  await base44.entities.ReloadingComponent.update(brass.id, stateUpdate(newState));
  await logBrassMovement({ brassId: brass.id, quantity: previousState.total_owned, movementType: 'annealed', previousState, newState, notes: resetCycle ? 'Reload cycle reset after annealing' : 'Annealing logged' });
}

export async function retireBrass(brass, quantity) {
  const previousState = getBrassState(brass);
  let qty = Math.min(parseInt(quantity) || 0, previousState.total_owned - previousState.retired_or_discarded);
  if (qty <= 0) return;

  const availableUsedReduction = Math.min(previousState.available_used_recovered, qty);
  qty -= availableUsedReduction;
  const availableNewReduction = Math.min(previousState.available_new_unloaded, qty);
  qty -= availableNewReduction;
  const firedUsedReduction = Math.min(previousState.fired_used_awaiting_cleaning_or_inspection, qty);
  qty -= firedUsedReduction;
  const firedNewReduction = Math.min(previousState.fired_new_awaiting_cleaning_or_inspection, qty);
  qty -= firedNewReduction;
  const loadedUsedReduction = Math.min(previousState.currently_loaded_used, qty);
  qty -= loadedUsedReduction;
  const loadedNewReduction = Math.min(previousState.currently_loaded_new, qty);
  const retiredQty = availableUsedReduction + availableNewReduction + firedUsedReduction + firedNewReduction + loadedUsedReduction + loadedNewReduction;

  const newState = {
    ...previousState,
    available_used_recovered: previousState.available_used_recovered - availableUsedReduction,
    available_new_unloaded: previousState.available_new_unloaded - availableNewReduction,
    fired_used_awaiting_cleaning_or_inspection: previousState.fired_used_awaiting_cleaning_or_inspection - firedUsedReduction,
    fired_new_awaiting_cleaning_or_inspection: previousState.fired_new_awaiting_cleaning_or_inspection - firedNewReduction,
    currently_loaded_used: previousState.currently_loaded_used - loadedUsedReduction,
    currently_loaded_new: previousState.currently_loaded_new - loadedNewReduction,
    retired_or_discarded: previousState.retired_or_discarded + retiredQty,
    first_use_cost_remaining_quantity: Math.max(0, previousState.first_use_cost_remaining_quantity - availableNewReduction),
  };
  await base44.entities.ReloadingComponent.update(brass.id, stateUpdate(newState));
  await logBrassMovement({ brassId: brass.id, quantity: retiredQty, movementType: 'retired', previousState, newState });
}