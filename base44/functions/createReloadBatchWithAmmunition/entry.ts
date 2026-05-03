import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const num = (value) => Number(value || 0);
const hasValue = (value) => value !== undefined && value !== null;
const unitConversions = { grams: 1, kg: 1000, oz: 28.3495, lb: 453.592, grains: 0.06479891 };

function convertToGrams(value, unit) {
  return num(value) * (unitConversions[unit] || 1);
}

function normalizeCaliber(value = '') {
  const trimmed = String(value || '').trim();
  const key = trimmed.toLowerCase().replace(/\s+/g, ' ');
  const aliases = {
    '.308': '.308 Winchester',
    '308': '.308 Winchester',
    '.308 win': '.308 Winchester',
    '308 win': '.308 Winchester',
    '.308 winchester': '.308 Winchester',
    '308 winchester': '.308 Winchester',
    '.303': '.303 British',
    '303': '.303 British',
    '.303 brit': '.303 British',
    '303 brit': '.303 British',
    '.303 british': '.303 British',
    '303 british': '.303 British',
  };
  return aliases[key] || trimmed;
}

function cleanText(value) {
  const text = String(value ?? '').trim();
  return text && !['undefined', 'null'].includes(text.toLowerCase()) ? text : '';
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

function normalizeBrassState(state) {
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

  normalized.available_to_reload = normalized.available_new_unloaded + normalized.available_used_recovered;
  normalized.currently_loaded = normalized.currently_loaded_new + normalized.currently_loaded_used;
  normalized.fired_awaiting_cleaning_or_inspection = normalized.fired_new_awaiting_cleaning_or_inspection + normalized.fired_used_awaiting_cleaning_or_inspection;
  normalized.first_use_cost_remaining_quantity = Math.min(normalized.first_use_cost_remaining_quantity, normalized.available_new_unloaded);
  normalized.cost_consumed_quantity = Math.min(normalized.cost_consumed_quantity, normalized.total_owned);
  return normalized;
}

function stateUpdate(state) {
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
}

function assertOwned(record, user) {
  if (!record) throw new Error('Record not found.');
  if (user.role !== 'admin' && record.created_by !== user.email) {
    throw new Error('Forbidden: this record does not belong to you.');
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { formData = {} } = await req.json();
    const cartridgesLoaded = parseInt(formData.cartridges_loaded, 10);
    if (!Number.isFinite(cartridgesLoaded) || cartridgesLoaded <= 0) throw new Error('Enter cartridges to load.');

    const brassLookupId = formData.brass_is_used ? formData.used_brass_id : formData.brass_id;
    const [primer, powder, brass, bullet] = await Promise.all([
      base44.asServiceRole.entities.ReloadingComponent.get(formData.primer_id),
      base44.asServiceRole.entities.ReloadingComponent.get(formData.powder_id),
      base44.asServiceRole.entities.ReloadingComponent.get(brassLookupId),
      base44.asServiceRole.entities.ReloadingComponent.get(formData.bullet_id),
    ]);

    [primer, powder, brass, bullet].forEach((component) => assertOwned(component, user));

    if (primer.quantity_remaining < cartridgesLoaded) throw new Error(`Primer: only ${primer.quantity_remaining || 0} in stock`);
    if (bullet.quantity_remaining < cartridgesLoaded) throw new Error(`Bullet: only ${bullet.quantity_remaining || 0} in stock`);

    const chargePerRoundInGrams = convertToGrams(parseFloat(formData.powder_charge), formData.powder_unit);
    const totalPowderUsedInGrams = chargePerRoundInGrams * cartridgesLoaded;
    const powderStockInGrams = convertToGrams(powder.quantity_remaining, powder.unit);
    if (powderStockInGrams < totalPowderUsedInGrams) throw new Error('Powder: not enough in stock');

    const previousBrassState = getBrassState(brass);
    if (formData.brass_is_used && previousBrassState.available_used_recovered < cartridgesLoaded) {
      throw new Error(`Used/recovered brass: only ${previousBrassState.available_used_recovered} available`);
    }
    if (!formData.brass_is_used && previousBrassState.available_to_reload < cartridgesLoaded) {
      throw new Error(`Brass: only ${previousBrassState.available_to_reload} available`);
    }
    if (formData.brass_is_used && previousBrassState.reload_limit > 0 && previousBrassState.reload_cycle_count >= previousBrassState.reload_limit && !formData.override_brass_limit) {
      throw new Error(`This brass has reached its reload limit (${previousBrassState.reload_cycle_count}/${previousBrassState.reload_limit}).`);
    }

    const powderUsed = totalPowderUsedInGrams / (unitConversions[powder.unit] || 1);
    const powderRemaining = Math.max(0, (powderStockInGrams - totalPowderUsedInGrams) / (unitConversions[powder.unit] || 1));
    const brassNewQuantityUsed = formData.brass_is_used ? 0 : Math.min(cartridgesLoaded, previousBrassState.available_new_unloaded);
    const brassUsedQuantityUsed = cartridgesLoaded - brassNewQuantityUsed;
    const brassUseType = brassNewQuantityUsed > 0 && brassUsedQuantityUsed > 0 ? 'mixed' : (brassUsedQuantityUsed > 0 ? 'used' : 'new');
    const nextReloadCycle = previousBrassState.reload_cycle_count + 1;

    const paidNewCases = formData.brass_is_used ? 0 : Math.min(cartridgesLoaded, previousBrassState.available_new_unloaded, previousBrassState.first_use_cost_remaining_quantity);
    const powderCost = totalPowderUsedInGrams * (powder.price_total / convertToGrams(powder.quantity_total, powder.unit));
    const primerCost = num(primer.cost_per_unit) * cartridgesLoaded;
    const brassCost = num(brass.cost_per_unit) * paidNewCases;
    const bulletCost = num(bullet.cost_per_unit) * cartridgesLoaded;
    const totalCost = Number((primerCost + powderCost + brassCost + bulletCost).toFixed(2));
    const costPerRound = Number((totalCost / cartridgesLoaded).toFixed(2));

    const newBrassState = {
      ...previousBrassState,
      available_new_unloaded: Math.max(0, previousBrassState.available_new_unloaded - brassNewQuantityUsed),
      available_used_recovered: Math.max(0, previousBrassState.available_used_recovered - brassUsedQuantityUsed),
      currently_loaded_new: previousBrassState.currently_loaded_new + brassNewQuantityUsed,
      currently_loaded_used: previousBrassState.currently_loaded_used + brassUsedQuantityUsed,
      first_use_cost_remaining_quantity: Math.max(0, previousBrassState.first_use_cost_remaining_quantity - brassNewQuantityUsed),
      cost_consumed_quantity: previousBrassState.cost_consumed_quantity + brassNewQuantityUsed,
      reload_cycle_count: nextReloadCycle,
      lifetime_reload_count: previousBrassState.lifetime_reload_count + cartridgesLoaded,
    };

    await Promise.all([
      base44.asServiceRole.entities.ReloadingComponent.update(primer.id, { quantity_remaining: Math.max(0, primer.quantity_remaining - cartridgesLoaded) }),
      base44.asServiceRole.entities.ReloadingComponent.update(powder.id, { quantity_remaining: powderRemaining }),
      base44.asServiceRole.entities.ReloadingComponent.update(brass.id, stateUpdate(newBrassState)),
      base44.asServiceRole.entities.ReloadingComponent.update(bullet.id, { quantity_remaining: Math.max(0, bullet.quantity_remaining - cartridgesLoaded) }),
    ]);

    const reloadSession = await base44.entities.ReloadingSession.create({
      date: formData.date,
      caliber: formData.caliber,
      batch_number: formData.batch_number,
      firearm_id: formData.rifle_id || '',
      rounds_loaded: cartridgesLoaded,
      brass_component_id: brass.id,
      brass_reload_cycle_count: nextReloadCycle,
      brass_use_type: brassUseType,
      brass_new_quantity_used: brassNewQuantityUsed,
      brass_used_quantity_used: brassUsedQuantityUsed,
      total_cost: totalCost,
      cost_per_round: costPerRound,
      components: [
        { type: 'primer', component_id: primer.id, name: primer.name, quantity_used: cartridgesLoaded, cost: Number(primerCost.toFixed(2)), lot_number: formData.primer_lot || primer.lot_number || '' },
        { type: 'powder', component_id: powder.id, name: powder.name, quantity_used: powderUsed, unit: powder.unit, cost: Number(powderCost.toFixed(2)), lot_number: formData.powder_lot || powder.lot_number || '' },
        { type: 'brass', component_id: brass.id, name: brass.name, quantity_used: cartridgesLoaded, cost: Number(brassCost.toFixed(2)), is_used_brass: formData.brass_is_used, brass_use_type: brassUseType, brass_new_quantity_used: brassNewQuantityUsed, brass_used_quantity_used: brassUsedQuantityUsed, lot_number: formData.brass_lot || brass.lot_number || '', brass_reload_cycle_count: nextReloadCycle },
        { type: 'bullet', component_id: bullet.id, name: bullet.name, quantity_used: cartridgesLoaded, cost: Number(bulletCost.toFixed(2)), lot_number: formData.bullet_lot || bullet.lot_number || '' },
      ],
      notes: formData.notes || '',
    });

    const bulletBrand = cleanText(bullet.brand);
    const bulletLabel = cleanText(bullet.bullet_name || bullet.name || bullet.product_name || 'Custom');
    const bulletWeight = cleanText(bullet.weight || bullet.weight_grains || bullet.bullet_weight_grains || bullet.grain);
    const normalizedCaliber = normalizeCaliber(formData.caliber);
    const ammoPayload = {
      brand: bulletBrand || 'Reloaded',
      caliber: normalizedCaliber,
      bullet_type: bulletLabel,
      grain: bulletWeight,
      quantity_in_stock: cartridgesLoaded,
      units: 'rounds',
      cost_per_unit: costPerRound,
      date_purchased: formData.date,
      low_stock_threshold: 10,
      notes: `reload_batch:${reloadSession.id} | Batch ${formData.batch_number}${bulletLabel ? ` | ${[bulletBrand, bulletLabel].filter(Boolean).join(' ')}` : ''}`,
      ammo_type: 'reloaded',
      source_type: 'reload_batch',
      source_id: reloadSession.id,
      reload_session_id: reloadSession.id,
      batch_number: formData.batch_number,
      brass_component_id: brass.id,
      brass_reload_cycle_count: nextReloadCycle,
      brass_use_type: brassUseType,
      brass_new_quantity_used: brassNewQuantityUsed,
      brass_used_quantity_used: brassUsedQuantityUsed,
    };

    const existingAmmo = (await base44.entities.Ammunition.filter({ created_by: user.email }))
      .find((ammo) => ammo.reload_session_id === reloadSession.id || ammo.source_id === reloadSession.id);
    const ammunition = existingAmmo
      ? await base44.entities.Ammunition.update(existingAmmo.id, ammoPayload)
      : await base44.entities.Ammunition.create(ammoPayload);

    await base44.asServiceRole.entities.BrassMovementLog.create({
      created_by: user.email,
      brass_id: brass.id,
      reload_batch_id: reloadSession.id,
      ammunition_id: ammunition.id,
      quantity: cartridgesLoaded,
      movement_type: 'used_in_reload_batch',
      previous_state: previousBrassState,
      new_state: newBrassState,
      movement_date: new Date().toISOString(),
      notes: `Batch ${formData.batch_number}`,
    });

    return Response.json({ success: true, reloadingSession: reloadSession, ammunition });
  } catch (error) {
    console.error('[createReloadBatchWithAmmunition] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});