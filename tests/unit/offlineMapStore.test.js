import assert from 'node:assert/strict';
import { buildLayerCapabilities, buildOfflineAreaSnapshot, calculateOfflineMapCoverage, formatOfflineMapBytes } from '../../src/lib/offlineMapStore.js';
import { buildOfflineBasemapRequest } from '../../src/lib/offlineBasemapProvider.js';

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

const coverage = calculateOfflineMapCoverage(area);
assert.deepEqual(coverage.bounds, { minLat: 51, maxLat: 51.1, minLng: -1, maxLng: -0.9 });
assert.equal(coverage.zoom.label, 'Stalking block');

const blocked = buildOfflineBasemapRequest({ area, bounds: coverage.bounds, zoom: coverage.zoom });
assert.equal(blocked.status, 'blocked');
assert.equal(blocked.requiresExternalConfig, true);

const capabilities = buildLayerCapabilities(['transportation', 'landcover', 'water', 'building', 'place']);
assert.equal(capabilities.roads, true);
assert.equal(capabilities.paths, true);
assert.equal(capabilities.woodland, true);
assert.equal(capabilities.water, true);
assert.equal(capabilities.buildings, true);
assert.equal(capabilities.labels, true);
assert.equal(capabilities.terrain, false);

console.log('offline map store tests passed');