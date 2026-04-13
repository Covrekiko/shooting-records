import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Undo, X, Check } from 'lucide-react';

function DrawingMap({ points, onAddPoint, onUndo, onCancel, onFinish }) {
  useMapEvents({
    click(e) {
      if (e.originalEvent.target.closest('button')) return;
      onAddPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function AreaDrawer({ userLocation, onFinish, onCancel }) {
  const [points, setPoints] = useState([]);

  const handleAddPoint = (point) => {
    setPoints([...points, point]);
  };

  const handleUndo = () => {
    if (points.length > 0) {
      setPoints(points.slice(0, -1));
    }
  };

  const handleFinish = () => {
    if (points.length < 3) {
      alert('Need at least 3 points to create a boundary');
      return;
    }
    // Close the polygon by adding the first point at the end
    const closedPolygon = [...points, points[0]];
    onFinish(points);
  };

  return (
    <>
      {/* Drawing Map */}
      <MapContainer
        center={userLocation}
        zoom={13}
        style={{ width: '100%', height: '100%', zIndex: 10 }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <DrawingMap points={points} onAddPoint={handleAddPoint} onUndo={handleUndo} onCancel={onCancel} onFinish={handleFinish} />

        {/* Points markers */}
        {points.map((point, idx) => (
          <Marker key={idx} position={point}>
            <Popup>{`Point ${idx + 1}`}</Popup>
          </Marker>
        ))}

        {/* Preview polyline */}
        {points.length > 1 && <Polyline positions={points} color="#3b82f6" weight={2} opacity={0.7} />}
      </MapContainer>

      {/* Floating Controls */}
      <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-2 bg-card rounded-lg p-4 shadow-lg">
        <p className="text-sm font-semibold text-muted-foreground mb-2">Points: {points.length}</p>

        <button
          onClick={handleUndo}
          disabled={points.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 disabled:opacity-50 rounded-lg transition-colors"
        >
          <Undo className="w-4 h-4" />
          Undo
        </button>

        <button
          onClick={handleFinish}
          disabled={points.length < 3}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-lg transition-colors"
        >
          <Check className="w-4 h-4" />
          Finish
        </button>

        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>

      {/* Instructions */}
      <div className="fixed top-4 left-4 z-[9998] bg-blue-500 text-white px-4 py-3 rounded-lg max-w-sm pointer-events-none">
        <p className="text-sm font-semibold mb-1">Draw Boundary</p>
        <p className="text-xs opacity-90">Tap on the map to add points. Need at least 3 points.</p>
      </div>
    </>
  );
}