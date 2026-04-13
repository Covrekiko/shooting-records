import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import { useState } from 'react';
import { Map, Satellite, Navigation2, Trash2, MapPin } from 'lucide-react';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function BoundaryMapEditor({ initialCenter, onDataChange, mapData = {} }) {
  const [mapType, setMapType] = useState('map');
  const [editLayers, setEditLayers] = useState(null);
  const center = initialCenter || [54.5973, -3.1578]; // Default to UK center

  const handleCreated = (e) => {
    if (editLayers) {
      const layer = e.layer;
      editLayers.addLayer(layer);
      updateMapData();
    }
  };

  const handleEdited = () => {
    updateMapData();
  };

  const handleDeleted = () => {
    updateMapData();
  };

  const updateMapData = () => {
    if (!editLayers) return;
    const geoJson = editLayers.toGeoJSON();
    onDataChange(geoJson);
  };

  const clearAll = () => {
    if (editLayers) {
      editLayers.clearLayers();
      onDataChange(null);
    }
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
          <FeatureGroup ref={setEditLayers}>
            <EditControl
              position="topleft"
              onCreated={handleCreated}
              onEdited={handleEdited}
              onDeleted={handleDeleted}
              draw={{
                rectangle: false,
                circle: false,
                circlemarker: false,
                polyline: false,
              }}
            />
          </FeatureGroup>
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        Draw polygon boundaries with <span className="font-semibold">Draw Boundary</span> or pin high seat locations with <span className="font-semibold">Pin High Seat</span>.
      </p>
    </div>
  );
}