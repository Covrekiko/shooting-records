import { base44 } from '@/api/base44Client';
import { moveLoadedAmmoToFiredBrass, restoreFiredBrassToLoadedForRecord, getReusedBrassStockRestoreWarning, logSkippedAmmoStockRestore } from '@/lib/brassLifecycle';

/**
 * Decrement ammunition stock and log the spending.
 * For Deer: pass both sessionId (SessionRecord.id) and outingId (DeerOuting.id) for reliable cleanup.
 * For Target/Clay: sessionId is sufficient.
 */
export async function decrementAmmoStock(ammunitionId, quantity, sessionType = null, sessionId = null, outingId = null) {
  if (!ammunitionId || !quantity || quantity <= 0) return;

  try {
    const ammo = await base44.entities.Ammunition.get(ammunitionId);
    const stockBefore = ammo.quantity_in_stock || 0;
    const newQuantity = Math.max(0, stockBefore - quantity);

    console.log(`[AMMO DEBUG] action: AMMO_USED sourceType: ${sessionType} sourceId: ${sessionId} outingId: ${outingId} ammoId: ${ammunitionId} quantityChange: -${quantity} stockBefore: ${stockBefore} stockAfter: ${newQuantity}`);

    await base44.entities.Ammunition.update(ammunitionId, { quantity_in_stock: newQuantity });
    await moveLoadedAmmoToFiredBrass(ammo, quantity, sessionId, sessionType);

    // Log spending — store both IDs for Deer (to handle both SessionRecord.id and DeerOuting.id cleanup paths)
    // For Deer: notes = "session:${sessionId}|outing:${outingId}" allows fallback cleanup
    const notesValue = sessionId && outingId
      ? `session:${sessionId}|outing:${outingId}`  // Deer: both IDs for fallback
      : sessionId
      ? `session:${sessionId}`  // Target/Clay: only SessionRecord.id
      : undefined;

    await base44.entities.AmmoSpending.create({
      ammunition_id: ammunitionId,
      brand: ammo.brand,
      caliber: ammo.caliber,
      quantity_used: quantity,
      cost_per_unit: ammo.cost_per_unit || 0,
      total_cost: quantity * (ammo.cost_per_unit || 0),
      date_used: new Date().toISOString().split('T')[0],
      session_type: sessionType,
      notes: notesValue,
    });
  } catch (error) {
    console.error('Error decrementing ammo stock:', error);
  }
}

/**
 * Restore ammunition stock (add back) — called on record delete.
 * Also removes any AmmoSpending log entries tied to that session.
 * For Deer: pass outingId as fallback if SessionRecord cleanup doesn't find entries.
 */
export async function restoreAmmoStock(ammunitionId, quantity, sessionId = null, outingId = null) {
  if (!ammunitionId || !quantity || quantity <= 0) return;

  try {
    const ammo = await base44.entities.Ammunition.get(ammunitionId);
    const stockBefore = ammo.quantity_in_stock || 0;
    const reusedWarning = ammo.source_type === 'reload_batch'
      ? await getReusedBrassStockRestoreWarning(ammo, sessionId)
      : null;

    if (reusedWarning) {
      console.warn('Used brass was not restored because it was already recovered/reused in a later reload batch.');
      await logSkippedAmmoStockRestore({ ammo, recordId: sessionId, quantity, warning: reusedWarning });
      return {
        skipped: true,
        warning: 'Used brass was not restored because it was already recovered/reused in a later reload batch.'
      };
    }

    const newQuantity = stockBefore + quantity;
    console.log(`[AMMO DEBUG] action: AMMO_REFUNDED sourceId: ${sessionId} outingId: ${outingId} ammoId: ${ammunitionId} quantityChange: +${quantity} stockBefore: ${stockBefore} stockAfter: ${newQuantity}`);
    await base44.entities.Ammunition.update(ammunitionId, { quantity_in_stock: newQuantity });
    await restoreFiredBrassToLoadedForRecord(ammo, quantity, sessionId);

    // Clean up spending log entries tied to this session (with fallback for Deer)
    if (sessionId || outingId) {
      try {
        const user = await base44.auth.me();
        const spendingRecords = await base44.entities.AmmoSpending.filter({ created_by: user.email });
        for (const record of spendingRecords) {
          if (record.notes) {
            // Try SessionRecord ID first (main path)
            if (sessionId && record.notes.includes(`session:${sessionId}`)) {
              await base44.entities.AmmoSpending.delete(record.id);
            }
            // Fallback: try DeerOuting ID if SessionRecord didn't match (for old/orphaned records)
            else if (outingId && record.notes.includes(`outing:${outingId}`)) {
              console.log(`[AMMO CLEANUP] Fallback: cleaned up orphaned AmmoSpending via outingId (record.id: ${record.id})`);
              await base44.entities.AmmoSpending.delete(record.id);
            }
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
  const warnings = [];

  try {
    if (recordType === 'target_shooting' && record.rifles_used?.length > 0) {
      // Target: loop through all rifles, refund each ammo entry
      for (const rifleStat of record.rifles_used) {
        if (rifleStat.ammunition_id && rifleStat.rounds_fired) {
          const roundsFired = parseInt(rifleStat.rounds_fired) || 0;
          if (roundsFired > 0) {
            const result = await restoreAmmoStock(rifleStat.ammunition_id, roundsFired, record.id);
            if (result?.skipped) {
              console.warn(result.warning);
              warnings.push(result.warning);
            } else {
              totalRefunded += roundsFired;
            }
          }
        }
      }
    } else if (recordType === 'deer_management') {
      // Deer: use top-level ammunition_id and rounds_fired
      // Pass both SessionRecord.id AND outing_id for reliable cleanup with fallback
      if (record.ammunition_id && record.rounds_fired) {
        const roundsFired = parseInt(record.rounds_fired) || 0;
        if (roundsFired > 0) {
          const result = await restoreAmmoStock(record.ammunition_id, roundsFired, record.id, record.outing_id);
          if (result?.skipped) {
            console.warn(result.warning);
            warnings.push(result.warning);
          } else {
            totalRefunded = roundsFired;
          }
        }
      }
    } else if (recordType === 'clay_shooting') {
      // Clay: check for ammunition usage (use ammunition_id and rounds_fired if available)
      if (record.ammunition_id && record.rounds_fired) {
        const roundsFired = parseInt(record.rounds_fired) || 0;
        if (roundsFired > 0) {
          const result = await restoreAmmoStock(record.ammunition_id, roundsFired, record.id);
          if (result?.skipped) {
            console.warn(result.warning);
            warnings.push(result.warning);
          } else {
            totalRefunded = roundsFired;
          }
        }
      }
    }

    return { success: true, refunded: totalRefunded, warnings };
  } catch (error) {
    console.error(`[AMMO REFUND ERROR] recordType: ${recordType} recordId: ${record.id} error: ${error.message}`);
    return { success: false, error: error.message, refunded: 0 };
  }
}

/**
 * ARMORY COUNTER REVERSAL: Reverse firearm counters when deleting a record
 * Called AFTER ammo refund to maintain data consistency
 * Handles Target (multi-rifle), Clay (single shotgun), and Deer (single rifle)
 */
export async function reverseArmoryCountersForRecord(record, recordCategory) {
  if (!record || !record.id) return { success: true, reversed: [] };

  // Idempotency check: if already reversed, skip
  if (record.armoryCountersReversed === true || record.countersReversedAt) {
    return { success: true, skipped: true, reversed: [] };
  }

  const reversed = [];

  try {
    if (recordCategory === 'target_shooting' && record.rifles_used?.length > 0) {
      // TARGET SHOOTING: multiple rifles, each with rounds_fired
      for (const rifleEntry of record.rifles_used) {
        const roundsToSubtract = parseInt(rifleEntry.rounds_fired) || 0;
        if (!rifleEntry.rifle_id || roundsToSubtract <= 0) continue;

        const rifle = await base44.entities.Rifle.get(rifleEntry.rifle_id);
        if (!rifle) throw new Error(`Rifle not found: ${rifleEntry.rifle_id}`);

        const totalBefore = rifle.total_rounds_fired || 0;
        const totalAfter = Math.max(0, totalBefore - roundsToSubtract);

        // Do not change rounds_at_last_cleaning: it is the cleaning baseline.
        await base44.entities.Rifle.update(rifleEntry.rifle_id, {
          total_rounds_fired: totalAfter,
        });
        reversed.push({ type: 'rifle', id: rifleEntry.rifle_id, rounds: roundsToSubtract, before: totalBefore, after: totalAfter });
      }
    } else if (recordCategory === 'clay_shooting' && record.shotgun_id) {
      // CLAY SHOOTING: single shotgun with cartridges
      const roundsToSubtract = parseInt(record.rounds_fired) || 0;
      if (roundsToSubtract > 0) {
        const shotgun = await base44.entities.Shotgun.get(record.shotgun_id);
        if (!shotgun) throw new Error(`Shotgun not found: ${record.shotgun_id}`);

        const totalBefore = shotgun.total_cartridges_fired || 0;
        const totalAfter = Math.max(0, totalBefore - roundsToSubtract);

        // Do not change cartridges_at_last_cleaning: it is the cleaning baseline.
        await base44.entities.Shotgun.update(record.shotgun_id, {
          total_cartridges_fired: totalAfter,
        });
        reversed.push({ type: 'shotgun', id: record.shotgun_id, rounds: roundsToSubtract, before: totalBefore, after: totalAfter });
      }
    } else if (recordCategory === 'deer_management' && record.rifle_id) {
      // DEER MANAGEMENT: use actual shots fired before harvest total.
      const roundsToSubtract = parseInt(record.rounds_fired || record.total_count || record.number_shot || 0) || 0;
      if (roundsToSubtract > 0) {
        const rifle = await base44.entities.Rifle.get(record.rifle_id);
        if (!rifle) throw new Error(`Rifle not found: ${record.rifle_id}`);

        const totalBefore = rifle.total_rounds_fired || 0;
        const totalAfter = Math.max(0, totalBefore - roundsToSubtract);

        // Do not change rounds_at_last_cleaning: it is the cleaning baseline.
        await base44.entities.Rifle.update(record.rifle_id, {
          total_rounds_fired: totalAfter,
        });
        reversed.push({ type: 'rifle', id: record.rifle_id, rounds: roundsToSubtract, before: totalBefore, after: totalAfter });
      }
    }

    return { success: true, reversed };
  } catch (error) {
    console.error(`[ARMORY REVERSAL ERROR] recordId: ${record.id} category: ${recordCategory} error: ${error.message}`);
    return { success: false, error: error.message, reversed };
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
    // Skip ammo with no stock (but log reloaded ammo for debugging)
    if ((ammo.quantity_in_stock || 0) <= 0) {
      if (ammo.ammo_type === 'reloaded' || ammo.source_type === 'reload_batch') {
        console.log(`[AMMO FILTER DEBUG] skipping reloaded ammo with zero stock: ${ammo.brand} ${ammo.caliber}`);
      }
      return false;
    }

    // Skip ammo with no caliber
    if (!ammo.caliber) return true;

    const ammoNorm = normalizeCaliber(ammo.caliber);
    return ammoNorm === selectedNorm || ammoNorm.startsWith(selectedNorm) || selectedNorm.startsWith(ammoNorm);
  });
}