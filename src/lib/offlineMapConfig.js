const configuredMinZoom = Number(import.meta.env.VITE_OFFLINE_PMTILES_MIN_ZOOM || 5);
const configuredMaxZoom = Number(import.meta.env.VITE_OFFLINE_PMTILES_MAX_ZOOM || 14);

export const OFFLINE_MAP_NOT_CONFIGURED_MESSAGE = 'Offline map package URL not configured. Add a legal PMTiles package URL to enable offline map download.';

export const OFFLINE_MAP_CONFIG = {
  packageUrl: String(import.meta.env.VITE_OFFLINE_PMTILES_URL || '').trim(),
  packageName: import.meta.env.VITE_OFFLINE_PMTILES_NAME || 'Offline PMTiles package',
  regionName: import.meta.env.VITE_OFFLINE_PMTILES_REGION || 'User configured region',
  minZoom: Number.isFinite(configuredMinZoom) ? configuredMinZoom : 5,
  maxZoom: Number.isFinite(configuredMaxZoom) ? configuredMaxZoom : 14,
  bounds: null,
  sizeEstimate: import.meta.env.VITE_OFFLINE_PMTILES_SIZE_ESTIMATE || '',
  vectorLayers: {
    land: import.meta.env.VITE_OFFLINE_PMTILES_LAND_LAYER || 'landcover',
    water: import.meta.env.VITE_OFFLINE_PMTILES_WATER_LAYER || 'water',
    roads: import.meta.env.VITE_OFFLINE_PMTILES_ROADS_LAYER || 'transportation',
    places: import.meta.env.VITE_OFFLINE_PMTILES_PLACES_LAYER || 'place',
  },
};

export function hasConfiguredOfflineMapPackage() {
  return Boolean(OFFLINE_MAP_CONFIG.packageUrl);
}