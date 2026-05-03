export function formatAmmunitionLabel(ammo) {
  if (!ammo) return '';

  const isReloaded = ammo.ammo_type === 'reloaded' || ammo.source_type === 'reload_batch' || ammo.brand === 'Reloaded';
  const grains = ammo.grain ? `${ammo.grain}gr` : '';
  const bulletDetails = [ammo.bullet_type, grains].filter(Boolean).join(' ');

  if (isReloaded) {
    return ['Reloaded', bulletDetails, ammo.caliber].filter(Boolean).join(' ');
  }

  return [ammo.brand, bulletDetails, ammo.caliber].filter(Boolean).join(' ');
}