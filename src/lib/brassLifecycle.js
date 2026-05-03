import { base44 } from '@/api/base44Client';

const num = (value) => Number(value || 0);

export const getBrassState = (brass) => ({
  total_owned: num(brass.total_owned ?? brass.quantity_total),
  available_to_reload: num(brass.available_to_reload ?? brass.quantity_remaining),
  currently_loaded: num(brass.currently_loaded),
  fired_awaiting_cleaning_or_inspection: num(brass.fired_awaiting_cleaning_or_inspection),
  retired_or_discarded: num(brass.retired_or_discarded),
  reload_cycle_count: num(brass.reload_cycle_count ?? brass.times_reloaded),
  lifetime_reload_count: num(brass.lifetime_reload_count),
  reload_limit: num(brass.reload_limit ?? brass.max_reloads),
  anneal_count: num(brass.anneal_count),
  last_annealed_date: brass.last_annealed_date || '',
});

export const brassStateTotal = (state) =>
  num(state.available_to_reload) +
  num(state.currently_loaded) +
  num(state.fired_awaiting_cleaning_or_inspection) +
  num(state.retired_or_discarded);

export const exceedsBrassTotal = (state) => brassStateTotal(state) > num(state.total_owned);

export const normalizeBrassState = (state) => {
  const normalized = {
    ...state,
    total_owned: num(state.total_owned),
    available_to_reload: Math.max(0, num(state.available_to_reload)),
    currently_loaded: Math.max(0, num(state.currently_loaded)),
    fired_awaiting_cleaning_or_inspection: Math.max(0, num(state.fired_awaiting_cleaning_or_inspection)),
    retired_or_discarded: Math.max(0, num(state.retired_or_discarded)),
  };

  let overflow = brassStateTotal(normalized) - normalized.total_owned;
  if (overflow > 0) {
    const availableReduction = Math.min(normalized.available_to_reload, overflow);
    normalized.available_to_reload -= availableReduction;
    overflow -= availableReduction;
  }
  if (overflow > 0) {
    const firedReduction = Math.min(normalized.fired_awaiting_cleaning_or_inspection, overflow);
    normalized.fired_awaiting_cleaning_or_inspection -= firedReduction;
    overflow -= firedReduction;
  }
  if (overflow > 0) {
    const loadedReduction = Math.min(normalized.currently_loaded, overflow);
    normalized.currently_loaded -= loadedReduction;
  }

  return normalized;
};

export const stateUpdate = (state) => {
  const normalized = normalizeBrassState(state);
  return {
    total_owned: normalized.total_owned,
    quantity_total: normalized.total_owned,
    available_to_reload: normalized.available_to_reload,
    quantity_remaining: normalized.available_to_reload,
    currently_loaded: normalized.currently_loaded,
    fired_awaiting_cleaning_or_inspection: normalized.fired_awaiting_cleaning_or_inspection,
    retired_or_discarded: normalized.retired_or_discarded,
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

  const newState = {
    ...previousState,
    currently_loaded: Math.max(0, previousState.currently_loaded - qty),
    fired_awaiting_cleaning_or_inspection: previousState.fired_awaiting_cleaning_or_inspection + qty,
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
    notes: sessionType || '',
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
    notes: 'Ammo stock was not restored because the fired brass from this record was already recovered and reused in a later reload batch.',
  });
}

export async function restoreFiredBrassToLoadedForRecord(ammo, quantity, recordId) {
  const user = await base44.auth.me();
  const existingRestores = await base44.entities.BrassMovementLog.filter({ created_by: user.email, record_id: recordId, movement_type: 'restored_after_record_delete' });
  if (existingRestores.some(log => log.ammunition_id === ammo.id)) return;

  const firedLogs = await base44.entities.BrassMovementLog.filter({ created_by: user.email, record_id: recordId, movement_type: 'fired_from_loaded_ammo' });
  const log = firedLogs.find(item => item.ammunition_id === ammo.id);
  const brassId = log?.brass_id || ammo.brass_component_id;
  if (!brassId) return;

  const brass = await base44.entities.ReloadingComponent.get(brassId);
  const previousState = getBrassState(brass);
  const qty = Math.min(parseInt(quantity) || log?.quantity || 0, previousState.fired_awaiting_cleaning_or_inspection);
  if (qty <= 0) return;

  const newState = {
    ...previousState,
    fired_awaiting_cleaning_or_inspection: Math.max(0, previousState.fired_awaiting_cleaning_or_inspection - qty),
    currently_loaded: previousState.currently_loaded + qty,
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
  const qty = Math.min(parseInt(quantity) || previousState.fired_awaiting_cleaning_or_inspection, previousState.fired_awaiting_cleaning_or_inspection);
  if (qty <= 0) return;
  const newState = {
    ...previousState,
    fired_awaiting_cleaning_or_inspection: previousState.fired_awaiting_cleaning_or_inspection - qty,
    available_to_reload: previousState.available_to_reload + qty,
  };
  await base44.entities.ReloadingComponent.update(brass.id, stateUpdate(newState));
  await logBrassMovement({ brassId: brass.id, quantity: qty, movementType: 'recovered_after_firing', previousState, newState });
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
  const availableReduction = Math.min(previousState.available_to_reload, qty);
  qty -= availableReduction;
  const firedReduction = Math.min(previousState.fired_awaiting_cleaning_or_inspection, qty);
  qty -= firedReduction;
  const loadedReduction = Math.min(previousState.currently_loaded, qty);
  const retiredQty = availableReduction + firedReduction + loadedReduction;
  const newState = {
    ...previousState,
    available_to_reload: previousState.available_to_reload - availableReduction,
    fired_awaiting_cleaning_or_inspection: previousState.fired_awaiting_cleaning_or_inspection - firedReduction,
    currently_loaded: previousState.currently_loaded - loadedReduction,
    retired_or_discarded: previousState.retired_or_discarded + retiredQty,
  };
  await base44.entities.ReloadingComponent.update(brass.id, stateUpdate(newState));
  await logBrassMovement({ brassId: brass.id, quantity: retiredQty, movementType: 'retired', previousState, newState });
}