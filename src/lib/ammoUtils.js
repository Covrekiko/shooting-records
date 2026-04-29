import { base44 } from '@/api/base44Client';

/**
 * Decrement ammunition stock and log the spending.
 * Always stores session_id so restores can find and clean up the log entry.
 */
export async function decrementAmmoStock(ammunitionId, quantity, sessionType = null, sessionId = null) {
  if (!ammunitionId || !quantity || quantity <= 0) return;

  try {
    const ammo = await base44.entities.Ammunition.get(ammunitionId);
    const stockBefore = ammo.quantity_in_stock || 0;
    const newQuantity = Math.max(0, stockBefore - quantity);

    console.log(`[AMMO DEBUG] action: AMMO_USED sourceType: ${sessionType} sourceId: ${sessionId} ammoId: ${ammunitionId} quantityChange: -${quantity} stockBefore: ${stockBefore} stockAfter: ${newQuantity}`);

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
    const stockBefore = ammo.quantity_in_stock || 0;
    const newQuantity = stockBefore + quantity;
    console.log(`[AMMO DEBUG] action: AMMO_REFUNDED sourceId: ${sessionId} ammoId: ${ammunitionId} quantityChange: +${quantity} stockBefore: ${stockBefore} stockAfter: ${newQuantity}`);
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

/**
 * FIX 1: Refund ammo for a deleted record based on type (Target, Deer, Clay)
 * Ensures ammunition is properly restored BEFORE deletion.
 */
export async function refundAmmoForRecord(record, recordType) {
  if (!record || !record.id) return { success: true, refunded: 0 };

  let totalRefunded = 0;

  try {
    if (recordType === 'target_shooting' && record.rifles_used?.length > 0) {
      // Target: loop through all rifles, refund each ammo entry
      for (const rifleStat of record.rifles_used) {
        if (rifleStat.ammunition_id && rifleStat.rounds_fired) {
          const roundsFired = parseInt(rifleStat.rounds_fired) || 0;
          if (roundsFired > 0) {
            await restoreAmmoStock(rifleStat.ammunition_id, roundsFired, record.id);
            totalRefunded += roundsFired;
          }
        }
      }
    } else if (recordType === 'deer_management') {
      // Deer: use top-level ammunition_id and rounds_fired
      if (record.ammunition_id && record.rounds_fired) {
        const roundsFired = parseInt(record.rounds_fired) || 0;
        if (roundsFired > 0) {
          await restoreAmmoStock(record.ammunition_id, roundsFired, record.id);
          totalRefunded = roundsFired;
        }
      }
    } else if (recordType === 'clay_shooting') {
      // Clay: check for ammunition usage (use ammunition_id and rounds_fired if available)
      if (record.ammunition_id && record.rounds_fired) {
        const roundsFired = parseInt(record.rounds_fired) || 0;
        if (roundsFired > 0) {
          await restoreAmmoStock(record.ammunition_id, roundsFired, record.id);
          totalRefunded = roundsFired;
        }
      }
    }

    return { success: true, refunded: totalRefunded };
  } catch (error) {
    console.error(`[AMMO REFUND ERROR] recordType: ${recordType} recordId: ${record.id} error: ${error.message}`);
    return { success: false, error: error.message, refunded: 0 };
  }
}

/**
 * FIX 3: Normalize and filter ammunition for selectors
 * Handles factory ammo and reloaded ammo with calibre matching
 */
export function getSelectableAmmunition(ammunition, selectedCaliber) {
  if (!ammunition || !selectedCaliber) return ammunition;

  const normalizeCaliber = (cal) => {
    if (!cal) return '';
    const normalized = cal.toLowerCase().trim()
      .replace(/\s+win(chester)?$/i, '') // Remove Win/Winchester
      .replace(/^\./, ''); // Remove leading dot
    return normalized;
  };

  const selectedNorm = normalizeCaliber(selectedCaliber);

  return ammunition.filter(ammo => {
    if (!ammo.caliber) return true;
    if ((ammo.quantity_in_stock || 0) <= 0) return false;

    const ammoNorm = normalizeCaliber(ammo.caliber);
    return ammoNorm === selectedNorm || ammoNorm.startsWith(selectedNorm) || selectedNorm.startsWith(ammoNorm);
  });
}