import assert from 'node:assert/strict';
import { calculateSampleSD, calculatePopulationSD, parsePastedVelocities, summarizeReadings } from '../../src/utils/loadDevelopmentStatistics.js';

assert.equal(Math.round(calculateSampleSD([1, 2, 3]) * 1000) / 1000, 1);
assert.equal(Math.round(calculatePopulationSD([1, 2, 3]) * 1000) / 1000, 0.816);
assert.deepEqual(parsePastedVelocities('2600, 2610\nbad 2620').values, [2600, 2610, 2620]);
const summary = summarizeReadings([{ velocity: 2600 }, { velocity: 2610, included: false }, { velocity: 2620 }]);
assert.equal(summary.includedCount, 2);
assert.equal(summary.avg, 2610);
assert.equal(summary.es, 20);

console.log('load development statistics tests passed');