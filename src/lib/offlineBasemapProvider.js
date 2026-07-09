import { OFFLINE_MAP_CONFIG } from './offlineMapConfig.js';

function replaceToken(template, token, value) {
  return template.replaceAll(`{${token}}`, encodeURIComponent(String(value)));
}

export function buildOfflineBasemapRequest({ area, bounds, zoom }) {
  const template = OFFLINE_MAP_CONFIG.areaPackageUrlTemplate;
  const fallbackUrl = OFFLINE_MAP_CONFIG.packageUrl;
  const selectedBounds = bounds || null;
  const minzoom = zoom?.minzoom ?? OFFLINE_MAP_CONFIG.minZoom;
  const maxzoom = zoom?.maxzoom ?? OFFLINE_MAP_CONFIG.maxZoom;

  if (template && selectedBounds) {
    let sourceUrl = template;
    sourceUrl = replaceToken(sourceUrl, 'minLat', selectedBounds.minLat.toFixed(6));
    sourceUrl = replaceToken(sourceUrl, 'maxLat', selectedBounds.maxLat.toFixed(6));
    sourceUrl = replaceToken(sourceUrl, 'minLng', selectedBounds.minLng.toFixed(6));
    sourceUrl = replaceToken(sourceUrl, 'maxLng', selectedBounds.maxLng.toFixed(6));
    sourceUrl = replaceToken(sourceUrl, 'bbox', `${selectedBounds.minLng.toFixed(6)},${selectedBounds.minLat.toFixed(6)},${selectedBounds.maxLng.toFixed(6)},${selectedBounds.maxLat.toFixed(6)}`);
    sourceUrl = replaceToken(sourceUrl, 'minZoom', minzoom);
    sourceUrl = replaceToken(sourceUrl, 'maxZoom', maxzoom);
    sourceUrl = replaceToken(sourceUrl, 'areaId', area?.id || 'selected-area');
    return {
      status: 'ready',
      mode: 'area_package',
      sourceUrl,
      providerName: OFFLINE_MAP_CONFIG.providerName,
      requiresExternalConfig: false,
    };
  }

  if (fallbackUrl) {
    return {
      status: 'ready',
      mode: 'configured_package',
      sourceUrl: fallbackUrl,
      providerName: OFFLINE_MAP_CONFIG.providerName,
      requiresExternalConfig: false,
    };
  }

  return {
    status: 'blocked',
    mode: 'not_configured',
    sourceUrl: '',
    providerName: OFFLINE_MAP_CONFIG.providerName,
    requiresExternalConfig: true,
    message: 'BLOCKED — EXTERNAL OFFLINE BASEMAP PROVIDER CONFIGURATION REQUIRED',
  };
}

export function hasOfflineBasemapProviderConfiguration() {
  return Boolean(OFFLINE_MAP_CONFIG.areaPackageUrlTemplate || OFFLINE_MAP_CONFIG.packageUrl);
}