import { base44 } from '@/api/base44Client';

/**
 * Decrement ammunition stock and log the spending.
 * Always stores session_id so restores can find and clean up the log entry.
 */
export async function decrementAmmoStock(ammunitionId, quantity, sessionType = null, sessionId = null) {
  if (!ammunitionId || !quantity || quantity <= 0) return;

  try {
    const ammo = await base44.entities.Ammunition.get(ammunitionId);
    const newQuantity = Math.max(0, (ammo.quantity_in_stock || 0) - quantity);

    await base44.entities.Ammunition.update(ammunitionId, { quantity_in_stock: newQuantity });

    // Log spending — always include session_id for reliable restore/cleanup
    await base44.entities.AmmoSpending.create({
      ammunition_id: ammunitionId,
      brand: ammo.brand,
      caliber: ammo.caliber,
      quantity_used: quantity,
      cost_per_unit: ammo.cost_per_unit || 0,
      total_cost: quantity * (ammo.cost_per_unit || 0),
      date_used: new Date().toISOString().split('T')[0],
      session_type: sessionType,
      notes: sessionId ? `session:${sessionId}` : undefined,
    });
  } catch (error) {
    console.error('Error decrementing ammo stock:', error);
  }
}

/**
 * Restore ammunition stock (add back) — called on record delete.
 * Also removes any AmmoSpending log entries tied to that session.
 */
export async function restoreAmmoStock(ammunitionId, quantity, sessionId = null) {
  if (!ammunitionId || !quantity || quantity <= 0) return;

  try {
    const ammo = await base44.entities.Ammunition.get(ammunitionId);
    const newQuantity = (ammo.quantity_in_stock || 0) + quantity;
    await base44.entities.Ammunition.update(ammunitionId, { quantity_in_stock: newQuantity });

    // Clean up spending log entries tied to this session
    if (sessionId) {
      try {
        const user = await base44.auth.me();
        const spendingRecords = await base44.entities.AmmoSpending.filter({ created_by: user.email });
        for (const record of spendingRecords) {
          if (record.notes && record.notes.includes(`session:${sessionId}`)) {
            await base44.entities.AmmoSpending.delete(record.id);
          }
        }
      } catch (e) {
        console.warn('Could not clean up AmmoSpending logs:', e.message);
      }
    }
  } catch (error) {
    console.error('Error restoring ammo stock:', error);
  }
}