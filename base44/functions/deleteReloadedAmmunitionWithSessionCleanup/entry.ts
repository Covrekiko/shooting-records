import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const unitConversions = { grams: 1, kg: 1000, oz: 28.3495, lb: 453.592, grains: 0.06479891 };
const num = (value) => Number(value || 0);
const hasValue = (value) => value !== undefined && value !== null;

function isReloadedAmmunition(ammo = {}) {
  return ammo.ammo_type === 'reloaded'
    || ammo.source_type === 'reload_batch'
    || Boolean(ammo.reload_session_id || ammo.source_id || ammo.reload_batch_id);
}

function isDeletedSession(session = {}) {
  return session.isDeleted === true || session.is_deleted === true || session.archived === true || session.status === 'deleted' || session.reload_session_deleted === true;
}

function ammoLinksToSession(ammo, session) {
  if (!ammo || !session) return false;
  const ids = [ammo.reload_session_id, ammo.reload_batch_id, ammo.source_id].filter(Boolean);
  return ids.includes(session.id) || ammo.notes?.includes(`reload_batch:${session.id}`) || (ammo.batch_number && session.batch_number && ammo.batch_number === session.batch_number);
}

function getBrassState(brass) {
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
}

function stateUpdate(state) {
  return {
    total_owned: num(state.total_owned),
    quantity_total: num(state.total_owned),
    available_new_unloaded: Math.max(0, num(state.available_new_unloaded)),
    available_used_recovered: Math.max(0, num(state.available_used_recovered)),
    available_to_reload: Math.max(0, num(state.available_new_unloaded)) + Math.max(0, num(state.available_used_recovered)),
    quantity_remaining: Math.max(0, num(state.available_new_unloaded)) + Math.max(0, num(state.available_used_recovered)),
    currently_loaded_new: Math.max(0, num(state.currently_loaded_new)),
    currently_loaded_used: Math.max(0, num(state.currently_loaded_used)),
    currently_loaded: Math.max(0, num(state.currently_loaded_new)) + Math.max(0, num(state.currently_loaded_used)),
    fired_new_awaiting_cleaning_or_inspection: Math.max(0, num(state.fired_new_awaiting_cleaning_or_inspection)),
    fired_used_awaiting_cleaning_or_inspection: Math.max(0, num(state.fired_used_awaiting_cleaning_or_inspection)),
    fired_awaiting_cleaning_or_inspection: Math.max(0, num(state.fired_new_awaiting_cleaning_or_inspection)) + Math.max(0, num(state.fired_used_awaiting_cleaning_or_inspection)),
    retired_or_discarded: Math.max(0, num(state.retired_or_discarded)),
    first_use_cost_remaining_quantity: Math.max(0, num(state.first_use_cost_remaining_quantity)),
    cost_consumed_quantity: Math.max(0, num(state.cost_consumed_quantity)),
    reload_cycle_count: num(state.reload_cycle_count),
    times_reloaded: num(state.reload_cycle_count),
    lifetime_reload_count: num(state.lifetime_reload_count),
    reload_limit: num(state.reload_limit),
    max_reloads: num(state.reload_limit),
    anneal_count: num(state.anneal_count),
    last_annealed_date: state.last_annealed_date || '',
  };
}

function assertOwned(record, user, label) {
  if (!record) throw new Error(`${label} not found.`);
  if (user.role !== 'admin' && record.created_by !== user.email) {
    throw new Error(`Forbidden: ${label} does not belong to you.`);
  }
}

async function findLinkedSession(base44, ammo, reloadSessionId, user) {
  if (reloadSessionId) {
    const session = await base44.asServiceRole.entities.ReloadingSession.get(reloadSessionId);
    assertOwned(session, user, 'Reloading session');
    return session;
  }

  const directId = ammo?.reload_session_id || ammo?.reload_batch_id || ammo?.source_id;
  if (directId) {
    const direct = await base44.asServiceRole.entities.ReloadingSession.get(directId).catch(() => null);
    if (direct) {
      assertOwned(direct, user, 'Reloading session');
      return direct;
    }
  }

  const sessions = await base44.asServiceRole.entities.ReloadingSession.filter({ created_by: user.email });
  return sessions.find((session) => ammoLinksToSession(ammo, session)) || null;
}

async function findLinkedAmmo(base44, session, ammunitionId, user) {
  if (ammunitionId) {
    const ammo = await base44.asServiceRole.entities.Ammunition.get(ammunitionId);
    assertOwned(ammo, user, 'Ammunition');
    return ammo;
  }

  if (!session) return null;
  const ammoList = await base44.asServiceRole.entities.Ammunition.filter({ created_by: user.email });
  return ammoList.find((ammo) => ammoLinksToSession(ammo, session)) || null;
}

async function hasHistoricalReferences(base44, ammunitionId, user) {
  const records = await base44.asServiceRole.entities.SessionRecord.filter({ created_by: user.email });
  return records.some((record) => record.ammunition_id === ammunitionId || (Array.isArray(record.rifles_used) && record.rifles_used.some((rifle) => rifle.ammunition_id === ammunitionId)));
}

async function restoreComponents(base44, session, ammo, roundsRemaining, restoreRatio, user, restored) {
  if (!session?.components?.length || roundsRemaining <= 0) return;
  const allComponents = await base44.asServiceRole.entities.ReloadingComponent.filter({ created_by: session.created_by || user.email });

  for (const comp of session.components) {
    const normalizedType = comp.type?.toLowerCase()?.replace(/^primers?$/, 'primer') || '';
    const component = comp.component_id
      ? allComponents.find((item) => item.id === comp.component_id)
      : allComponents.find((item) => item.component_type === normalizedType && item.name === comp.name);

    if (!component) {
      restored.warnings.push(`Component not found for ${normalizedType || comp.type || 'unknown'}: ${comp.name || comp.component_id || 'unknown'}`);
      continue;
    }
    assertOwned(component, user, 'Reloading component');

    if (normalizedType === 'powder') {
      const restoreAmount = num(comp.quantity_used) * restoreRatio;
      const usedInGrams = restoreAmount * (unitConversions[comp.unit] || 1);
      const restoredInComponentUnit = usedInGrams / (unitConversions[component.unit] || 1);
      const quantity_remaining = num(component.quantity_remaining) + restoredInComponentUnit;
      await base44.asServiceRole.entities.ReloadingComponent.update(component.id, { quantity_remaining });
      restored.components.push({ type: 'powder', id: component.id, restored: restoredInComponentUnit });
    } else if (normalizedType === 'brass') {
      const previousState = getBrassState(component);
      const qty = Math.min(roundsRemaining, num(comp.quantity_used), previousState.currently_loaded);
      const newQty = Math.min(qty, num(comp.brass_new_quantity_used || (comp.brass_use_type === 'new' ? comp.quantity_used : 0)), previousState.currently_loaded_new);
      const usedQty = Math.min(qty - newQty, num(comp.brass_used_quantity_used || (comp.brass_use_type === 'used' ? comp.quantity_used : 0)), previousState.currently_loaded_used);
      const newState = {
        ...previousState,
        currently_loaded_new: Math.max(0, previousState.currently_loaded_new - newQty),
        currently_loaded_used: Math.max(0, previousState.currently_loaded_used - usedQty),
        available_new_unloaded: previousState.available_new_unloaded + newQty,
        available_used_recovered: previousState.available_used_recovered + usedQty,
        first_use_cost_remaining_quantity: previousState.first_use_cost_remaining_quantity + newQty,
        cost_consumed_quantity: Math.max(0, previousState.cost_consumed_quantity - newQty),
        reload_cycle_count: Math.max(0, previousState.reload_cycle_count - (qty > 0 ? 1 : 0)),
      };
      await base44.asServiceRole.entities.ReloadingComponent.update(component.id, stateUpdate(newState));
      await base44.asServiceRole.entities.BrassMovementLog.create({
        created_by: user.email,
        brass_id: component.id,
        reload_batch_id: session.id,
        ammunition_id: ammo?.id || '',
        quantity: qty,
        movement_type: 'restored_after_batch_delete',
        previous_state: previousState,
        new_state: newState,
        movement_date: new Date().toISOString(),
        notes: `Deleted reload batch ${session.batch_number || session.id}`,
      });
      restored.components.push({ type: 'brass', id: component.id, restored: qty });
    } else {
      const restoreAmount = num(comp.quantity_used) * restoreRatio;
      const quantity_remaining = num(component.quantity_remaining) + restoreAmount;
      await base44.asServiceRole.entities.ReloadingComponent.update(component.id, { quantity_remaining });
      restored.components.push({ type: normalizedType, id: component.id, restored: restoreAmount });
    }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ammunitionId = null, reloadSessionId = null } = await req.json();
    const restored = { success: false, warnings: [], components: [], rounds_remaining_restored: 0, ammunition_archived: false, session_marked_deleted: false };

    const ammo = await findLinkedAmmo(base44, null, ammunitionId, user).catch(() => null);
    if (ammunitionId && !ammo) throw new Error('Ammunition could not be found.');
    if (ammo && !isReloadedAmmunition(ammo)) throw new Error('This ammunition is not linked to a reload batch.');

    const session = await findLinkedSession(base44, ammo, reloadSessionId, user);
    if (reloadSessionId && !session) throw new Error('Reloading session could not be found.');
    if (session) assertOwned(session, user, 'Reloading session');

    const matchedAmmo = ammo || await findLinkedAmmo(base44, session, null, user).catch(() => null);
    if (matchedAmmo) assertOwned(matchedAmmo, user, 'Ammunition');

    if (session && isDeletedSession(session)) {
      if (matchedAmmo) {
        await base44.asServiceRole.entities.Ammunition.update(matchedAmmo.id, {
          archived: true,
          is_deleted: true,
          status: 'deleted',
          deletedAt: new Date().toISOString(),
          reload_session_deleted: true,
          quantity_in_stock: 0,
        });
        restored.ammunition_archived = true;
      }
      return Response.json({ ...restored, success: true, skipped: true, warnings: ['Reloading session was already deleted/restored.'] });
    }

    const roundsRemaining = Math.max(0, num(matchedAmmo?.quantity_in_stock));
    const roundsProduced = Math.max(1, num(session?.rounds_loaded));
    const restoreRatio = Math.min(1, roundsRemaining / roundsProduced);

    if (session && roundsRemaining > 0) {
      await restoreComponents(base44, session, matchedAmmo, roundsRemaining, restoreRatio, user, restored);
    }

    if (matchedAmmo?.id) {
      const referenced = await hasHistoricalReferences(base44, matchedAmmo.id, user);
      if (referenced) {
        await base44.asServiceRole.entities.Ammunition.update(matchedAmmo.id, {
          archived: true,
          is_deleted: true,
          status: 'deleted',
          deletedAt: new Date().toISOString(),
          reload_session_deleted: true,
          quantity_in_stock: 0,
          linked_reload_session_id: session?.id || matchedAmmo.reload_session_id || matchedAmmo.source_id || '',
        });
        restored.ammunition_archived = true;
      } else {
        await base44.asServiceRole.entities.Ammunition.delete(matchedAmmo.id);
        restored.ammunition_deleted = true;
      }
      restored.ammunition_had_record_references = referenced;
    } else {
      restored.warnings.push('Linked reloaded ammunition could not be found.');
    }

    if (session?.id) {
      await base44.asServiceRole.entities.ReloadingSession.delete(session.id);
      restored.session_deleted = true;
      restored.session_marked_deleted = true;
    }

    return Response.json({ ...restored, success: true, reloadSessionId: session?.id || null, ammunitionId: matchedAmmo?.id || null, rounds_remaining_restored: roundsRemaining });
  } catch (error) {
    console.error('[deleteReloadedAmmunitionWithSessionCleanup] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});