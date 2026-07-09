export function normalizeShotgunGauge(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';

  const compact = raw
    .replace(/gauge/g, 'ga')
    .replace(/bore/g, 'ga')
    .replace(/[^a-z0-9.]/g, '');

  const match = compact.match(/^(\d+(?:\.\d+)?)(?:ga)?$/);
  return match ? `${Number(match[1])}ga` : compact;
}

export function shotgunGaugeMatchesAmmunition(ammunitionCaliber, shotgunGauge) {
  const ammoGauge = normalizeShotgunGauge(ammunitionCaliber);
  const firearmGauge = normalizeShotgunGauge(shotgunGauge);
  if (!firearmGauge) return true;
  if (!ammoGauge) return false;
  return ammoGauge === firearmGauge;
}