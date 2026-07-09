import assert from 'node:assert/strict';
import { normalizeShotgunGauge, shotgunGaugeMatchesAmmunition } from '../../src/lib/gaugeUtils.js';

const equivalent12 = ['12 Gauge', '12 gauge', '12ga', '12 GA', '12'];
for (const value of equivalent12) {
  assert.equal(normalizeShotgunGauge(value), '12ga', `${value} should normalize to 12ga`);
}

assert.equal(shotgunGaugeMatchesAmmunition('12 Gauge', '12'), true);
assert.equal(shotgunGaugeMatchesAmmunition('12ga', '12 Gauge'), true);
assert.equal(shotgunGaugeMatchesAmmunition('20 Gauge', '12 Gauge'), false);
assert.equal(shotgunGaugeMatchesAmmunition('', '12 Gauge'), false);
assert.equal(shotgunGaugeMatchesAmmunition('12 Gauge', ''), true);

console.log('gaugeUtils tests passed');