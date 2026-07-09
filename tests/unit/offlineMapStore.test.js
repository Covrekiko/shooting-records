import assert from 'node:assert/strict';
import { buildOfflineAreaSnapshot, formatOfflineMapBytes } from '../../src/lib/offlineMapStore.js';

const area = {
  id: 'area1',
  name: 'North Wood',
  polygon_coordinates: [[51.0, -1.0], [51.0, -0.9], [51.1, -0.9], [51.1, -1.0]],
};
const snapshot = buildOfflineAreaSnapshot({
  area,
  markers: [
    { id: 'm1', latitude: 51.05, longitude: -0.95, marker_type: 'high_seat' },
    { id: 'm2', latitude: 51.06, longitude: -0.96, marker_type: 'feeding_area' },
    { id: 'm3', latitude: 52, longitude: -2, marker_type: 'high_seat' },
  ],
  harvests: [
    { id: 'h1', latitude: 51.05, longitude: -0.95 },
    { id: 'h2', latitude: 52, longitude: -2 },
  ],
});

assert.equal(snapshot.areaId, 'area1');
assert.equal(snapshot.boundaryPoints, 4);
assert.equal(snapshot.markerCount, 2);
assert.equal(snapshot.highSeatCount, 1);
assert.equal(snapshot.harvestCount, 1);
assert.equal(formatOfflineMapBytes(0), '0 B');
assert.equal(formatOfflineMapBytes(1536), '1.5 KB');

console.log('offline map store tests passed');