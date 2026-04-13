import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Undo, X, Check, Lock } from 'lucide-react';
import MapSearchBar from './MapSearchBar';

function SetInitialView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    // Set the map view only on initial mount, preserving parent map state
    map.setView(center, zoom);
  }, []);
  return null;
}

function DrawingMap({ points, onAddPoint, onUndo, onCancel, onFinish }) {
  useMapEvents({
    click(e) {
      if (e.originalEvent.target.closest('button')) return;
      onAddPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function AreaDrawer({ userLocation, onFinish, onCancel, mapCenter, mapZoom }) {
  const [points, setPoints] = useState([]);
  const [isClosed, setIsClosed] = useState(false);
  const mapRef = useRef(null);

  const handleAddPoint = (point) => {
    // If boundary is closed, don't add new points
    if (isClosed) return;
    setPoints([...points, point]);
  };

  const handleUndo = () => {
    if (points.length > 0) {
      setPoints(points.slice(0, -1));
    }
  };

  const handleCloseBoundary = () => {
    if (points.length < 3) {
      alert('Need at least 3 points to close the boundary');
      return;
    }
    setIsClosed(true);
  };

  const handleFinish = () => {
    if (points.length < 3) {
      alert('Need at least 3 points to create a boundary');
      return;
    }
    onFinish(points);
  };

  const handleMapSearch = (result) => {
    // Pan to search location
    if (mapRef.current) {
      mapRef.current.setView([result.lat, result.lng], 15);
    }
  };

  return (
    <>
      {/* Map Search Bar */}
      <MapSearchBar onSearch={handleMapSearch} />

      {/* Drawing Map */}
      <MapContainer
        center={mapCenter || [51.5, -0.1]}
        zoom={mapZoom || 13}
        style={{ width: '100%', height: '100%', zIndex: 10 }}
        ref={mapRef}
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

        {/* Preview polyline or closed polygon */}
        {points.length > 1 && !isClosed && <Polyline positions={points} color="#3b82f6" weight={2} opacity={0.7} />}
        
        {/* Closed polygon with fill */}
        {isClosed && points.length > 2 && (
          <Polygon
            positions={points}
            color="#3b82f6"
            fillColor="#3b82f6"
            weight={3}
            opacity={1}
            fillOpacity={0.2}
          />
        )}
      </MapContainer>

      {/* Floating Controls */}
      <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-2 bg-card rounded-lg p-4 shadow-lg">
        <p className="text-sm font-semibold text-muted-foreground mb-2">Points: {points.length}</p>

        <button
          onClick={handleUndo}
          disabled={points.length === 0 || isClosed}
          className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 disabled:opacity-50 rounded-lg transition-colors"
        >
          <Undo className="w-4 h-4" />
          Undo
        </button>

        {!isClosed ? (
          <button
            onClick={handleCloseBoundary}
            disabled={points.length < 3}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg transition-colors text-accent-foreground font-medium"
          >
            <Lock className="w-4 h-4" />
            Close Boundary
          </button>
        ) : (
          <div className="px-4 py-2 bg-green-500/20 text-green-700 rounded-lg text-sm font-medium text-center">
            ✓ Boundary Closed
          </div>
        )}

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
      <div className="fixed top-4 right-4 z-[9998] bg-blue-500 text-white px-4 py-3 rounded-lg max-w-sm pointer-events-none">
        <p className="text-sm font-semibold mb-1">Draw Boundary</p>
        <p className="text-xs opacity-90">
          {isClosed ? 'Boundary closed. Tap Finish to save.' : 'Tap on the map to add points. Need at least 3 points.'}
        </p>
      </div>
    </>
  );
}