import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Backend function to restore all stock before deleting a session record.
 *
 * PRIMARY RESTORE PATH: AmmoSpending logs tagged with `session:{sessionId}`.
 *   These are created atomically at checkout time by decrementAmmoStock() and
 *   are the most reliable source of truth for exactly how much ammo was consumed.
 *
 * FALLBACK RESTORE PATH: Fields saved directly on the SessionRecord.
 *   Used only when no AmmoSpending logs exist (e.g. very old records created
 *   before spending logs were introduced).
 *
 * Also restores: Rifle total_rounds_fired, Shotgun total_cartridges_fired.
 */
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

    console.log(`[AMMO DELETE DEBUG] Starting restore for sessionId: ${sessionId}`);

    // Load the full session record first
    const session = await base44.asServiceRole.entities.SessionRecord.get(sessionId);
    if (!session) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }
    if (session.created_by !== user.email) {
      return Response.json({ error: 'Forbidden: not your record' }, { status: 403 });
    }
    console.log(`[AMMO DELETE DEBUG] record type: ${session.category}`);
    console.log(`[AMMO DELETE DEBUG] fullRecordBeforeDelete: ammunition_id=${session.ammunition_id} rounds_fired=${session.rounds_fired} total_count=${session.total_count} rifles_used_count=${session.rifles_used?.length || 0}`);

    const restorations = [];

    // ─── HELPER: restore ammo stock ───────────────────────────────────────
    const restoreAmmo = async (ammunitionId, qty, label) => {
      if (!ammunitionId || !(qty > 0)) {
        console.log(`[AMMO DELETE DEBUG] skipping restoreAmmo — no ammoId or qty=0 for: ${label}`);
        return false;
      }
      try {
        const ammo = await base44.asServiceRole.entities.Ammunition.get(ammunitionId);
        if (!ammo) return false;
        if (ammo.created_by !== user.email) {
          throw new Error('Forbidden: ammunition does not belong to you');
        }
        const stockBefore = ammo.quantity_in_stock || 0;
        const stockAfter = stockBefore + qty;
        console.log(`[AMMO DELETE DEBUG] ammoId: ${ammunitionId} label: ${label} stockBefore: ${stockBefore} refundQuantity: +${qty} stockAfter: ${stockAfter}`);
        await base44.asServiceRole.entities.Ammunition.update(ammunitionId, { quantity_in_stock: stockAfter });
        console.log(`[AMMO DELETE DEBUG] stock update success: true`);
        restorations.push({ type: 'ammo', id: ammunitionId, qty, new_stock: stockAfter, label });
        return true;
      } catch (e) {
        console.warn(`[AMMO DELETE DEBUG] stock update success: false — Ammo ${ammunitionId} error: ${e.message}`);
        return false;
      }
    };

    // ─── HELPER: restore rifle round count ────────────────────────────────
    const restoreRifleRounds = async (rifleId, qty) => {
      if (!rifleId || !(qty > 0)) return;
      try {
        const rifle = await base44.asServiceRole.entities.Rifle.get(rifleId);
        if (!rifle) return;
        if (rifle.created_by !== user.email) {
          throw new Error('Forbidden: rifle does not belong to you');
        }
        const newTotal = Math.max(0, (rifle.total_rounds_fired || 0) - qty);
        await base44.asServiceRole.entities.Rifle.update(rifleId, { total_rounds_fired: newTotal });
        restorations.push({ type: 'rifle_rounds', id: rifleId, qty });
        console.log(`[AMMO DELETE DEBUG] rifle ${rifleId}: total_rounds_fired → ${newTotal}`);
      } catch (e) {
        console.warn(`[AMMO DELETE DEBUG] rifle ${rifleId} not found: ${e.message}`);
      }
    };

    // ─── HELPER: restore shotgun cartridge count ──────────────────────────
    const restoreShotgunCartridges = async (shotgunId, qty) => {
      if (!shotgunId || !(qty > 0)) return;
      try {
        const shotgun = await base44.asServiceRole.entities.Shotgun.get(shotgunId);
        if (!shotgun) return;
        if (shotgun.created_by !== user.email) {
          throw new Error('Forbidden: shotgun does not belong to you');
        }
        const newTotal = Math.max(0, (shotgun.total_cartridges_fired || 0) - qty);
        await base44.asServiceRole.entities.Shotgun.update(shotgunId, { total_cartridges_fired: newTotal });
        restorations.push({ type: 'shotgun_cartridges', id: shotgunId, qty });
        console.log(`[AMMO DELETE DEBUG] shotgun ${shotgunId}: total_cartridges_fired → ${newTotal}`);
      } catch (e) {
        console.warn(`[AMMO DELETE DEBUG] shotgun ${shotgunId} not found: ${e.message}`);
      }
    };

    // ═══════════════════════════════════════════════════════════════════════
    // PRIMARY RESTORE: Use AmmoSpending logs tagged with session:{sessionId}
    // These are created by decrementAmmoStock() and are the authoritative record
    // of exactly how much was taken from each ammo item.
    // ═══════════════════════════════════════════════════════════════════════
    let spendingLogs = [];
    try {
      // Filter by ammunition_id existence to narrow results, then match by session tag in notes.
      // We use service role to see all records regardless of owner.
      // Base44 filter doesn't support substring match on notes, so we load with a broad filter
      // then match in JS — acceptable since AmmoSpending is per-user and typically small.
      const allSpending = await base44.asServiceRole.entities.AmmoSpending.filter({
        created_by: user.email,
      });
      spendingLogs = allSpending.filter(
        (r) => r.notes && r.notes.includes(`session:${sessionId}`)
      );
      console.log(`[AMMO DELETE DEBUG] linkedUsageFound: ${spendingLogs.length > 0} (${spendingLogs.length} spending log(s))`);
    } catch (e) {
      console.warn(`[AMMO DELETE DEBUG] Could not load AmmoSpending logs: ${e.message}`);
    }

    if (spendingLogs.length > 0) {
      // ── Primary path: restore exactly what spending logs say was consumed ──
      console.log(`[AMMO DELETE DEBUG] Using PRIMARY path — AmmoSpending logs`);

      // Aggregate in case multiple logs reference the same ammo ID
      const ammoTotals = {};
      for (const log of spendingLogs) {
        if (log.ammunition_id && log.quantity_used > 0) {
          ammoTotals[log.ammunition_id] = (ammoTotals[log.ammunition_id] || 0) + log.quantity_used;
        }
      }

      for (const [ammoId, qty] of Object.entries(ammoTotals)) {
        await restoreAmmo(ammoId, qty, `spending_log session:${sessionId}`);
      }

      // Delete the spending logs now that stock has been restored
      for (const log of spendingLogs) {
        try {
          await base44.asServiceRole.entities.AmmoSpending.delete(log.id);
        } catch (e) {
          console.warn(`[AMMO DELETE DEBUG] Could not delete AmmoSpending log ${log.id}: ${e.message}`);
        }
      }
      console.log(`[AMMO DELETE DEBUG] Deleted ${spendingLogs.length} AmmoSpending log(s)`);

    } else {
      // ══════════════════════════════════════════════════════════════════════
      // FALLBACK RESTORE: Read fields directly from the SessionRecord.
      // Used for old records that pre-date the AmmoSpending log system.
      // ══════════════════════════════════════════════════════════════════════
      console.log(`[AMMO DELETE DEBUG] No spending logs found — using FALLBACK path (session record fields)`);

      if (session.category === 'target_shooting') {
        if (Array.isArray(session.rifles_used) && session.rifles_used.length > 0) {
          // Aggregate rounds per ammo ID across all rifles
          const ammoTotals = {};
          for (const rifle of session.rifles_used) {
            const rounds = parseInt(rifle.rounds_fired) || 0;
            if (rounds <= 0) continue;
            if (rifle.ammunition_id) {
              ammoTotals[rifle.ammunition_id] = (ammoTotals[rifle.ammunition_id] || 0) + rounds;
            }
            if (rifle.rifle_id) {
              await restoreRifleRounds(rifle.rifle_id, rounds);
            }
          }
          for (const [ammoId, totalRounds] of Object.entries(ammoTotals)) {
            await restoreAmmo(ammoId, totalRounds, 'target_shooting fallback via rifles_used');
          }
        } else {
          // Oldest records: top-level fields only
          const qty = parseInt(session.rounds_fired) || 0;
          if (session.ammunition_id && qty > 0) {
            await restoreAmmo(session.ammunition_id, qty, 'target_shooting fallback top-level');
            if (session.rifle_id) await restoreRifleRounds(session.rifle_id, qty);
          } else {
            console.log(`[AMMO DELETE DEBUG] Fallback: no ammo data found on target session — nothing to refund`);
          }
        }
      }

      if (session.category === 'clay_shooting') {
        const rounds = parseInt(session.rounds_fired) || 0;
        if (session.ammunition_id && rounds > 0) {
          await restoreAmmo(session.ammunition_id, rounds, 'clay_shooting fallback');
        } else {
          console.log(`[AMMO DELETE DEBUG] Fallback: no ammo data found on clay session — nothing to refund`);
        }
        if (session.shotgun_id && rounds > 0) {
          await restoreShotgunCartridges(session.shotgun_id, rounds);
        }
      }

      if (session.category === 'deer_management') {
        const shots = parseInt(session.rounds_fired) > 0
          ? parseInt(session.rounds_fired)
          : parseInt(session.total_count) || 0;
        if (session.ammunition_id && shots > 0) {
          await restoreAmmo(session.ammunition_id, shots, 'deer_management fallback');
          if (session.rifle_id) await restoreRifleRounds(session.rifle_id, shots);
        } else {
          console.log(`[AMMO DELETE DEBUG] Fallback: no ammo data found on deer session — nothing to refund`);
        }
      }
    }

    // ─── Restore firearm counts if they weren't covered above ─────────────
    // For clay, always try to restore shotgun cartridges from session record
    // if they weren't already restored via spending logs (spending logs don't track guns)
    if (session.category === 'clay_shooting') {
      const roundsFired = parseInt(session.rounds_fired) || 0;
      if (session.shotgun_id && roundsFired > 0) {
        // Only restore if not already done in fallback path
        const alreadyDone = restorations.some(r => r.type === 'shotgun_cartridges' && r.id === session.shotgun_id);
        if (!alreadyDone) {
          await restoreShotgunCartridges(session.shotgun_id, roundsFired);
        }
      }
    }

    if (session.category === 'target_shooting' && Array.isArray(session.rifles_used)) {
      for (const rifle of session.rifles_used) {
        const rounds = parseInt(rifle.rounds_fired) || 0;
        if (rifle.rifle_id && rounds > 0) {
          const alreadyDone = restorations.some(r => r.type === 'rifle_rounds' && r.id === rifle.rifle_id);
          if (!alreadyDone) {
            await restoreRifleRounds(rifle.rifle_id, rounds);
          }
        }
      }
    }

    if (session.category === 'deer_management') {
      const shots = parseInt(session.rounds_fired) > 0
        ? parseInt(session.rounds_fired)
        : parseInt(session.total_count) || 0;
      if (session.rifle_id && shots > 0) {
        const alreadyDone = restorations.some(r => r.type === 'rifle_rounds' && r.id === session.rifle_id);
        if (!alreadyDone) {
          await restoreRifleRounds(session.rifle_id, shots);
        }
      }
    }

    console.log(`[AMMO DELETE DEBUG] inventoryRefreshTriggered: true — ${restorations.length} restoration(s) applied`);
    return Response.json({ success: true, sessionId, restorations });

  } catch (error) {
    console.error('[restoreSessionStock] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});