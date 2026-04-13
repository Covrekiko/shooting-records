import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import { useState } from 'react';
import { Map, Satellite, Trash2 } from 'lucide-react';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Import leaflet-draw
import 'leaflet-draw';

function DrawControl({ onDataChange, mapData }) {
  const map = useMap();
  const featureGroupRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Create feature group for storing drawn items
    const featureGroup = L.featureGroup();
    featureGroup.addTo(map);
    featureGroupRef.current = featureGroup;

    // Add draw control
    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polygon: true,
        marker: true,
        rectangle: false,
        circle: false,
        circlemarker: false,
        polyline: false,
      },
      edit: {
        featureGroup: featureGroup,
      },
    });
    map.addControl(drawControl);

    // Handle draw events
    const handleCreated = (e) => {
      featureGroup.addLayer(e.layer);
      updateMapData();
    };

    const handleEdited = () => {
      updateMapData();
    };

    const handleDeleted = () => {
      updateMapData();
    };

    const updateMapData = () => {
      const geoJson = featureGroup.toGeoJSON();
      onDataChange(geoJson);
    };

    // Load existing data if provided
    if (mapData && mapData.features) {
      L.geoJSON(mapData, {
        onEachFeature: (feature, layer) => {
          featureGroup.addLayer(layer);
        },
      });
    }

    map.on('draw:created', handleCreated);
    map.on('draw:edited', handleEdited);
    map.on('draw:deleted', handleDeleted);

    return () => {
      map.off('draw:created', handleCreated);
      map.off('draw:edited', handleEdited);
      map.off('draw:deleted', handleDeleted);
      map.removeControl(drawControl);
      map.removeLayer(featureGroup);
    };
  }, [map, onDataChange]);

  return null;
}

export default function BoundaryMapEditor({ initialCenter, onDataChange, mapData = {} }) {
  const [mapType, setMapType] = useState('map');
  const center = initialCenter || [54.5973, -3.1578]; // Default to UK center

  const clearAll = () => {
    onDataChange(null);
    window.location.reload();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMapType('map')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium ${
            mapType === 'map'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary hover:bg-secondary/80'
          }`}
        >
          <Map className="w-4 h-4" />
          Map
        </button>
        <button
          onClick={() => setMapType('satellite')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium ${
            mapType === 'satellite'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary hover:bg-secondary/80'
          }`}
        >
          <Satellite className="w-4 h-4" />
          Satellite
        </button>
        <button
          onClick={clearAll}
          className="px-4 py-2 rounded-lg flex items-center gap-2 font-medium bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="w-4 h-4" />
          Clear All
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden h-96">
        <MapContainer center={center} zoom={13} className="w-full h-full">
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url={
              mapType === 'satellite'
                ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
            }
          />
          <DrawControl onDataChange={onDataChange} mapData={mapData} />
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        Draw polygon boundaries or pin high seat locations. Use the toolbar on the map to edit or delete.
      </p>
    </div>
  );
}