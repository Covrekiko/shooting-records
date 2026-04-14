import { MapContainer, TileLayer, Polygon, Marker, Popup } from 'react-leaflet';
import { useState } from 'react';
import L from 'leaflet';
import { Map, Satellite, Trash2, Locate } from 'lucide-react';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapRenderer({ mapData }) {
  if (!mapData || !mapData.features) return null;
  
  return mapData.features.map((feature, idx) => {
    if (feature.geometry.type === 'Point') {
      return (
        <Marker key={idx} position={[feature.geometry.coordinates[1], feature.geometry.coordinates[0]]}>
          <Popup>{feature.properties?.name || 'Marker'}</Popup>
        </Marker>
      );
    }
    if (feature.geometry.type === 'Polygon') {
      const positions = feature.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
      return <Polygon key={idx} positions={positions} pathOptions={{ color: 'orange' }} />;
    }
    return null;
  });
}

function MapControls({ map }) {
  const handleFindLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (map) {
            map.setView([latitude, longitude], 15);
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
      className="px-4 py-2 sm:px-4 sm:py-2 rounded-full sm:rounded-lg flex items-center gap-2 font-medium bg-secondary hover:bg-secondary/80 text-sm sm:text-base transition-all active:scale-95"
      title="Center map on your current location"
    >
      <Locate className="w-5 h-5 sm:w-4 sm:h-4" />
      <span className="hidden sm:inline">Find My Location</span>
      <span className="sm:hidden">My Location</span>
    </button>
  );
}

export default function BoundaryMapEditor({ initialCenter, onDataChange, mapData = {} }) {
  const [mapType, setMapType] = useState('map');
  const [map, setMap] = useState(null);
  const center = initialCenter || [54.5973, -3.1578];

  const clearAll = () => {
    onDataChange({ features: [] });
  };

  const tileUrl = mapType === 'satellite'
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <MapControls map={map} />
        </div>

        <div className="flex flex-wrap gap-3 sm:gap-2">
           <button
             onClick={() => setMapType('map')}
             className={`flex-1 sm:flex-none px-5 sm:px-4 py-3 sm:py-2 rounded-full sm:rounded-lg flex items-center justify-center sm:justify-start gap-2 font-semibold sm:font-medium text-sm sm:text-base transition-all active:scale-95 ${
               mapType === 'map'
                 ? 'bg-primary text-primary-foreground'
                 : 'bg-secondary hover:bg-secondary/80'
             }`}
           >
             <Map className="w-5 h-5 sm:w-4 sm:h-4" />
             <span className="sm:inline">Map</span>
           </button>
           <button
             onClick={() => setMapType('satellite')}
             className={`flex-1 sm:flex-none px-5 sm:px-4 py-3 sm:py-2 rounded-full sm:rounded-lg flex items-center justify-center sm:justify-start gap-2 font-semibold sm:font-medium text-sm sm:text-base transition-all active:scale-95 ${
               mapType === 'satellite'
                 ? 'bg-primary text-primary-foreground'
                 : 'bg-secondary hover:bg-secondary/80'
             }`}
           >
             <Satellite className="w-5 h-5 sm:w-4 sm:h-4" />
             <span className="sm:inline">Satellite</span>
           </button>
           <button
             onClick={clearAll}
             className="flex-1 sm:flex-none px-5 sm:px-4 py-3 sm:py-2 rounded-full sm:rounded-lg flex items-center justify-center sm:justify-start gap-2 font-semibold sm:font-medium text-sm sm:text-base bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all active:scale-95"
           >
             <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
             <span className="sm:inline">Clear</span>
           </button>
         </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden" style={{ position: 'relative', height: '400px', width: '100%' }}>
        <MapContainer 
          center={center} 
          zoom={13} 
          style={{ height: '400px', width: '100%', position: 'absolute', top: 0, left: 0 }}
          ref={(instance) => instance && setMap(instance)}
        >
          <TileLayer
            key={tileUrl}
            attribution='&copy; OpenStreetMap contributors'
            url={tileUrl}
          />
          <MapRenderer mapData={mapData} />
        </MapContainer>
      </div>
    </div>
  );
}