import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Undo, X, Check, Lock, Satellite } from 'lucide-react';
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
  const [useSatellite, setUseSatellite] = useState(false);
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

  const validatePolygon = (polygonPoints) => {
    const errors = [];

    if (polygonPoints.length < 3) {
      errors.push('Need at least 3 points');
      return errors;
    }

    // Validate lat/lng ranges
    for (const point of polygonPoints) {
      const [lat, lng] = point;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        errors.push('Invalid coordinates');
        return errors;
      }
    }

    // Check for duplicates
    const uniquePoints = new Set(polygonPoints.map(p => `${p[0]},${p[1]}`));
    if (uniquePoints.size !== polygonPoints.length) {
      errors.push('Remove duplicate points');
    }

    // Check polygon is reasonably sized
    const lats = polygonPoints.map(p => p[0]);
    const lngs = polygonPoints.map(p => p[1]);
    const latRange = Math.max(...lats) - Math.min(...lats);
    const lngRange = Math.max(...lngs) - Math.min(...lngs);

    if (latRange > 10 || lngRange > 10) {
      errors.push('Area too large (max 10° × 10°)');
    }

    return errors;
  };

  const handleCloseBoundary = () => {
    const errors = validatePolygon(points);
    if (errors.length > 0) {
      alert('Cannot close boundary:\n' + errors.join('\n'));
      return;
    }
    setIsClosed(true);
  };

  const handleFinish = () => {
    const errors = validatePolygon(points);
    if (errors.length > 0) {
      alert('Cannot save boundary:\n' + errors.join('\n'));
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
        style={{ width: '100%', height: '100%', zIndex: 10, cursor: 'crosshair' }}
        ref={mapRef}
      >
        <TileLayer
          url={useSatellite ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
          attribution={useSatellite ? '&copy; Esri' : '&copy; OpenStreetMap contributors'}
        />
        <DrawingMap points={points} onAddPoint={handleAddPoint} onUndo={handleUndo} onCancel={onCancel} onFinish={handleFinish} />

        {/* Points markers */}
        {points.map((point, idx) => (
          <Marker key={idx} position={point}>
            <Popup>{`Point ${idx + 1}`}</Popup>
          </Marker>
        ))}

        {/* Preview polyline - with closing line when ready to close */}
        {points.length > 1 && !isClosed && (
          <Polyline 
            positions={points} 
            color="#3b82f6" 
            weight={4} 
            opacity={1}
          />
        )}
        
        {/* Show closing line hint when 3+ points */}
        {points.length >= 3 && !isClosed && (
          <Polyline
            positions={[points[points.length - 1], points[0]]}
            color="#3b82f6"
            weight={4}
            opacity={0.5}
            dashArray="5, 5"
          />
        )}
        
        {/* Closed polygon with fill */}
        {isClosed && points.length > 2 && (
          <Polygon
            positions={points}
            color="#3b82f6"
            fillColor="#3b82f6"
            weight={5}
            opacity={1}
            fillOpacity={0.4}
            interactive={false}
          />
        )}
      </MapContainer>

      {/* Satellite Toggle */}
      <button
        onClick={() => setUseSatellite(!useSatellite)}
        className="fixed top-4 right-4 z-[9999] p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all"
        title={useSatellite ? 'Switch to map view' : 'Switch to satellite view'}
      >
        <Satellite className="w-5 h-5" />
      </button>

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