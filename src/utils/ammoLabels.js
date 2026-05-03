import { normalizeCaliber } from '@/utils/caliberCatalog';

export function formatAmmunitionLabel(ammo) {
  if (!ammo) return '';

  const clean = (value) => {
    const text = String(value ?? '').trim();
    return text && !['undefined', 'null'].includes(text.toLowerCase()) ? text : '';
  };

  const normalizeKey = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]/g, '');
  const source = clean(ammo.ammo_type || ammo.type || ammo.source || ammo.source_type).toLowerCase();
  const brand = clean(ammo.brand || ammo.bullet_brand);
  const bulletName = clean(ammo.bullet_name || ammo.bullet_model || ammo.name || ammo.bullet_type);
  const caliber = normalizeCaliber(clean(ammo.caliber));
  const batchNumber = clean(ammo.batch_number || ammo.reload_batch_number || ammo.reload_batch_id || ammo.source_id || ammo.reload_session_id);
  const lotNumber = clean(ammo.lot_number);
  const rawGrains = clean(ammo.bullet_weight_grains || ammo.weight_grains || ammo.bullet_weight || ammo.grain).replace(/\s*(grains?|gr)$/i, '');
  const grains = rawGrains ? `${rawGrains}gr` : '';

  const isReloaded = source.includes('reload') || source === 'reloading' || brand.toLowerCase() === 'reloaded';
  const displayBrand = ['reloaded', 'factory', 'handload'].includes(brand.toLowerCase()) ? '' : brand;
  const namePart = normalizeKey(bulletName).startsWith(normalizeKey(displayBrand))
    ? bulletName
    : [displayBrand, bulletName].filter(Boolean).join(' ');

  const parts = isReloaded
    ? ['Reloaded', batchNumber ? `Batch #${batchNumber}` : 'Batch unknown', namePart, grains, caliber]
    : ['Factory', lotNumber ? `Lot #${lotNumber}` : '', namePart, grains, caliber];

  return parts
    .filter(Boolean)
    .filter((part, index, list) => list.findIndex(item => normalizeKey(item) === normalizeKey(part)) === index)
    .join(' — ');
}