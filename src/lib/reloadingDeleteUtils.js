import { base44 } from '@/api/base44Client';
import { getBrassState, logBrassMovement, stateUpdate } from '@/lib/brassLifecycle';

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const safeAdd = (current, amount) => Math.max(0, num(current) + num(amount));

const isReloadLinkedAmmo = (ammo) => (
  ammo?.source_type === 'reload_batch' ||
  ammo?.reload_session_id ||
  ammo?.source_id ||
  ammo?.reload_batch_id ||
  ammo?.notes?.includes?.('reload_batch:')
);

const parseReloadSessionIdFromNotes = (notes = '') => {
  const match = String(notes).match(/reload_batch:([^\s|]+)/);
  return match?.[1] || '';
};

async function getCurrentUser() {
  const user = await base44.auth.me();
  if (!user) throw new Error('Please sign in before deleting reload data.');
  return user;
}

async function getReloadSessionById(id) {
  if (!id) return null;
  try {
    return await base44.entities.ReloadingSession.get(id);
  } catch {
    return null;
  }
}

async function findReloadSessionForAmmo(ammo, user) {
  const directId = ammo?.reload_batch_id || ammo?.reload_session_id || ammo?.source_id || parseReloadSessionIdFromNotes(ammo?.notes);
  const direct = await getReloadSessionById(directId);
  if (direct) return direct;

  const sessions = await base44.entities.ReloadingSession.filter({ created_by: user.email });
  return sessions.find((session) => (
    session.id === directId ||
    (ammo?.batch_number && session.batch_number === ammo.batch_number) ||
    (ammo?.notes && session.batch_number && ammo.notes.includes(session.batch_number))
  )) || null;
}

async function findLinkedAmmoForSession(session, user) {
  const ammoList = await base44.entities.Ammunition.filter({ created_by: user.email });
  return ammoList.find((ammo) => ammo.source_id === session.id || ammo.reload_session_id === session.id || ammo.reload_batch_id === session.id)
    || ammoList.find((ammo) => ammo.notes?.includes?.(`reload_batch:${session.id}`))
    || ammoList.find((ammo) => ammo.brand === 'Reloaded' && ammo.caliber === session.caliber && ammo.notes?.includes?.(session.batch_number))
    || null;
}

async function hasAmmunitionReferences(ammunitionId, user) {
  if (!ammunitionId) return false;

  const [spending, records] = await Promise.all([
    base44.entities.AmmoSpending.filter({ created_by: user.email }),
    base44.entities.SessionRecord.filter({ created_by: user.email }),
  ]);

  const spendingReference = spending.some((entry) => entry.ammunition_id === ammunitionId || entry.ammo_id === ammunitionId);
  const recordReference = records.some((record) => (
    record.ammunition_id === ammunitionId ||
    record.ammo_id === ammunitionId ||
    record.ammunitionId === ammunitionId ||
    record.rifles_used?.some?.((rifle) => rifle.ammunition_id === ammunitionId || rifle.ammo_id === ammunitionId)
  ));

  return spendingReference || recordReference;
}

async function alreadyRestored(sessionId, session) {
  if (session?.components_restored === true || session?.reload_session_deleted === true || session?.status === 'deleted' || session?.isDeleted === true) {
    return true;
  }

  const user = await getCurrentUser();
  const logs = await base44.entities.BrassMovementLog.filter({
    created_by: user.email,
    reload_batch_id: sessionId,
    movement_type: 'restored_after_batch_delete',
  });
  return logs.length > 0;
}

async function restoreComponentsForSession(session, remainingUnfired) {
  if (!session?.components?.length || remainingUnfired <= 0) return { restored: false };

  const user = await getCurrentUser();
  const allComponents = await base44.entities.ReloadingComponent.filter({ created_by: user.email });
  const originalRounds = Math.max(1, num(session.rounds_loaded, 1));
  const restoreRatio = Math.min(1, Math.max(0, remainingUnfired / originalRounds));
  const unitConversions = { grams: 1, kg: 1000, oz: 28.3495, lb: 453.592, grains: 0.06479891 };
  const restored = [];

  for (const comp of session.components) {
    const normalizedType = comp.type?.toLowerCase()?.replace(/^primers?$/, 'primer') || '';
    const component = comp.component_id
      ? allComponents.find((item) => item.id === comp.component_id)
      : allComponents.find((item) => item.component_type === normalizedType && item.name === comp.name);

    if (!component) continue;

    if (normalizedType === 'powder') {
      const restoreAmount = num(comp.quantity_used) * restoreRatio;
      const usedInGrams = restoreAmount * (unitConversions[comp.unit] || 1);
      const newRemaining = safeAdd(component.quantity_remaining, usedInGrams / (unitConversions[component.unit] || 1));
      await base44.entities.ReloadingComponent.update(component.id, { quantity_remaining: newRemaining });
      restored.push({ type: normalizedType, component_id: component.id, quantity: restoreAmount, after: newRemaining });
      continue;
    }

    if (normalizedType === 'brass') {
      const previousState = getBrassState(component);
      const qty = Math.min(remainingUnfired, num(comp.quantity_used), previousState.currently_loaded);
      const brassNewQuantity = Math.min(qty, num(comp.brass_new_quantity_used || (comp.brass_use_type === 'new' ? comp.quantity_used : 0)), previousState.currently_loaded_new);
      const brassUsedQuantity = Math.min(qty - brassNewQuantity, num(comp.brass_used_quantity_used || (comp.brass_use_type === 'used' ? comp.quantity_used : 0)), previousState.currently_loaded_used);
      const newState = {
        ...previousState,
        currently_loaded_new: Math.max(0, previousState.currently_loaded_new - brassNewQuantity),
        currently_loaded_used: Math.max(0, previousState.currently_loaded_used - brassUsedQuantity),
        available_new_unloaded: previousState.available_new_unloaded + brassNewQuantity,
        available_used_recovered: previousState.available_used_recovered + brassUsedQuantity,
        first_use_cost_remaining_quantity: previousState.first_use_cost_remaining_quantity + brassNewQuantity,
        cost_consumed_quantity: Math.max(0, previousState.cost_consumed_quantity - brassNewQuantity),
        reload_cycle_count: Math.max(0, previousState.reload_cycle_count - (qty > 0 ? 1 : 0)),
      };
      const updateFields = stateUpdate(newState);
      await base44.entities.ReloadingComponent.update(component.id, updateFields);
      await logBrassMovement({
        brassId: component.id,
        reloadBatchId: session.id,
        ammunitionId: session.ammunition_id || '',
        quantity: qty,
        movementType: 'restored_after_batch_delete',
        previousState,
        newState: { ...newState, ...getBrassState(updateFields) },
        notes: `Deleted reload batch ${session.batch_number || session.id}`,
      });
      restored.push({ type: normalizedType, component_id: component.id, quantity: qty, after: getBrassState(updateFields) });
      continue;
    }

    const restoreAmount = num(comp.quantity_used) * restoreRatio;
    const newRemaining = safeAdd(component.quantity_remaining, restoreAmount);
    await base44.entities.ReloadingComponent.update(component.id, { quantity_remaining: newRemaining });
    restored.push({ type: normalizedType, component_id: component.id, quantity: restoreAmount, after: newRemaining });
  }

  return { restored: true, restored_components: restored };
}

async function removeOrArchiveAmmo(ammo, user, remainingUnfired, session) {
  if (!ammo?.id) return { ammo_action: 'missing' };

  const referenced = await hasAmmunitionReferences(ammo.id, user);
  if (referenced) {
    await base44.entities.Ammunition.update(ammo.id, {
      quantity_in_stock: 0,
      archived: true,
      isDeleted: true,
      status: 'deleted',
      deleted_at: new Date().toISOString(),
      remaining_unfired_at_delete: remainingUnfired,
      reload_session_deleted: true,
      reload_session_id: ammo.reload_session_id || session?.id || '',
      source_id: ammo.source_id || session?.id || '',
    });
    return { ammo_action: 'archived', ammo_referenced_by_records: true };
  }

  await base44.entities.Ammunition.delete(ammo.id);
  return { ammo_action: 'deleted', ammo_referenced_by_records: false };
}

export async function deleteReloadBatchWithRestore({ reloadSessionId, ammunitionId }) {
  const user = await getCurrentUser();
  let session = await getReloadSessionById(reloadSessionId);
  let ammo = ammunitionId ? await base44.entities.Ammunition.get(ammunitionId) : null;

  if (!session && ammo) session = await findReloadSessionForAmmo(ammo, user);
  if (!ammo && session) ammo = await findLinkedAmmoForSession(session, user);

  if (!session) {
    if (ammo && isReloadLinkedAmmo(ammo)) {
      await removeOrArchiveAmmo(ammo, user, num(ammo.quantity_in_stock), null);
      return { success: true, warnings: ['Linked reload session was not found. Ammunition was removed or archived only.'] };
    }
    throw new Error('Linked reload session could not be found.');
  }

  const originalRounds = Math.max(0, num(session.rounds_loaded));
  const warnings = [];
  let remainingUnfired = 0;

  if (ammo) {
    remainingUnfired = Math.min(originalRounds || num(ammo.quantity_in_stock), Math.max(0, num(ammo.quantity_in_stock)));
  } else if (session.remaining_unfired_at_delete !== undefined) {
    remainingUnfired = Math.max(0, num(session.remaining_unfired_at_delete));
  } else {
    warnings.push('Linked ammunition is missing, so remaining stock could not be calculated automatically.');
  }

  const alreadyDone = await alreadyRestored(session.id, session);
  const componentResult = alreadyDone
    ? { restored: false, skipped: true, reason: 'Reload batch was already restored.' }
    : await restoreComponentsForSession(session, remainingUnfired);

  const ammoResult = await removeOrArchiveAmmo(ammo, user, remainingUnfired, session);

  await base44.entities.ReloadingSession.update(session.id, {
    status: 'deleted',
    isDeleted: true,
    deleted_at: new Date().toISOString(),
    reload_session_deleted: true,
    components_restored: alreadyDone ? session.components_restored === true : true,
    remaining_unfired_at_delete: remainingUnfired,
    linked_ammunition_id: ammo?.id || session.linked_ammunition_id || '',
    ammunition_deleted: ammoResult.ammo_action === 'deleted',
    ammunition_archived: ammoResult.ammo_action === 'archived',
  });

  return {
    success: true,
    reload_session_id: session.id,
    ammunition_id: ammo?.id || null,
    original_rounds_loaded: originalRounds,
    remaining_unfired: remainingUnfired,
    already_restored: alreadyDone,
    ...componentResult,
    ...ammoResult,
    warnings,
  };
}

export { isReloadLinkedAmmo };