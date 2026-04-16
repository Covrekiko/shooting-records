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

      {/* ── BOTTOM RIGHT: Satellite + Locate ── */}
      <div className="fixed bottom-8 right-4 z-[9999] flex flex-col gap-2">
        <button
          onClick={() => setUseSatellite(!useSatellite)}
          title={useSatellite ? 'Map view' : 'Satellite view'}
          className="w-11 h-11 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
          style={{
            backgroundColor: useSatellite ? '#059669' : 'rgba(15,23,42,0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
          }}
        >
          <Satellite className="w-5 h-5" />
        </button>
        <button
          onClick={handleMyLocation}
          title="My Location"
          className="w-11 h-11 rounded-2xl flex items-center justify-center active:scale-90 transition-all"
          style={{
            backgroundColor: 'rgba(15,23,42,0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#fff',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
          }}
        >
          <LocateFixed className="w-5 h-5" />
        </button>
      </div>

      {/* ── TOP LEFT: Instruction pill ── */}
      <div className="fixed top-4 left-4 z-[9998] pointer-events-none">
        <div
          style={{ backgroundColor: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl shadow-lg text-xs font-semibold text-white whitespace-nowrap"
        >
          {isClosed
            ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />Boundary closed — tap Save</>
            : <><span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />{points.length === 0 ? 'Tap map to add points' : `${points.length} point${points.length !== 1 ? 's' : ''} placed`}</>
          }
        </div>
      </div>

      {/* ── BOTTOM LEFT: iOS-style toolbar ── */}
      <div className="fixed bottom-8 left-4 z-[9999] flex flex-col gap-3 items-start">

        {/* Secondary controls — compact icon row */}
        <div
          style={{ backgroundColor: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
          className="flex items-center gap-1 p-1.5 rounded-2xl shadow-xl"
        >
          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={points.length === 0 || isClosed}
            title="Undo last point"
            className="w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-150"
            style={{ color: '#fff' }}
          >
            <Undo className="w-5 h-5" />
            <span className="text-[9px] font-medium opacity-70">Undo</span>
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.12)' }} />

          {/* Close Boundary */}
          {!isClosed ? (
            <button
              onClick={handleCloseBoundary}
              disabled={points.length < 3}
              title="Close boundary"
              className="w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 active:scale-90 disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-150"
              style={{ color: '#fff' }}
            >
              <Lock className="w-5 h-5" />
              <span className="text-[9px] font-medium opacity-70">Close</span>
            </button>
          ) : (
            <div
              className="w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5"
              style={{ color: '#6ee7b7' }}
            >
              <Check className="w-5 h-5" />
              <span className="text-[9px] font-medium opacity-80">Closed</span>
            </div>
          )}

          {/* Divider */}
          <div style={{ width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.12)' }} />

          {/* Cancel */}
          <button
            onClick={onCancel}
            title="Cancel"
            className="w-11 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 active:scale-90 transition-all duration-150"
            style={{ color: '#f87171' }}
          >
            <X className="w-5 h-5" />
            <span className="text-[9px] font-medium opacity-70">Cancel</span>
          </button>
        </div>

        {/* Primary — Save Area */}
        <button
          onClick={handleFinish}
          disabled={points.length < 3}
          className="flex items-center gap-2 rounded-2xl active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
          style={{
            backgroundColor: '#059669',
            color: '#fff',
            boxShadow: '0 6px 20px rgba(5,150,105,0.55)',
            padding: '0 20px',
            height: '48px',
            fontSize: '15px',
            fontWeight: '700',
            letterSpacing: '-0.01em',
          }}
        >
          <Check className="w-4.5 h-4.5 flex-shrink-0" />
          Save Area
        </button>
      </div>
    </>
  );
}