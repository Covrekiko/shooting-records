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

      {/* ── TOP RIGHT: Satellite + Locate ── */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        <button
          onClick={() => setUseSatellite(!useSatellite)}
          title={useSatellite ? 'Map view' : 'Satellite view'}
          className={`w-10 h-10 rounded-2xl backdrop-blur-xl shadow-lg border flex items-center justify-center active:scale-95 transition-all ${
            useSatellite
              ? 'bg-slate-900/80 border-slate-700/60 text-white'
              : 'bg-white/80 dark:bg-slate-800/80 border-white/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
          }`}
        >
          <Satellite className="w-4.5 h-4.5" />
        </button>
        <button
          onClick={handleMyLocation}
          title="My Location"
          className="w-10 h-10 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl shadow-lg border border-white/60 dark:border-slate-700/60 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 active:scale-95 transition-all"
        >
          <LocateFixed className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* ── BOTTOM LEFT: Action Controls ── */}
      <div className="fixed bottom-8 left-5 z-[9999] flex flex-col items-start gap-1.5">

        <button
          onClick={handleUndo}
          disabled={points.length === 0 || isClosed}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 backdrop-blur-xl text-white rounded-xl shadow-md active:scale-95 transition-all text-xs font-semibold disabled:opacity-30 whitespace-nowrap"
        >
          <Undo className="w-3.5 h-3.5 opacity-60" />
          Undo · {points.length}pts
        </button>

        {!isClosed ? (
          <button
            onClick={handleCloseBoundary}
            disabled={points.length < 3}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 backdrop-blur-xl text-white rounded-xl shadow-md active:scale-95 transition-all text-xs font-semibold disabled:opacity-30 whitespace-nowrap"
          >
            <Lock className="w-3.5 h-3.5 opacity-60" />
            Close Shape
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 backdrop-blur-xl text-green-400 rounded-xl text-xs font-semibold border border-green-500/40 whitespace-nowrap">
            <Check className="w-3.5 h-3.5" />
            Closed ✓
          </div>
        )}

        <button
          onClick={handleFinish}
          disabled={points.length < 3}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 backdrop-blur-xl text-white rounded-xl shadow-md active:scale-95 transition-all text-xs font-bold disabled:opacity-30 whitespace-nowrap"
        >
          <Check className="w-3.5 h-3.5 opacity-60" />
          Save Area
        </button>

        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-3 py-2 bg-slate-900/80 backdrop-blur-xl text-red-400 rounded-xl shadow-md active:scale-95 transition-all text-xs font-semibold whitespace-nowrap"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>

      {/* ── TOP CENTER: Instruction toast ── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/90 backdrop-blur-xl text-white rounded-2xl shadow-xl border border-white/10 text-sm font-semibold whitespace-nowrap">
          {isClosed ? '✓ Boundary closed — tap Save Area' : 'Tap map to add points (3+ needed)'}
        </div>
      </div>
    </>
  );
}