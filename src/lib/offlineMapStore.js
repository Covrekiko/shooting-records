import { offlineDB } from './offlineDB.js';

const STORE = 'offline_map_packages';

function makeId() {
  return `map_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function getBoundsFromArea(area) {
  const points = (area?.polygon_coordinates || [])
    .map((coord) => ({ lat: Number(coord[0]), lng: Number(coord[1]) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

  if (points.length === 0 && area?.center_point) {
    const lat = Number(area.center_point.lat);
    const lng = Number(area.center_point.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { minLat: lat - 0.02, maxLat: lat + 0.02, minLng: lng - 0.02, maxLng: lng + 0.02 };
    }
  }

  if (points.length === 0) return null;

  return {
    minLat: Math.min(...points.map((p) => p.lat)),
    maxLat: Math.max(...points.map((p) => p.lat)),
    minLng: Math.min(...points.map((p) => p.lng)),
    maxLng: Math.max(...points.map((p) => p.lng)),
  };
}

function getBoundsFromRadius(center, radiusKm) {
  const lat = Number(center?.lat);
  const lng = Number(center?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return { minLat: lat - latDelta, maxLat: lat + latDelta, minLng: lng - lngDelta, maxLng: lng + lngDelta };
}

function chooseZoomStrategy(type, bounds) {
  if (type === 'uk_overview') return { minzoom: 5, maxzoom: 10, label: 'UK overview' };
  if (!bounds) return { minzoom: 10, maxzoom: 13, label: 'Local area' };

  const latSpan = Math.abs(bounds.maxLat - bounds.minLat);
  const lngSpan = Math.abs(bounds.maxLng - bounds.minLng);
  const span = Math.max(latSpan, lngSpan);

  if (span < 0.02) return { minzoom: 13, maxzoom: 17, label: 'Detailed small area' };
  if (span < 0.12) return { minzoom: 13, maxzoom: 16, label: 'Stalking block' };
  return { minzoom: 10, maxzoom: 13, label: 'County/local area' };
}

export function formatOfflineMapBytes(bytes = 0) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export async function listOfflineMapPackages() {
  return (await offlineDB.getAll(STORE)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function getActiveOfflineMapPackage() {
  const packages = await listOfflineMapPackages();
  return packages.find((pkg) => pkg.status === 'ready') || null;
}

export async function deleteOfflineMapPackage(id) {
  await offlineDB.remove(STORE, id);
}

export async function estimateOfflineMapPackage(sourceUrl) {
  const response = await fetch(sourceUrl, { method: 'HEAD', cache: 'no-store' });
  const size = Number(response.headers.get('content-length') || 0);
  return { bytes: size, label: formatOfflineMapBytes(size) };
}

export function buildOfflineAreaSnapshot({ area, markers = [], harvests = [] }) {
  const bounds = getBoundsFromArea(area);
  const withinBounds = (item) => {
    if (!bounds) return true;
    const lat = Number(item.latitude);
    const lng = Number(item.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    return lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng;
  };
  const areaShareMatches = (item) => Boolean(area?.area_share_id && item.area_share_id && item.area_share_id === area.area_share_id);
  const overlayMarkers = markers.filter((marker) => marker.area_id === area?.id || areaShareMatches(marker) || withinBounds(marker));
  const overlayHarvests = harvests.filter((harvest) => harvest.area_id === area?.id || areaShareMatches(harvest) || withinBounds(harvest));
  return {
    areaId: area?.id || null,
    areaName: area?.name || 'Selected area',
    boundaryPoints: area?.polygon_coordinates?.length || 0,
    markerCount: overlayMarkers.length,
    highSeatCount: overlayMarkers.filter((marker) => marker.marker_type === 'high_seat').length,
    harvestCount: overlayHarvests.length,
    preparedAt: Date.now(),
  };
}

export async function prepareOfflineAreaPackage({ area, markers = [], harvests = [], name }) {
  if (!area?.id) throw new Error('Select an area before preparing offline use.');
  const bounds = getBoundsFromArea(area);
  const snapshot = buildOfflineAreaSnapshot({ area, markers, harvests });
  const record = {
    id: `area_${area.id}`,
    name: name || `${area.name} offline data`,
    type: 'area_overlays',
    regionName: area.name,
    bounds,
    zoom: chooseZoomStrategy('area', bounds),
    overlaySnapshot: snapshot,
    status: 'ready',
    progress: 100,
    sizeBytes: 0,
    sizeLabel: '0 B',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await offlineDB.put(STORE, record);
  return record;
}

export async function downloadOfflineMapPackage({ name, sourceUrl, type = 'custom', area, center, radiusKm, zoomOverride, regionName, onProgress, markers = [], harvests = [] }) {
  const bounds = type === 'radius' ? getBoundsFromRadius(center, radiusKm || 5) : getBoundsFromArea(area);
  const zoom = zoomOverride || chooseZoomStrategy(type, bounds);
  const id = makeId();

  await offlineDB.put(STORE, {
    id,
    name: name || area?.name || 'Offline map',
    sourceUrl,
    type,
    regionName,
    bounds,
    zoom,
    status: 'downloading',
    progress: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const response = await fetch(sourceUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error('Offline map download failed');

  const total = Number(response.headers.get('content-length') || 0);
  const reader = response.body?.getReader();
  const chunks = [];
  let received = 0;

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      const progress = total ? Math.round((received / total) * 100) : 0;
      onProgress?.(progress);
      await offlineDB.put(STORE, {
        id,
        name: name || area?.name || 'Offline map',
        sourceUrl,
        type,
        bounds,
        zoom,
        status: 'downloading',
        progress,
        sizeBytes: total || received,
        overlaySnapshot: buildOfflineAreaSnapshot({ area, markers, harvests }),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  const blob = new Blob(chunks, { type: 'application/octet-stream' });
  const record = {
    id,
    name: name || area?.name || 'Offline map',
    sourceUrl,
    type,
    regionName,
    bounds,
    zoom,
    blob,
    status: 'ready',
    progress: 100,
    sizeBytes: blob.size,
    sizeLabel: formatOfflineMapBytes(blob.size),
    overlaySnapshot: buildOfflineAreaSnapshot({ area, markers: [], harvests: [] }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await offlineDB.put(STORE, record);
  return record;
}

export async function getOfflineMapStorageSummary() {
  const packages = await listOfflineMapPackages();
  const totalBytes = packages.reduce((sum, pkg) => sum + Number(pkg.sizeBytes || 0), 0);
  const browserEstimate = navigator.storage?.estimate ? await navigator.storage.estimate() : null;
  return {
    packages,
    totalBytes,
    totalLabel: formatOfflineMapBytes(totalBytes),
    browserEstimate,
  };
}

export const offlineMapStore = {
  list: listOfflineMapPackages,
  active: getActiveOfflineMapPackage,
  remove: deleteOfflineMapPackage,
  estimate: estimateOfflineMapPackage,
  download: downloadOfflineMapPackage,
  prepareArea: prepareOfflineAreaPackage,
  summary: getOfflineMapStorageSummary,
};