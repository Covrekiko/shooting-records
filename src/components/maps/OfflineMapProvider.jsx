import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol, PMTiles } from 'pmtiles';
import { getActiveOfflineMapPackage } from '@/lib/offlineMapStore';
import { OFFLINE_MAP_CONFIG, OFFLINE_MAP_NOT_CONFIGURED_MESSAGE } from '@/lib/offlineMapConfig';

let protocolRegistered = false;
const protocol = new Protocol();

function registerProtocol() {
  if (protocolRegistered) return;
  maplibregl.addProtocol('pmtiles', protocol.tile);
  protocolRegistered = true;
}

function boundsFromData({ areas = [], markers = [], harvests = [], userLocation, activeTrack = [] }) {
  const points = [];
  areas.forEach((area) => (area.polygon_coordinates || []).forEach((coord) => points.push([Number(coord[1]), Number(coord[0])])));
  markers.forEach((marker) => points.push([Number(marker.longitude), Number(marker.latitude)]));
  harvests.forEach((harvest) => points.push([Number(harvest.longitude), Number(harvest.latitude)]));
  activeTrack.forEach((point) => points.push([Number(point.lng), Number(point.lat)]));
  if (userLocation) points.push([Number(userLocation.lng), Number(userLocation.lat)]);

  const valid = points.filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat));
  if (valid.length === 0) return null;

  const first = /** @type {[number, number]} */ (valid[0]);
  return valid.reduce((bounds, point) => bounds.extend(/** @type {[number, number]} */ (point)), new maplibregl.LngLatBounds(first, first));
}

/** @returns {any} */
function toFeatureCollection(features) {
  return { type: 'FeatureCollection', features };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function makeStyle(pmtilesUrl) {
  /** @type {any} */
  const baseStyle = {
    version: 8,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e2e8f0' } }],
  };

  if (!pmtilesUrl) return baseStyle;

  const configured = OFFLINE_MAP_CONFIG.vectorLayers;
  const layerCandidates = {
    land: unique([configured.land, 'landcover', 'landuse', 'landcover_wood', 'woodland', 'forest']),
    water: unique([configured.water, 'water', 'waterway', 'water_polygons']),
    roads: unique([configured.roads, 'transportation', 'roads', 'road', 'transportation_lines']),
    buildings: unique(['building', 'buildings']),
    labels: unique([configured.places, 'place', 'places', 'poi', 'transportation_name']),
  };

  /** @type {any[]} */
  const layers = [{ id: 'background', type: 'background', paint: { 'background-color': '#e2e8f0' } }];
  layerCandidates.land.forEach((layer) => layers.push({ id: `land-${layer}`, type: 'fill', source: 'offline', 'source-layer': layer, paint: { 'fill-color': '#d9ead3', 'fill-opacity': 0.74 } }));
  layerCandidates.water.forEach((layer) => layers.push({ id: `water-${layer}`, type: 'fill', source: 'offline', 'source-layer': layer, paint: { 'fill-color': '#bfdbfe', 'fill-opacity': 0.9 } }));
  layerCandidates.buildings.forEach((layer) => layers.push({ id: `buildings-${layer}`, type: 'fill', source: 'offline', 'source-layer': layer, paint: { 'fill-color': '#d6d3d1', 'fill-opacity': 0.65 } }));
  layerCandidates.roads.forEach((layer) => {
    layers.push({ id: `paths-${layer}`, type: 'line', source: 'offline', 'source-layer': layer, filter: ['in', ['get', 'class'], ['literal', ['path', 'track', 'footway', 'bridleway', 'minor', 'service']]], paint: { 'line-color': '#a16207', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 15, 1.8], 'line-dasharray': [1.5, 1] } });
    layers.push({ id: `roads-${layer}`, type: 'line', source: 'offline', 'source-layer': layer, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.7, 15, 3], 'line-opacity': 0.92 } });
  });
  layerCandidates.labels.forEach((layer) => layers.push({ id: `labels-${layer}`, type: 'symbol', source: 'offline', 'source-layer': layer, layout: { 'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']], 'text-size': 11 }, paint: { 'text-color': '#334155', 'text-halo-color': '#ffffff', 'text-halo-width': 1 } }));

  return {
    version: 8,
    sources: { offline: { type: 'vector', url: `pmtiles://${pmtilesUrl}` } },
    layers,
  };
}

export default function OfflineMapProvider({
  areas = [],
  markers = [],
  harvests = [],
  userLocation,
  activeTrack = [],
  selectedAreaId,
  waitingForPin,
  onMapClick,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const pmtilesRef = useRef(null);
  const objectUrlRef = useRef(null);
  const waitingForPinRef = useRef(waitingForPin);
  const onMapClickRef = useRef(onMapClick);
  const [mapPackage, setMapPackage] = useState(null);

  const overlayData = useMemo(() => {
    const areaFeatures = areas.map((area) => ({
      type: 'Feature',
      properties: { id: area.id, name: area.name, selected: selectedAreaId === area.id },
      geometry: {
        type: 'Polygon',
        coordinates: [[...(area.polygon_coordinates || []).map((coord) => [Number(coord[1]), Number(coord[0])])]],
      },
    })).filter((feature) => feature.geometry.coordinates[0].length >= 3);

    const poiFeatures = markers.map((marker) => ({
      type: 'Feature',
      properties: { label: marker.title || String(marker.marker_type || 'POI').replace(/_/g, ' '), type: marker.marker_type || 'poi' },
      geometry: { type: 'Point', coordinates: [Number(marker.longitude), Number(marker.latitude)] },
    })).filter((feature) => feature.geometry.coordinates.every(Number.isFinite));

    const harvestFeatures = harvests.map((harvest) => ({
      type: 'Feature',
      properties: { label: harvest.species || 'Cull', type: 'harvest' },
      geometry: { type: 'Point', coordinates: [Number(harvest.longitude), Number(harvest.latitude)] },
    })).filter((feature) => feature.geometry.coordinates.every(Number.isFinite));

    const trackFeature = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: activeTrack.map((p) => [Number(p.lng), Number(p.lat)]).filter((coord) => coord.every(Number.isFinite)) },
    };

    const userFeature = userLocation && Number.isFinite(Number(userLocation.lng)) && Number.isFinite(Number(userLocation.lat))
      ? { type: 'Feature', properties: { label: 'My GPS' }, geometry: { type: 'Point', coordinates: [Number(userLocation.lng), Number(userLocation.lat)] } }
      : null;

    return { areaFeatures, poiFeatures, harvestFeatures, trackFeature, userFeature };
  }, [areas, markers, harvests, userLocation, activeTrack, selectedAreaId]);

  useEffect(() => {
    waitingForPinRef.current = waitingForPin;
    onMapClickRef.current = onMapClick;
  }, [waitingForPin, onMapClick]);

  useEffect(() => {
    getActiveOfflineMapPackage().then(setMapPackage);
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    registerProtocol();

    let pmtilesUrl = null;
    if (mapPackage?.blob) {
      objectUrlRef.current = URL.createObjectURL(mapPackage.blob);
      pmtilesUrl = objectUrlRef.current;
      pmtilesRef.current = new PMTiles(pmtilesUrl);
      protocol.add(pmtilesRef.current);
    }

    const bounds = boundsFromData({ areas, markers, harvests, userLocation, activeTrack });
    const center = /** @type {[number, number]} */ (userLocation ? [Number(userLocation.lng), Number(userLocation.lat)] : [-0.1278, 51.5074]);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: makeStyle(pmtilesUrl),
      center,
      zoom: mapPackage?.zoom?.maxzoom ? Math.min(mapPackage.zoom.maxzoom, 14) : 12,
      attributionControl: false,
    });

    mapRef.current = map;
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    map.on('click', (event) => {
      if (!waitingForPinRef.current || !onMapClickRef.current) return;
      onMapClickRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
    });

    map.on('error', (event) => {
      console.warn('[offline-map] MapLibre offline map warning:', event?.error?.message || event?.message || event);
    });

    map.on('load', () => {
      map.addSource('areas-overlay', { type: 'geojson', data: toFeatureCollection(overlayData.areaFeatures) });
      map.addLayer({ id: 'areas-fill', type: 'fill', source: 'areas-overlay', paint: { 'fill-color': ['case', ['get', 'selected'], '#f59e0b', '#2563eb'], 'fill-opacity': 0.14 } });
      map.addLayer({ id: 'areas-line', type: 'line', source: 'areas-overlay', paint: { 'line-color': ['case', ['get', 'selected'], '#f59e0b', '#2563eb'], 'line-width': ['case', ['get', 'selected'], 4, 3] } });

      map.addSource('track-overlay', { type: 'geojson', data: toFeatureCollection(overlayData.trackFeature.geometry.coordinates.length > 1 ? [overlayData.trackFeature] : []) });
      map.addLayer({ id: 'gps-track', type: 'line', source: 'track-overlay', paint: { 'line-color': '#3b82f6', 'line-width': 4, 'line-opacity': 0.8 } });

      map.addSource('poi-overlay', { type: 'geojson', data: toFeatureCollection(overlayData.poiFeatures) });
      map.addLayer({ id: 'poi-points', type: 'circle', source: 'poi-overlay', paint: { 'circle-radius': 7, 'circle-color': '#16a34a', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });
      map.addLayer({ id: 'poi-labels', type: 'symbol', source: 'poi-overlay', layout: { 'text-field': ['get', 'label'], 'text-offset': [0, 1.2], 'text-size': 12 }, paint: { 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 1 } });

      map.addSource('harvest-overlay', { type: 'geojson', data: toFeatureCollection(overlayData.harvestFeatures) });
      map.addLayer({ id: 'harvest-points', type: 'circle', source: 'harvest-overlay', paint: { 'circle-radius': 8, 'circle-color': '#dc2626', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } });

      map.addSource('user-overlay', { type: 'geojson', data: toFeatureCollection(overlayData.userFeature ? [overlayData.userFeature] : []) });
      map.addLayer({ id: 'user-location', type: 'circle', source: 'user-overlay', paint: { 'circle-radius': 8, 'circle-color': '#2563eb', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } });

      if (bounds) map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 0 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      if (pmtilesRef.current) /** @type {any} */ (protocol).remove?.(pmtilesRef.current);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, [mapPackage]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    map.getSource('areas-overlay')?.setData(toFeatureCollection(overlayData.areaFeatures));
    map.getSource('track-overlay')?.setData(toFeatureCollection(overlayData.trackFeature.geometry.coordinates.length > 1 ? [overlayData.trackFeature] : []));
    map.getSource('poi-overlay')?.setData(toFeatureCollection(overlayData.poiFeatures));
    map.getSource('harvest-overlay')?.setData(toFeatureCollection(overlayData.harvestFeatures));
    map.getSource('user-overlay')?.setData(toFeatureCollection(overlayData.userFeature ? [overlayData.userFeature] : []));
  }, [overlayData]);

  return (
    <div className="absolute inset-0 bg-slate-200 dark:bg-slate-950">
      <div ref={containerRef} className="absolute inset-0" />
      {(!mapPackage || !mapPackage.blob) && (
        <div className="absolute left-1/2 -translate-x-1/2 z-10 px-3 py-2 rounded-xl bg-card/90 border border-border shadow-lg text-xs font-semibold text-foreground map-overlay-top-center">
          {mapPackage ? 'Offline overlays ready — no offline basemap package installed.' : OFFLINE_MAP_NOT_CONFIGURED_MESSAGE}
        </div>
      )}
    </div>
  );
}