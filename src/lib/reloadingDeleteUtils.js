import { base44 } from '@/api/base44Client';
import { getBrassState, logBrassMovement, stateUpdate, exceedsBrassTotal } from '@/lib/brassLifecycle';

const unitConversions = { grams: 1, kg: 1000, oz: 28.3495, lb: 453.592, grains: 0.06479891 };
const num = (value) => Number(value || 0);

export function isReloadedAmmunition(ammo = {}) {
  return ammo.ammo_type === 'reloaded'
    || ammo.type === 'reloaded'
    || ammo.source === 'reloaded'
    || ammo.source_type === 'reload_batch'
    || Boolean(ammo.reload_session_id || ammo.reload_batch_id || ammo.source_id);
}

function isDeletedSession(session = {}) {
  return session.isDeleted === true
    || session.is_deleted === true
    || session.archived === true
    || session.status === 'deleted'
    || session.reload_session_deleted === true;
}

function ammoLinksToSession(ammo, session) {
  if (!ammo || !session) return false;
  const ids = [ammo.reload_session_id, ammo.reload_batch_id, ammo.source_id].filter(Boolean);
  return ids.includes(session.id)
    || ammo.notes?.includes(`reload_batch:${session.id}`)
    || (ammo.batch_number && session.batch_number && ammo.batch_number === session.batch_number);
}

async function findLinkedSession({ ammo, reloadSessionId, userEmail }) {
  if (reloadSessionId) {
    return await base44.entities.ReloadingSession.get(reloadSessionId);
  }

  const directId = ammo?.reload_session_id || ammo?.reload_batch_id || ammo?.source_id;
  if (directId) {
    const direct = await base44.entities.ReloadingSession.get(directId).catch(() => null);
    if (direct) return direct;
  }

  const sessions = await base44.entities.ReloadingSession.filter({ created_by: userEmail });
  return sessions.find((session) => ammoLinksToSession(ammo, session)) || null;
}

async function findLinkedAmmo({ session, ammunitionId, userEmail }) {
  if (ammunitionId) {
    return await base44.entities.Ammunition.get(ammunitionId);
  }

  const ammoList = await base44.entities.Ammunition.list('-updated_date', 500);
  return ammoList.find((ammo) => {
    if (ammo.created_by !== userEmail && !ammoLinksToSession(ammo, session)) return false;
    return ammoLinksToSession(ammo, session)
      || ammo.ammunition_id === session.id
      || ammo.notes?.includes(`reload_batch:${session.id}`);
  }) || null;
}

async function hasHistoricalReferences(ammunitionId) {
  const records = await base44.entities.SessionRecord.list('-updated_date', 500);
  return records.some((record) => {
    if (record.ammunition_id === ammunitionId) return true;
    if (Array.isArray(record.rifles_used) && record.rifles_used.some((rifle) => rifle.ammunition_id === ammunitionId)) return true;
    return false;
  });
}

async function archiveOrDeleteAmmo(ammo, session, restored) {
  if (!ammo?.id) return;
  const referenced = await hasHistoricalReferences(ammo.id);
  const archiveData = {
    archived: true,
    is_deleted: true,
    status: 'deleted',
    deletedAt: new Date().toISOString(),
    reload_session_deleted: true,
    linked_reload_session_id: session?.id || ammo.reload_session_id || ammo.source_id || '',
  };

  if (referenced) {
    await base44.entities.Ammunition.update(ammo.id, archiveData);
  } else {
    await base44.entities.Ammunition.update(ammo.id, { ...archiveData, quantity_in_stock: 0 });
  }

  restored.ammunition_archived = true;
  restored.ammunition_had_record_references = referenced;
}

async function restoreComponents({ session, ammo, roundsRemaining, restoreRatio, userEmail, restored }) {
  if (!session?.components?.length || roundsRemaining <= 0) return;

  const allComponents = await base44.entities.ReloadingComponent.filter({ created_by: userEmail });

  for (const comp of session.components) {
    const normalizedType = comp.type?.toLowerCase()?.replace(/^primers?$/, 'primer') || '';
    const component = comp.component_id
      ? allComponents.find((item) => item.id === comp.component_id)
      : allComponents.find((item) => item.component_type === normalizedType && item.name === comp.name);

    if (!component) {
      restored.warnings.push(`Component not found for ${normalizedType || comp.type || 'unknown'}: ${comp.name || comp.component_id || 'unknown'}`);
      continue;
    }

    if (normalizedType === 'powder') {
      const restoreAmount = num(comp.quantity_used) * restoreRatio;
      const usedInGrams = restoreAmount * (unitConversions[comp.unit] || 1);
      const restoredInComponentUnit = usedInGrams / (unitConversions[component.unit] || 1);
      const quantity_remaining = num(component.quantity_remaining) + restoredInComponentUnit;
      await base44.entities.ReloadingComponent.update(component.id, { quantity_remaining });
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
      const updateFields = stateUpdate(newState);
      await base44.entities.ReloadingComponent.update(component.id, updateFields);
      await logBrassMovement({
        brassId: component.id,
        reloadBatchId: session.id,
        ammunitionId: ammo?.id || '',
        quantity: qty,
        movementType: exceedsBrassTotal(newState) ? 'brass_inventory_invariant_clamped' : 'restored_after_batch_delete',
        previousState,
        newState: getBrassState(updateFields),
        notes: `Deleted reload batch ${session.batch_number || session.id}`,
      });
      restored.components.push({ type: 'brass', id: component.id, restored: qty });
    } else {
      const restoreAmount = num(comp.quantity_used) * restoreRatio;
      const quantity_remaining = num(component.quantity_remaining) + restoreAmount;
      await base44.entities.ReloadingComponent.update(component.id, { quantity_remaining });
      restored.components.push({ type: normalizedType, id: component.id, restored: restoreAmount });
    }
  }
}

export async function deleteReloadBatchWithRestore({ ammunitionId = null, reloadSessionId = null } = {}) {
  const user = await base44.auth.me();
  if (!user) throw new Error('You must be signed in to delete reload batches.');

  const restored = {
    success: false,
    warnings: [],
    components: [],
    rounds_remaining_restored: 0,
    ammunition_archived: false,
    session_marked_deleted: false,
  };

  const ammo = await findLinkedAmmo({ ammunitionId, userEmail: user.email }).catch(() => null);
  const session = await findLinkedSession({ ammo, reloadSessionId, userEmail: user.email });

  if (ammunitionId && ammo && !session) {
    throw new Error('Linked reload session could not be found. Ammunition was not deleted.');
  }
  if (reloadSessionId && !session) {
    throw new Error('Reloading session could not be found.');
  }

  if (session && isDeletedSession(session)) {
    if (ammo) await archiveOrDeleteAmmo(ammo, session, restored);
    return { ...restored, success: true, skipped: true, warnings: ['Reloading session was already deleted/restored.'] };
  }

  const matchedAmmo = ammo || await findLinkedAmmo({ session, userEmail: user.email }).catch(() => null);
  const roundsRemaining = Math.max(0, num(matchedAmmo?.quantity_in_stock));
  const roundsProduced = Math.max(1, num(session?.rounds_loaded));
  const restoreRatio = Math.min(1, roundsRemaining / roundsProduced);

  if (roundsRemaining > 0) {
    await restoreComponents({ session, ammo: matchedAmmo, roundsRemaining, restoreRatio, userEmail: user.email, restored });
  }

  if (matchedAmmo) {
    await archiveOrDeleteAmmo(matchedAmmo, session, restored);
  } else {
    restored.warnings.push('Linked reloaded ammunition could not be found.');
  }

  if (session?.id) {
    await base44.entities.ReloadingSession.update(session.id, {
      isDeleted: true,
      is_deleted: true,
      archived: true,
      status: 'deleted',
      reload_session_deleted: true,
      components_restored: true,
      restored_after_batch_delete: true,
      deletedAt: new Date().toISOString(),
      linked_ammunition_id: matchedAmmo?.id || '',
      rounds_remaining_restored: roundsRemaining,
    });
    restored.session_marked_deleted = true;
  }

  return {
    ...restored,
    success: true,
    reloadSessionId: session?.id || null,
    ammunitionId: matchedAmmo?.id || null,
    rounds_remaining_restored: roundsRemaining,
  };
}