import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { base44 } from '@/api/base44Client';
import { X, LocateFixed, Users } from 'lucide-react';

const GOOGLE_MAPS_LIBRARIES = ['places'];
const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 51.5074, lng: -0.1278 };

function getPoint(log) {
  const point = log.live_current_location || log.gps_track?.[log.gps_track.length - 1];
  if (!point) return null;
  const lat = point.lat ?? point.latitude;
  const lng = point.lng ?? point.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { ...point, lat, lng };
}

function formatDateTime(value) {
  if (!value) return 'Unknown';
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatLastUpdate(point, log) {
  return formatDateTime(point?.timestamp ? new Date(point.timestamp).toISOString() : log.updated_at);
}

export default function LiveClientMapModal({ open, onClose, clients = [], onViewLog }) {
  const [isLoaded, setIsLoaded] = useState(!!window.google?.maps);
  const [selectedId, setSelectedId] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!open || isLoaded) return;

    const loadGoogleMapsScript = async () => {
      let key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || window.GOOGLE_MAPS_API_KEY;
      if (!key) {
        const res = await base44.functions.invoke('getGoogleMapsApiKey', {});
        key = res.data?.apiKey;
      }
      if (!key) return;
      window.GOOGLE_MAPS_API_KEY = key;

      if (window.google?.maps) {
        setIsLoaded(true);
        return;
      }
      if (document.getElementById('google-maps-script')) {
        const timer = setInterval(() => {
          if (window.google?.maps) {
            clearInterval(timer);
            setIsLoaded(true);
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=${GOOGLE_MAPS_LIBRARIES.join(',')}`;
      script.async = true;
      script.onload = () => setIsLoaded(true);
      document.head.appendChild(script);
    };

    loadGoogleMapsScript();
  }, [open, isLoaded]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps || clients.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    clients.forEach((log) => {
      const point = getPoint(log);
      if (point) bounds.extend({ lat: point.lat, lng: point.lng });
    });
    mapRef.current.fitBounds(bounds);
  }, [clients, isLoaded]);

  if (!open) return null;

  const selectedLog = clients.find(log => log.id === selectedId);
  const selectedPoint = selectedLog ? getPoint(selectedLog) : null;

  return createPortal(
    <div className="fixed inset-0 z-[50001] bg-slate-950">
      <div className="absolute inset-x-3 top-3 z-20 rounded-2xl border border-white/20 bg-white/90 dark:bg-slate-900/90 shadow-xl backdrop-blur-md p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">Live Client Map</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{clients.length} active client{clients.length === 1 ? '' : 's'} with live tracking</p>
          </div>
        </div>
        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center active:scale-95">
          <X className="w-5 h-5" />
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="h-full flex items-center justify-center px-6">
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 text-center max-w-sm">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">No clients are currently checked in with live tracking enabled.</p>
          </div>
        </div>
      ) : !isLoaded ? (
        <div className="h-full flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={10}
          onLoad={(map) => (mapRef.current = map)}
          options={{ disableDefaultUI: true, gestureHandling: 'greedy', mapTypeId: 'roadmap' }}
        >
          {clients.map((log) => {
            const point = getPoint(log);
            if (!point) return null;
            return (
              <Marker
                key={log.id}
                position={{ lat: point.lat, lng: point.lng }}
                title={log.client_name}
                onClick={() => setSelectedId(log.id)}
                icon={{
                  path: window.google?.maps?.SymbolPath?.CIRCLE,
                  fillColor: '#ea580c',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 3,
                  scale: 10,
                }}
              />
            );
          })}

          {selectedLog && selectedPoint && (
            <InfoWindow position={{ lat: selectedPoint.lat, lng: selectedPoint.lng }} onCloseClick={() => setSelectedId(null)}>
              <div className="max-w-xs text-sm p-1">
                <p className="font-bold text-slate-900 mb-1">{selectedLog.client_name}</p>
                <p className="text-xs text-slate-600"><strong>Area:</strong> {selectedLog.area_name}</p>
                <p className="text-xs text-slate-600"><strong>Status:</strong> Active / Checked in</p>
                <p className="text-xs text-slate-600"><strong>Check-in:</strong> {formatDateTime(selectedLog.check_in_time)}</p>
                <p className="text-xs text-slate-600"><strong>Last update:</strong> {formatLastUpdate(selectedPoint, selectedLog)}</p>
                {selectedPoint.accuracy && <p className="text-xs text-slate-600"><strong>GPS accuracy:</strong> ±{Math.round(selectedPoint.accuracy)}m</p>}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => { mapRef.current?.panTo({ lat: selectedPoint.lat, lng: selectedPoint.lng }); mapRef.current?.setZoom(17); }}
                    className="px-2 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <LocateFixed className="w-3 h-3" /> Focus
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewLog?.(selectedLog)}
                    className="px-2 py-1.5 rounded-lg bg-primary text-white text-xs font-bold"
                  >
                    View log
                  </button>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      )}
    </div>,
    document.body
  );
}