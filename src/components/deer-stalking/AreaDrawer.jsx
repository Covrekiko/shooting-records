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
              strokeColor: '#64748b',
              strokeOpacity: 0.5,
              strokeWeight: 3,
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
              strokeColor: '#10b981',
              strokeOpacity: 0.85,
              strokeWeight: 3,
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
              strokeColor: '#10b981',
              strokeOpacity: 0.35,
              strokeWeight: 2,
              geodesic: true,
            }}
          />
        )}

        {/* Closed polygon with fill */}
        {isClosed && points.length > 2 && (
          <Polygon
            paths={points.map((p) => ({ lat: p[0], lng: p[1] }))}
            options={{
              fillColor: '#10b981',
              fillOpacity: 0.15,
              strokeColor: '#10b981',
              strokeOpacity: 0.9,
              strokeWeight: 3,
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
          className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all ${
            useSatellite
              ? 'bg-slate-900 text-white shadow-lg'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm'
          }`}
        >
          <Satellite className="w-4 h-4" />
        </button>
        <button
          onClick={handleMyLocation}
          title="My Location"
          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
        >
          <LocateFixed className="w-4 h-4" />
        </button>
      </div>

      {/* ── TOP CENTER: Instruction pill ── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl shadow-md text-sm font-medium whitespace-nowrap">
          {isClosed
            ? <><span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />Boundary closed • Save Area</>
            : <><span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />Place {3 - points.length} more points</>
          }
        </div>
      </div>

      {/* ── BOTTOM CENTER: Drawing Controls ── */}
      <div className="fixed left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto w-[min(92vw,24rem)] bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] md:bottom-8">
        <div className="rounded-2xl border border-white/40 dark:border-slate-600/40 bg-white/20 dark:bg-slate-700/30 shadow-2xl backdrop-blur-xl p-3 space-y-3">
          {/* Row 1: Secondary buttons */}
          <div className="grid grid-cols-3 gap-2">
            {/* Undo */}
            <button
              onClick={handleUndo}
              disabled={points.length === 0 || isClosed}
              className="min-h-11 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white text-slate-900 rounded-xl text-sm font-medium hover:bg-slate-100 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <Undo className="w-4 h-4 flex-shrink-0" />
              Undo
            </button>

            {/* Close Boundary / Closed */}
            {!isClosed ? (
              <button
                onClick={handleCloseBoundary}
                disabled={points.length < 3}
                className="min-h-11 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white text-slate-900 rounded-xl text-sm font-medium hover:bg-slate-100 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <Lock className="w-4 h-4 flex-shrink-0" />
                Close
              </button>
            ) : (
              <div className="min-h-11 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white text-emerald-600 rounded-xl text-sm font-medium shadow-sm">
                <Check className="w-4 h-4 flex-shrink-0" />
                Closed
              </div>
            )}

            {/* Cancel */}
            <button
              onClick={onCancel}
              className="min-h-11 flex items-center justify-center gap-1.5 px-2.5 py-2 bg-white text-slate-900 rounded-xl text-sm font-medium hover:bg-slate-100 active:scale-95 transition-all shadow-sm"
            >
              <X className="w-4 h-4 flex-shrink-0" />
              Cancel
            </button>
          </div>

          {/* Row 2: Primary — Save Area */}
          <button
            onClick={handleFinish}
            disabled={points.length < 3}
            className="min-h-12 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-primary rounded-xl text-sm font-semibold hover:bg-slate-50 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-md border border-primary/20"
          >
            <Check className="w-4 h-4 flex-shrink-0" />
            Save Area
          </button>
        </div>
      </div>
    </>
  );
}