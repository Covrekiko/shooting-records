import assert from 'node:assert/strict';
import { buildLoadAnalysisRows, pickBestAnalysis, getVariantAxisLabel } from '../../src/lib/loadDevelopmentAnalysis.js';

const test = { test_type: 'Powder Charge' };
const variants = [
  { id: 'v1', label: '40.0', powder_charge_grains: 40 },
  { id: 'v2', label: '40.5', powder_charge_grains: 40.5 },
];
const results = [
  { variant_id: 'v1', tested: true, group_size_moa: 0.8, avg_velocity: 2600, es: 22, velocity_readings: [2590, 2600, 2610] },
  { variant_id: 'v2', tested: true, group_size_moa: 1.1, avg_velocity: 2650, es: 15, velocity_readings: [2648, 2650, 2652], is_best: true },
];

assert.equal(getVariantAxisLabel(variants[0], test), '40gr');
const rows = buildLoadAnalysisRows(test, variants, results);
const best = pickBestAnalysis(rows);
assert.equal(best.bestAccuracy.variant.id, 'v1');
assert.equal(best.lowestEs.variant.id, 'v2');
assert.equal(best.highestAvgVelocity.variant.id, 'v2');
assert.equal(best.lowestComparableSd.variant.id, 'v2');
assert.equal(best.preferred.variant.id, 'v2');

console.log('load development analysis tests passed');