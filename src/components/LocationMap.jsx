import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useRef } from 'react';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function LocationMap({ locations, onLocationClick }) {
  const mapRef = useRef(null);

  if (!locations || locations.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No locations saved yet. Create a location first to see them on the map.</p>
      </div>
    );
  }

  // Parse coordinates and filter valid ones
  const validLocations = locations.filter((loc) => {
    if (!loc.location) return false;
    const match = loc.location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    return match !== null;
  });

  if (validLocations.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">Locations need valid coordinates (latitude, longitude) to display on the map.</p>
      </div>
    );
  }

  // Calculate bounds
  const bounds = validLocations.map((loc) => {
    const match = loc.location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    return [parseFloat(match[1]), parseFloat(match[2])];
  });

  const centerLat = bounds.reduce((sum, b) => sum + b[0], 0) / bounds.length;
  const centerLng = bounds.reduce((sum, b) => sum + b[1], 0) / bounds.length;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden h-96">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={12}
        className="w-full h-full"
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validLocations.map((loc) => {
          const match = loc.location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
          if (!match) return null;
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);

          return (
            <Marker key={loc.id} position={[lat, lng]}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{loc.place_name}</p>
                  <button
                    onClick={() => onLocationClick(loc)}
                    className="mt-2 px-3 py-1 bg-primary text-primary-foreground rounded text-xs hover:opacity-90"
                  >
                    Start Session Here
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}