// Shared group size calculation logic used across all target analysis methods

export function mmToMoa(mm, distanceM) {
  if (!mm || !distanceM) return 0;
  return (mm / (distanceM / 100)) / 29.088;
}

export function mmToMrad(mm, distanceM) {
  if (!mm || !distanceM) return 0;
  return mm / distanceM;
}

export function inchesToMm(inches) {
  return inches * 25.4;
}

export function cmToMm(cm) {
  return cm * 10;
}

/**
 * Calculate group size in pixels from bullet hole marks
 * @param {Array} marks - Array of {x, y} coordinates in pixels
 * @returns {number} - Maximum distance in pixels (group size)
 */
export function calcGroupSizePixels(marks) {
  if (!marks || marks.length < 2) return 0;
  let maxDist = 0;
  for (let i = 0; i < marks.length; i++) {
    for (let j = i + 1; j < marks.length; j++) {
      const d = Math.sqrt(
        Math.pow(marks[i].x - marks[j].x, 2) + Math.pow(marks[i].y - marks[j].y, 2)
      );
      if (d > maxDist) maxDist = d;
    }
  }
  return maxDist;
}

/**
 * Convert pixel group size to various units
 * @param {number} groupPx - Group size in pixels
 * @param {number} scalePx - Scale in mm per pixel
 * @param {number} distanceM - Distance in meters
 * @returns {object} - Group sizes in mm, moa, mrad, inches
 */
export function convertGroupSize(groupPx, scalePx, distanceM) {
  const mm = groupPx * scalePx;
  const moa = mmToMoa(mm, distanceM);
  const mrad = mmToMrad(mm, distanceM);
  const inches = mm / 25.4;

  // Safety checks
  if (!isFinite(moa) || !isFinite(mrad) || !isFinite(inches)) {
    return null;
  }

  return {
    mm: Math.round(mm * 10) / 10,
    moa: Math.round(moa * 100) / 100,
    mrad: Math.round(mrad * 1000) / 1000,
    inches: Math.round(inches * 100) / 100,
  };
}

/**
 * Full calculation pipeline: marks -> group size in all units
 * @param {Array} marks - Array of {x, y} coordinates
 * @param {number} scalePx - Scale factor (mm per pixel)
 * @param {number} distance - Session distance
 * @param {string} distanceUnit - 'm' or 'yards'
 * @returns {object|null} - Group size metrics or null if invalid
 */
export function calculateGroupMetrics(marks, scalePx, distance, distanceUnit) {
  if (!marks || marks.length < 2 || !scalePx || !distance) return null;

  const groupPx = calcGroupSizePixels(marks);
  const distM = distanceUnit === 'yards' ? distance * 0.9144 : distance;

  return convertGroupSize(groupPx, scalePx, distM);
}