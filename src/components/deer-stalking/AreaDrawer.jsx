import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Undo, X, Check, Lock, Satellite } from 'lucide-react';
import FloatingMapSearch from './FloatingMapSearch';

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
      {/* Floating Map Search */}
      <FloatingMapSearch onSearch={handleMapSearch} />

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
      <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-1 bg-card rounded-lg p-2.5 shadow-lg sm:gap-2 sm:p-4">
        <p className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1 sm:mb-2">Points: {points.length}</p>

        <button
          onClick={handleUndo}
          disabled={points.length === 0 || isClosed}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-secondary hover:bg-secondary/80 disabled:opacity-50 rounded-lg transition-colors text-sm sm:text-base"
        >
          <Undo className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Undo</span>
        </button>

        {!isClosed ? (
          <button
            onClick={handleCloseBoundary}
            disabled={points.length < 3}
            className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg transition-colors text-accent-foreground font-medium text-sm sm:text-base"
          >
            <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Close</span>
          </button>
        ) : (
          <div className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-500/20 text-green-700 rounded-lg text-xs sm:text-sm font-medium text-center">
            ✓ Closed
          </div>
        )}

        <button
          onClick={handleFinish}
          disabled={points.length < 3}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-lg transition-colors text-sm sm:text-base"
        >
          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Finish</span>
        </button>

        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg transition-colors text-sm sm:text-base"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Cancel</span>
        </button>
      </div>

      {/* Instructions Badge */}
      <div className="fixed top-3 left-3 z-[9998] bg-blue-500/90 backdrop-blur-sm text-white px-2.5 py-1 sm:px-3.5 sm:py-2 rounded-md pointer-events-none text-xs sm:text-sm font-medium shadow-sm">
        <p>Draw Boundary</p>
        <p className="hidden sm:block text-xs opacity-80 mt-0.5">
          {isClosed ? 'Boundary closed. Tap Finish to save.' : 'Tap to add points (3+ needed)'}
        </p>
      </div>
    </>
  );
}