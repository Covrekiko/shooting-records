import assert from 'node:assert/strict';
import {
  calculatePopulationSD,
  calculateSampleSD,
  getVelocityReadings,
  parsePastedVelocities,
  summarizeReadings,
} from '../../src/utils/loadDevelopmentStatistics.js';

assert.equal(Math.round(calculateSampleSD([1, 2, 3]) * 1000) / 1000, 1);
assert.equal(Math.round(calculatePopulationSD([1, 2, 3]) * 1000) / 1000, 0.816);

const legacy = getVelocityReadings({ velocity_1: 2600, velocity_2: '2610', velocity_3: null, velocity_4: 0, velocity_5: 2620 });
assert.deepEqual(legacy.map((r) => r.velocity), [2600, 2610, 2620], 'legacy velocity_1-5 normalizes without mutating history');

const dynamic = getVelocityReadings({ velocity_readings: Array.from({ length: 20 }, (_, i) => ({ shot_number: i + 1, velocity: 2500 + i, included: i !== 5 })) });
assert.equal(dynamic.length, 20, '20-shot strings are retained');
assert.equal(dynamic[5].included, false, 'excluded readings remain stored');

const summary = summarizeReadings([{ velocity: 2600 }, { velocity: 2610, included: false }, { velocity: 2620 }]);
assert.equal(summary.recordedCount, 3);
assert.equal(summary.includedCount, 2);
assert.equal(summary.avg, 2610);
assert.equal(summary.es, 20);
assert.equal(summary.sd, 14.1);

const paste = parsePastedVelocities('2600, 2610\nbad 2620 0 -1 2630fps');
assert.deepEqual(paste.values, [2600, 2610, 2620]);
assert.deepEqual(paste.invalid, ['bad', '0', '-1', '2630fps']);

console.log('load development statistics tests passed');