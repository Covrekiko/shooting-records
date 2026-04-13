import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import { X } from 'lucide-react';
import { format } from 'date-fns';

export default function GpsPathViewer({ track, onClose }) {
  if (!track || track.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-card rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">GPS Track</h2>
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-muted-foreground">No GPS data recorded for this session</p>
          <button
            onClick={onClose}
            className="mt-6 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const center = track[0];
  const pathCoordinates = track.map(p => [p.lat, p.lng]);

  // Validate GPS coordinates
  const isValidCoord = (lat, lng) => lat && lng && lat !== 0 && lng !== 0 && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const hasValidCoords = pathCoordinates.some(([lat, lng]) => isValidCoord(lat, lng));

  if (!hasValidCoords || !isValidCoord(center.lat, center.lng)) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 pt-16">
        <div className="bg-card rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">GPS Track</h2>
            <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-muted-foreground">GPS coordinates are invalid. The tracking may have failed during the session.</p>
          <button
            onClick={onClose}
            className="mt-6 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 pt-16">
      <div className="bg-card rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-xl font-bold">GPS Track Visualization</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden" style={{ height: '500px', width: '100%' }}>
          <MapContainer center={[center.lat, center.lng]} zoom={15} style={{ width: '100%', height: '100%' }} key={`map-${center.lat}-${center.lng}`}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <Polyline positions={pathCoordinates} color="green" weight={3} opacity={0.7} />
            
            {/* Start marker */}
            <CircleMarker
              center={[track[0].lat, track[0].lng]}
              radius={6}
              fillColor="green"
              color="darkgreen"
              weight={2}
              opacity={1}
              fillOpacity={0.8}
            >
              <Popup>Start: {format(new Date(track[0].timestamp), 'HH:mm:ss')}</Popup>
            </CircleMarker>

            {/* End marker */}
            <CircleMarker
              center={[track[track.length - 1].lat, track[track.length - 1].lng]}
              radius={6}
              fillColor="red"
              color="darkred"
              weight={2}
              opacity={1}
              fillOpacity={0.8}
            >
              <Popup>End: {format(new Date(track[track.length - 1].timestamp), 'HH:mm:ss')}</Popup>
            </CircleMarker>
          </MapContainer>
        </div>

        <div className="p-4 border-t border-border flex justify-between items-center bg-secondary/50">
          <div className="text-sm text-muted-foreground">
            <p>Total Points: {track.length}</p>
            <p>Duration: {track.length > 1 ? Math.round((track[track.length - 1].timestamp - track[0].timestamp) / 1000) : 0}s</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}