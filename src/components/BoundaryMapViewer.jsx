import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { useState } from 'react';
import { X } from 'lucide-react';

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function BoundaryMapViewer({ mapData, center, onClose }) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen || !mapData) return null;

  const viewCenter = center || [54.5973, -3.1578];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg w-full max-w-2xl h-96 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold">Location Map</h3>
          <button
            onClick={() => {
              setIsOpen(false);
              onClose?.();
            }}
            className="p-1 hover:bg-secondary rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-hidden rounded-b-lg">
          <MapContainer center={viewCenter} zoom={13} className="w-full h-full">
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapData && <GeoJSON data={mapData} />}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}