import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const allowedFields = [
  'brand', 'caliber', 'bullet_type', 'grain', 'quantity_in_stock', 'quantity_total',
  'quantity_remaining', 'units', 'cost_per_unit', 'unit_cost', 'total_cost',
  'date_purchased', 'low_stock_threshold', 'lot_number', 'supplier', 'notes',
  'ammo_type', 'source_type', 'source_id', 'reload_session_id', 'batch_number',
  'brass_component_id', 'brass_reload_cycle_count', 'brass_use_type',
  'brass_new_quantity_used', 'brass_used_quantity_used', 'bullet_weight_grains',
  'weight_grains'
];

const integerFields = new Set([
  'quantity_in_stock', 'quantity_total', 'quantity_remaining', 'low_stock_threshold',
  'brass_reload_cycle_count', 'brass_new_quantity_used', 'brass_used_quantity_used',
  'bullet_weight_grains', 'weight_grains'
]);
const numberFields = new Set(['cost_per_unit', 'unit_cost', 'total_cost']);

function cleanPayload(input = {}, userEmail) {
  const output = { created_by: userEmail };

  for (const field of allowedFields) {
    if (!(field in input)) continue;
    const value = input[field];

    if (value === '' || value === null || value === undefined) {
      if (integerFields.has(field) || numberFields.has(field)) {
        output[field] = 0;
        continue;
      }
      continue;
    }

    if (integerFields.has(field)) {
      const parsed = parseInt(value, 10);
      if (Number.isFinite(parsed)) output[field] = parsed;
      continue;
    }

    if (numberFields.has(field)) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) output[field] = parsed;
      continue;
    }

    output[field] = value;
  }

  output.brand = String(output.brand || '').trim();
  if (!output.brand) throw new Error('Ammunition brand is required.');
  if (!output.units) output.units = 'rounds';
  if (!output.ammo_type) output.ammo_type = 'factory';
  if (!output.source_type && output.ammo_type === 'factory') output.source_type = 'purchased';

  return output;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ammunition } = await req.json();
    const payload = cleanPayload(ammunition, user.email);
    const created = await base44.asServiceRole.entities.Ammunition.create(payload);

    return Response.json({ success: true, ammunition: created });
  } catch (error) {
    console.error('[createAmmunitionForUser] Error:', error.message);
    return Response.json({ error: `Could not create ammunition: ${error.message}` }, { status: 500 });
  }
});