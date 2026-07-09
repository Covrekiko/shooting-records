export function fpsToMetersPerSecond(fps) {
  const n = Number(fps);
  return Number.isFinite(n) ? n * 0.3048 : null;
}

export function metersPerSecondToFps(ms) {
  const n = Number(ms);
  return Number.isFinite(n) ? n / 0.3048 : null;
}

export function normalizeVelocityToFps(value, unit = 'fps') {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return unit === 'm/s' || unit === 'ms' || unit === 'mps' ? metersPerSecondToFps(n) : n;
}