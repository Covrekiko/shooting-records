import { offlineDB } from './offlineDB.js';

const STORE = 'offline_map_packages';

function makeId() {
  return `map_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function getBoundsFromArea(area) {
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

export function chooseZoomStrategy(type, bounds) {
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
  return packages.find((pkg) => pkg.status === 'ready' && pkg.blob) || packages.find((pkg) => pkg.status === 'ready') || null;
}

export async function deleteOfflineMapPackage(id) {
  await offlineDB.remove(STORE, id);
}

export async function estimateOfflineMapPackage(sourceUrl) {
  const response = await fetch(sourceUrl, { method: 'HEAD', cache: 'no-store' });
  const size = Number(response.headers.get('content-length') || 0);
  return { bytes: size, label: formatOfflineMapBytes(size) };
}

export function calculateOfflineMapCoverage(area) {
  const bounds = getBoundsFromArea(area);
  const zoom = chooseZoomStrategy('area', bounds);
  return { bounds, zoom };
}

async function verifyPmtilesBlob(blob) {
  if (!blob || blob.size < 127) return { ok: false, reason: 'Downloaded basemap is empty or incomplete.' };
  const header = new Uint8Array(await blob.slice(0, 7).arrayBuffer());
  const magic = String.fromCharCode(...header);
  if (magic !== 'PMTiles') return { ok: false, reason: 'Downloaded file is not a valid PMTiles package.' };
  return { ok: true, checkedAt: Date.now(), sizeBytes: blob.size };
}

export function buildLayerCapabilities(layerNames = []) {
  const hasAny = (names) => names.some((name) => layerNames.includes(name));
  return {
    roads: hasAny(['transportation', 'roads', 'road', 'transportation_lines']),
    paths: hasAny(['transportation', 'roads', 'road', 'transportation_lines']),
    woodland: hasAny(['landcover', 'landuse', 'landcover_wood', 'woodland', 'forest']),
    water: hasAny(['water', 'waterway', 'water_polygons']),
    buildings: hasAny(['building', 'buildings']),
    labels: hasAny(['place', 'places', 'poi', 'pois', 'transportation_name']),
    terrain: hasAny(['terrain', 'hillshade', 'contour', 'contours']),
  };
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

export async function prepareOfflineAreaPackage({ area, markers = [], harvests = [], name = null }) {
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

export async function readOfflineMapResponseBlob(response, onProgress = null) {
  const total = Number(response.headers?.get?.('content-length') || 0);
  const reader = response.body?.getReader?.();

  if (!reader) {
    const blob = await response.blob();
    onProgress?.(100);
    return blob;
  }

  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress?.(total ? Math.min(100, Math.round((received / total) * 100)) : 0);
  }
  onProgress?.(100);
  return new Blob(chunks, { type: 'application/octet-stream' });
}

export async function downloadOfflineMapPackage({ id: requestedId = null, name = null, sourceUrl, type = 'custom', area = null, center = null, radiusKm = null, zoomOverride = null, regionName = '', onProgress = null, markers = [], harvests = [] }) {
  const bounds = type === 'radius' ? getBoundsFromRadius(center, radiusKm || 5) : getBoundsFromArea(area);
  const zoom = zoomOverride || chooseZoomStrategy(type, bounds);
  const id = requestedId || (area?.id ? `basemap_area_${area.id}` : makeId());
  const packageName = name || area?.name || 'Offline map';
  const createdAt = Date.now();

  await offlineDB.put(STORE, {
    id,
    name: packageName,
    sourceUrl,
    type,
    regionName,
    bounds,
    zoom,
    status: 'downloading',
    progress: 0,
    createdAt,
    updatedAt: Date.now(),
  });

  try {
    const response = await fetch(sourceUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('Offline map download failed');

    const blob = await readOfflineMapResponseBlob(response, async (progress) => {
      onProgress?.(progress);
      await offlineDB.put(STORE, {
        id,
        name: packageName,
        sourceUrl,
        type,
        regionName,
        bounds,
        zoom,
        status: 'downloading',
        progress,
        sizeBytes: Number(response.headers?.get?.('content-length') || 0) || undefined,
        overlaySnapshot: buildOfflineAreaSnapshot({ area, markers, harvests }),
        createdAt,
        updatedAt: Date.now(),
      });
    });

    const integrity = await verifyPmtilesBlob(blob);
    if (!integrity.ok) throw new Error(integrity.reason);

    const record = {
      id,
      name: packageName,
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
      integrity,
      layerCapabilities: buildLayerCapabilities([]),
      overlaySnapshot: buildOfflineAreaSnapshot({ area, markers, harvests }),
      createdAt,
      updatedAt: Date.now(),
    };

    await offlineDB.put(STORE, record);
    return record;
  } catch (error) {
    await offlineDB.put(STORE, {
      id,
      name: packageName,
      sourceUrl,
      type,
      regionName,
      bounds,
      zoom,
      status: 'failed',
      progress: 100,
      lastError: error?.message || 'Offline map download failed',
      overlaySnapshot: buildOfflineAreaSnapshot({ area, markers, harvests }),
      createdAt,
      updatedAt: Date.now(),
    });
    throw error;
  }
}

export async function importOfflineMapPackageFromFile({ file, name, regionName }) {
  if (!file) throw new Error('Select a PMTiles file to import.');
  const integrity = await verifyPmtilesBlob(file);
  if (!integrity.ok) throw new Error(integrity.reason);
  const record = {
    id: makeId(),
    name: name || file.name || 'Imported offline basemap',
    sourceUrl: 'local-file',
    type: 'pmtiles_import',
    regionName: regionName || file.name || 'Imported region',
    bounds: null,
    zoom: { minzoom: 5, maxzoom: 16, label: 'Imported PMTiles' },
    blob: file,
    status: 'ready',
    progress: 100,
    sizeBytes: file.size || 0,
    sizeLabel: formatOfflineMapBytes(file.size || 0),
    integrity,
    layerCapabilities: buildLayerCapabilities([]),
    overlaySnapshot: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await offlineDB.put(STORE, record);
  return record;
}

export async function refreshOfflineMapPackage({ packageRecord, area, markers = [], harvests = [], onProgress }) {
  if (!packageRecord?.sourceUrl || packageRecord.sourceUrl === 'local-file') {
    throw new Error('Imported PMTiles packages cannot be refreshed automatically. Re-import an updated package instead.');
  }
  return downloadOfflineMapPackage({
    id: packageRecord.id,
    name: packageRecord.name,
    sourceUrl: packageRecord.sourceUrl,
    type: packageRecord.type,
    area,
    zoomOverride: packageRecord.zoom,
    regionName: packageRecord.regionName,
    markers,
    harvests,
    onProgress,
  });
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
  refresh: refreshOfflineMapPackage,
  importFile: importOfflineMapPackageFromFile,
  prepareArea: prepareOfflineAreaPackage,
  summary: getOfflineMapStorageSummary,
};