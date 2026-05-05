export const OFFLINE_MAP_CONFIG = {
  packageUrl: import.meta.env.VITE_OFFLINE_PMTILES_URL || '',
  packageName: import.meta.env.VITE_OFFLINE_PMTILES_NAME || 'Offline PMTiles package',
  regionName: import.meta.env.VITE_OFFLINE_PMTILES_REGION || 'User configured region',
  minZoom: Number(import.meta.env.VITE_OFFLINE_PMTILES_MIN_ZOOM || 5),
  maxZoom: Number(import.meta.env.VITE_OFFLINE_PMTILES_MAX_ZOOM || 14),
  bounds: null,
  sizeEstimate: import.meta.env.VITE_OFFLINE_PMTILES_SIZE_ESTIMATE || '',
  vectorLayers: {
    land: import.meta.env.VITE_OFFLINE_PMTILES_LAND_LAYER || 'land',
    water: import.meta.env.VITE_OFFLINE_PMTILES_WATER_LAYER || 'water',
    roads: import.meta.env.VITE_OFFLINE_PMTILES_ROADS_LAYER || 'roads',
    places: import.meta.env.VITE_OFFLINE_PMTILES_PLACES_LAYER || 'places',
  },
};

export function hasConfiguredOfflineMapPackage() {
  return Boolean(OFFLINE_MAP_CONFIG.packageUrl);
}