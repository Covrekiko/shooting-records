import assert from 'node:assert/strict';
import { fpsToMetersPerSecond, metersPerSecondToFps, normalizeVelocityToFps } from '../../src/lib/unitConversions.js';
import { parseChronographCsv } from '../../src/lib/chronographImport.js';
import { groupSizeMoa, groupSizeMrad } from '../../src/lib/ballisticMath.js';

assert.equal(Math.round(fpsToMetersPerSecond(1000) * 10) / 10, 304.8);
assert.equal(Math.round(metersPerSecondToFps(304.8)), 1000);
assert.equal(Math.round(normalizeVelocityToFps(800, 'm/s')), 2625);
assert.deepEqual(parseChronographCsv('shot,velocity\n1,2600\n2,2610').values, [2600, 2610]);
assert.equal(Math.round(groupSizeMoa(29.1, 100) * 100) / 100, 1);
assert.equal(Math.round(groupSizeMrad(100, 100) * 100) / 100, 1);

console.log('measurement logic tests passed');