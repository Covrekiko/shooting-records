import { useState, useRef } from 'react';
import { GoogleMap, Marker, Polyline, Polygon } from '@react-google-maps/api';
import { Undo, X, Check, Lock, Satellite, LocateFixed } from 'lucide-react';
import FloatingMapSearch from './FloatingMapSearch';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  cursor: 'crosshair',
};

export default function AreaDrawer({ userLocation, onFinish, onCancel, mapCenter, mapZoom, savedAreas = [] }) {
  const [points, setPoints] = useState([]);
  const [isClosed, setIsClosed] = useState(false);
  const [useSatellite, setUseSatellite] = useState(false);
  const [myLocationPin, setMyLocationPin] = useState(null);
  const mapRef = useRef(null);

  const handleMapClick = (e) => {
    if (isClosed) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setPoints([...points, [lat, lng]]);
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
    const closedPolygon = [...points, points[0]];
    onFinish(closedPolygon);
  };

  const handleMapSearch = (result) => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat: result.lat, lng: result.lng });
      mapRef.current.setZoom(15);
    }
  };

  const handleMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setMyLocationPin(loc);
        if (mapRef.current) {
          mapRef.current.panTo(loc);
          mapRef.current.setZoom(16);
        }
      },
      () => alert('Unable to get your location')
    );
  };



  const center = mapCenter || { lat: userLocation?.lat || 51.5, lng: userLocation?.lng || -0.1 };
  const zoom = mapZoom || 13;

  return (
    <>
      {/* Floating Map Search */}
      <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-[9999]">
        <FloatingMapSearch onSearch={handleMapSearch} />
      </div>

      {/* Google Map */}
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onLoad={(map) => (mapRef.current = map)}
        onClick={handleMapClick}
        options={{
          mapTypeId: useSatellite ? 'satellite' : 'roadmap',
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
        }}
      >
        {/* Saved area boundaries */}
        {savedAreas.map((area) => (
          <Polyline
            key={`saved-area-${area.id}`}
            path={area.polygon_coordinates.map((coord) => ({ lat: coord[0], lng: coord[1] }))}
            options={{
              strokeColor: '#9333ea',
              strokeOpacity: 0.6,
              strokeWeight: 4,
              geodesic: true,
            }}
          />
        ))}

        {/* My Location Pin */}
        {myLocationPin && (
          <Marker
            position={myLocationPin}
            title="My Location"
            icon={{
              path: window.google?.maps?.SymbolPath?.CIRCLE,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              scale: 10,
            }}
          />
        )}

        {/* Points markers */}
        {points.map((point, idx) => (
          <Marker
            key={`point-${idx}`}
            position={{ lat: point[0], lng: point[1] }}
            label={String(idx + 1)}
          />
        ))}

        {/* Preview polyline */}
        {points.length > 1 && !isClosed && (
          <Polyline
            path={points.map((p) => ({ lat: p[0], lng: p[1] }))}
            options={{
              strokeColor: '#3b82f6',
              strokeOpacity: 1,
              strokeWeight: 4,
              geodesic: true,
            }}
          />
        )}

        {/* Closing line hint when 3+ points */}
        {points.length >= 3 && !isClosed && (
          <Polyline
            path={[
              { lat: points[points.length - 1][0], lng: points[points.length - 1][1] },
              { lat: points[0][0], lng: points[0][1] },
            ]}
            options={{
              strokeColor: '#3b82f6',
              strokeOpacity: 0.5,
              strokeWeight: 4,
              geodesic: true,
            }}
          />
        )}

        {/* Closed polygon with fill */}
        {isClosed && points.length > 2 && (
          <Polygon
            paths={points.map((p) => ({ lat: p[0], lng: p[1] }))}
            options={{
              fillColor: '#3b82f6',
              fillOpacity: 0.4,
              strokeColor: '#3b82f6',
              strokeOpacity: 1,
              strokeWeight: 5,
              geodesic: true,
            }}
          />
        )}
      </GoogleMap>

      {/* Top Right Controls */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        <button
          onClick={() => setUseSatellite(!useSatellite)}
          className="w-10 h-10 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all flex items-center justify-center"
          title={useSatellite ? 'Switch to map view' : 'Switch to satellite view'}
        >
          <Satellite className="w-5 h-5" />
        </button>
        <button
          onClick={handleMyLocation}
          className="w-10 h-10 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all flex items-center justify-center"
          title="My Location"
        >
          <LocateFixed className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Controls */}
      <div className="fixed bottom-6 left-6 z-[9999] bg-card rounded-md p-2 shadow-md sm:rounded-lg sm:p-4 sm:gap-2">
        <p className="hidden sm:block text-xs font-semibold text-muted-foreground mb-2">Points: {points.length}</p>

        <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-col sm:gap-2">
          <button
            onClick={handleUndo}
            disabled={points.length === 0 || isClosed}
            className="flex items-center justify-center gap-1 px-2 py-1 sm:px-4 sm:py-2 bg-secondary hover:bg-secondary/80 disabled:opacity-50 rounded transition-colors text-xs sm:text-sm"
          >
            <Undo className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          {!isClosed ? (
            <button
              onClick={handleCloseBoundary}
              disabled={points.length < 3}
              className="flex items-center justify-center gap-1 px-2 py-1 sm:px-4 sm:py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 rounded text-accent-foreground font-medium transition-colors text-xs sm:text-sm"
            >
              <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Close</span>
            </button>
          ) : (
            <div className="flex items-center justify-center px-2 py-1 sm:px-4 sm:py-2 bg-green-500/20 text-green-700 rounded text-xs sm:text-sm font-medium">
              ✓
            </div>
          )}

          <button
            onClick={handleFinish}
            disabled={points.length < 3}
            className="flex items-center justify-center gap-1 px-2 py-1 sm:px-4 sm:py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded transition-colors text-xs sm:text-sm"
          >
            <Check className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Finish</span>
          </button>

          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-1 px-2 py-1 sm:px-4 sm:py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded transition-colors text-xs sm:text-sm"
          >
            <X className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Cancel</span>
          </button>
        </div>
      </div>

      {/* Instructions Badge */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9998] bg-blue-500/90 backdrop-blur-sm text-white px-2.5 py-1 sm:px-3.5 sm:py-2 rounded-md pointer-events-none text-xs sm:text-sm font-medium shadow-sm">
        <p>Draw Boundary</p>
        <p className="hidden sm:block text-xs opacity-80 mt-0.5">
          {isClosed ? 'Boundary closed. Tap Finish to save.' : 'Tap to add points (3+ needed)'}
        </p>
      </div>
    </>
  );
}