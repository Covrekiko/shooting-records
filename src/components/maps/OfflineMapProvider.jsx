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

  return valid.reduce((bounds, point) => bounds.extend(point), new maplibregl.LngLatBounds(valid[0], valid[0]));
}

function toFeatureCollection(features) {
  return { type: 'FeatureCollection', features };
}

function makeStyle(pmtilesUrl) {
  const baseStyle = {
    version: 8,
    sources: {},
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e2e8f0' } }],
  };

  if (!pmtilesUrl) return baseStyle;

  const { land, water, roads, places } = OFFLINE_MAP_CONFIG.vectorLayers;

  return {
    version: 8,
    sources: {
      offline: {
        type: 'vector',
        url: `pmtiles://${pmtilesUrl}`,
      },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': '#e2e8f0' } },
      { id: 'land', type: 'fill', source: 'offline', 'source-layer': land, paint: { 'fill-color': '#e5e7eb' } },
      { id: 'water', type: 'fill', source: 'offline', 'source-layer': water, paint: { 'fill-color': '#bfdbfe' } },
      { id: 'roads', type: 'line', source: 'offline', 'source-layer': roads, paint: { 'line-color': '#ffffff', 'line-width': 1.2 } },
      { id: 'places', type: 'symbol', source: 'offline', 'source-layer': places, layout: { 'text-field': ['get', 'name'], 'text-size': 11 }, paint: { 'text-color': '#334155', 'text-halo-color': '#ffffff', 'text-halo-width': 1 } },
    ],
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
    const center = userLocation ? [userLocation.lng, userLocation.lat] : [-0.1278, 51.5074];

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
      if (!waitingForPin || !onMapClick) return;
      onMapClick({ lat: event.lngLat.lat, lng: event.lngLat.lng });
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
      if (pmtilesRef.current) protocol.remove(pmtilesRef.current);
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
      {!mapPackage && (
        <div className="absolute left-1/2 -translate-x-1/2 z-10 px-3 py-2 rounded-xl bg-card/90 border border-border shadow-lg text-xs font-semibold text-foreground map-overlay-top-center">
          {OFFLINE_MAP_NOT_CONFIGURED_MESSAGE}
        </div>
      )}
    </div>
  );
}