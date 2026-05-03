import { enqueueAction } from './syncQueue';

export const FIELD_CHECKOUT_EFFECTS_ENTITY = 'FieldCheckoutEffects';

export async function queueFieldCheckoutEffects({ recordId, category, ammoUsages = [], rifleUpdates = [], shotgunUpdates = [] }) {
  const hasEffects = ammoUsages.length > 0 || rifleUpdates.length > 0 || shotgunUpdates.length > 0;
  if (!recordId || !category || !hasEffects) return null;

  return enqueueAction({
    entityName: FIELD_CHECKOUT_EFFECTS_ENTITY,
    action: 'apply_field_checkout_effects',
    localId: recordId,
    payload: {
      id: `field_effects_${recordId}`,
      recordId,
      category,
      ammoUsages,
      rifleUpdates,
      shotgunUpdates,
      queuedAt: new Date().toISOString(),
    },
  });
}

export function isPendingOfflineRecord(record) {
  return record?._localOnly === true || record?._offline_status === 'pending_sync';
}