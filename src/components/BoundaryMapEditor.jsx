import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { Map, Satellite, Trash2, Locate, Zap, MapPin } from 'lucide-react';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function DrawControl({ onDataChange, mapData }) {
  const map = useMap();
  const featureGroupRef = useRef(null);
  const drawControlRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    try {
      const featureGroup = L.featureGroup();
      featureGroup.addTo(map);
      featureGroupRef.current = featureGroup;

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
          edit: true,
          remove: true,
        },
      });
      
      map.addControl(drawControl);
      drawControlRef.current = drawControl;

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
        if (drawControlRef.current) {
          map.removeControl(drawControlRef.current);
        }
        if (featureGroupRef.current) {
          map.removeLayer(featureGroupRef.current);
        }
      };
    } catch (error) {
      console.error('Error initializing draw control:', error);
    }
  }, [map, onDataChange]);

  return null;
}

function MapControls({ mapRef }) {
  const handleFindLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 15);
          }
        },
        (error) => console.log('Geolocation error:', error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  return (
    <button
      onClick={handleFindLocation}
      className="px-4 py-2 rounded-lg flex items-center gap-2 font-medium bg-secondary hover:bg-secondary/80"
      title="Center map on your current location"
    >
      <Locate className="w-4 h-4" />
      Find My Location
    </button>
  );
}

export default function BoundaryMapEditor({ initialCenter, onDataChange, mapData = {} }) {
  const [mapType, setMapType] = useState('map');
  const mapRef = useRef(null);
  const center = initialCenter || [54.5973, -3.1578];

  const clearAll = () => {
    onDataChange(null);
    window.location.reload();
  };

  const tileUrl = mapType === 'satellite'
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <MapControls mapRef={mapRef} />
        </div>

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
      </div>

      <div className="border border-border rounded-lg overflow-hidden" style={{ position: 'relative', height: '400px', width: '100%' }}>
        <MapContainer 
          center={center} 
          zoom={13} 
          style={{ height: '400px', width: '100%', position: 'absolute', top: 0, left: 0 }}
          ref={mapRef}
        >
          <TileLayer
            key={tileUrl}
            attribution='&copy; OpenStreetMap contributors'
            url={tileUrl}
          />
          <DrawControl onDataChange={onDataChange} mapData={mapData} />
        </MapContainer>
      </div>
    </div>
  );
}