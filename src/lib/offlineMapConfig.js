const env = /** @type {any} */ (import.meta.env || {});
const configuredMinZoom = Number(env.VITE_OFFLINE_PMTILES_MIN_ZOOM || 5);
const configuredMaxZoom = Number(env.VITE_OFFLINE_PMTILES_MAX_ZOOM || 14);

export const OFFLINE_MAP_NOT_CONFIGURED_MESSAGE = 'BLOCKED — EXTERNAL OFFLINE BASEMAP PROVIDER CONFIGURATION REQUIRED. Configure a legal offline PMTiles provider or package URL; Google Maps tiles are not cached.';

export const OFFLINE_MAP_CONFIG = {
  providerName: env.VITE_OFFLINE_BASEMAP_PROVIDER_NAME || 'Legal offline PMTiles provider',
  areaPackageUrlTemplate: String(env.VITE_OFFLINE_BASEMAP_AREA_URL_TEMPLATE || '').trim(),
  packageUrl: String(env.VITE_OFFLINE_PMTILES_URL || '').trim(),
  packageName: env.VITE_OFFLINE_PMTILES_NAME || 'Offline PMTiles package',
  regionName: env.VITE_OFFLINE_PMTILES_REGION || 'User configured region',
  minZoom: Number.isFinite(configuredMinZoom) ? configuredMinZoom : 5,
  maxZoom: Number.isFinite(configuredMaxZoom) ? configuredMaxZoom : 14,
  bounds: null,
  sizeEstimate: env.VITE_OFFLINE_PMTILES_SIZE_ESTIMATE || '',
  vectorLayers: {
    land: env.VITE_OFFLINE_PMTILES_LAND_LAYER || 'landcover',
    water: env.VITE_OFFLINE_PMTILES_WATER_LAYER || 'water',
    roads: env.VITE_OFFLINE_PMTILES_ROADS_LAYER || 'transportation',
    places: env.VITE_OFFLINE_PMTILES_PLACES_LAYER || 'place',
  },
};

export function hasConfiguredOfflineMapPackage() {
  return Boolean(OFFLINE_MAP_CONFIG.areaPackageUrlTemplate || OFFLINE_MAP_CONFIG.packageUrl);
}