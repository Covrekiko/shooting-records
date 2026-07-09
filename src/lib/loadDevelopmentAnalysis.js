import { getSdAssessment } from '../utils/loadDevelopmentStatistics.js';

export function getVariantAxisLabel(variant, test = {}) {
  if (variant?.powder_charge_grains !== undefined && variant?.powder_charge_grains !== null && variant?.powder_charge_grains !== '') return `${variant.powder_charge_grains}gr`;
  if (variant?.seating_depth) return `${variant.seating_depth}`;
  if (variant?.coal_oal) return `${variant.coal_oal}`;
  if (variant?.cbto) return `${variant.cbto}`;
  return variant?.label || test?.test_type || 'Variant';
}

export function buildLoadAnalysisRows(test, variants = [], results = []) {
  return variants.map((variant) => {
    const result = results.find((r) => r.variant_id === variant.id) || null;
    const sdAssessment = getSdAssessment(result);
    return {
      variant,
      result,
      label: variant.label || getVariantAxisLabel(variant, test),
      axis: getVariantAxisLabel(variant, test),
      groupSize: numberOrNull(result?.group_size_moa),
      avgVelocity: numberOrNull(result?.avg_velocity),
      es: numberOrNull(result?.es),
      sd: sdAssessment.value,
      sdComparable: sdAssessment.comparable,
      includedReadings: sdAssessment.includedCount || 0,
      complete: Boolean(result?.tested),
      preferred: Boolean(result?.is_best),
    };
  });
}

export function pickBestAnalysis(rows) {
  const tested = rows.filter((row) => row.complete);
  return {
    bestAccuracy: minBy(tested.filter((row) => row.groupSize !== null), 'groupSize'),
    lowestComparableSd: minBy(tested.filter((row) => row.sd !== null && row.sdComparable), 'sd'),
    lowestEs: minBy(tested.filter((row) => row.es !== null), 'es'),
    highestAvgVelocity: maxBy(tested.filter((row) => row.avgVelocity !== null), 'avgVelocity'),
    preferred: tested.find((row) => row.preferred) || null,
  };
}

function numberOrNull(value) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function minBy(rows, key) {
  return rows.reduce((best, row) => !best || row[key] < best[key] ? row : best, null);
}

function maxBy(rows, key) {
  return rows.reduce((best, row) => !best || row[key] > best[key] ? row : best, null);
}