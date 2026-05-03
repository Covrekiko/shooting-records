import { useMemo, useState } from 'react';
import { MapPin, Navigation, Route, Layers } from 'lucide-react';

const padding = 36;

function getAreaPoints(area) {
  return (area?.polygon_coordinates || [])
    .map((coord) => ({ lat: Number(coord[0]), lng: Number(coord[1]) }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function buildBounds({ areas, markers, harvests, userLocation, activeTrack }) {
  const points = [];
  areas.forEach((area) => points.push(...getAreaPoints(area)));
  markers.forEach((marker) => points.push({ lat: Number(marker.latitude), lng: Number(marker.longitude) }));
  harvests.forEach((harvest) => points.push({ lat: Number(harvest.latitude), lng: Number(harvest.longitude) }));
  (activeTrack || []).forEach((point) => points.push({ lat: Number(point.lat), lng: Number(point.lng) }));
  if (userLocation) points.push(userLocation);

  const valid = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
  if (valid.length === 0) return { minLat: 51.49, maxLat: 51.53, minLng: -0.15, maxLng: -0.10 };

  let minLat = Math.min(...valid.map((p) => p.lat));
  let maxLat = Math.max(...valid.map((p) => p.lat));
  let minLng = Math.min(...valid.map((p) => p.lng));
  let maxLng = Math.max(...valid.map((p) => p.lng));

  if (Math.abs(maxLat - minLat) < 0.002) {
    minLat -= 0.001;
    maxLat += 0.001;
  }
  if (Math.abs(maxLng - minLng) < 0.002) {
    minLng -= 0.001;
    maxLng += 0.001;
  }

  return { minLat, maxLat, minLng, maxLng };
}

function markerLabel(marker) {
  if (marker.title) return marker.title;
  if (marker.marker_type === 'high_seat') return 'High Seat';
  if (marker.marker_type === 'deer_sighting') return marker.species || 'Deer';
  return (marker.marker_type || 'POI').replace(/_/g, ' ');
}

export default function OfflineFieldMap({
  areas = [],
  markers = [],
  harvests = [],
  userLocation,
  activeTrack = [],
  selectedAreaId,
  waitingForPin,
  onMapClick,
}) {
  const [selected, setSelected] = useState(null);
  const bounds = useMemo(() => buildBounds({ areas, markers, harvests, userLocation, activeTrack }), [areas, markers, harvests, userLocation, activeTrack]);

  const project = (point, width = 1000, height = 1000) => {
    const x = padding + ((point.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (width - padding * 2);
    const y = padding + ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat)) * (height - padding * 2);
    return { x, y };
  };

  const unproject = (x, y, width = 1000, height = 1000) => ({
    lng: bounds.minLng + ((x - padding) / (width - padding * 2)) * (bounds.maxLng - bounds.minLng),
    lat: bounds.maxLat - ((y - padding) / (height - padding * 2)) * (bounds.maxLat - bounds.minLat),
  });

  const handleSvgClick = (event) => {
    if (!waitingForPin || !onMapClick) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 1000;
    const y = ((event.clientY - rect.top) / rect.height) * 1000;
    onMapClick(unproject(x, y));
  };

  const trackPath = (activeTrack || [])
    .filter((point) => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng)))
    .map((point) => project({ lat: Number(point.lat), lng: Number(point.lng) }));

  return (
    <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950 overflow-hidden">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-2 rounded-xl bg-card/90 border border-border shadow-lg text-xs font-semibold text-foreground flex items-center gap-2">
        <Layers className="w-4 h-4 text-primary" />
        Offline field map. Some map imagery may be limited.
      </div>

      <svg viewBox="0 0 1000 1000" className="w-full h-full" onClick={handleSvgClick} role="img" aria-label="Offline field map">
        <defs>
          <pattern id="field-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-300 dark:text-slate-800" />
          </pattern>
        </defs>
        <rect width="1000" height="1000" fill="url(#field-grid)" />

        {areas.map((area, index) => {
          const points = getAreaPoints(area).map((point) => project(point));
          if (points.length < 2) return null;
          const path = points.map((point) => `${point.x},${point.y}`).join(' ');
          const center = points.reduce((acc, point) => ({ x: acc.x + point.x / points.length, y: acc.y + point.y / points.length }), { x: 0, y: 0 });
          const selected = selectedAreaId === area.id;
          return (
            <g key={area.id || index}>
              <polygon points={path} fill={selected ? 'rgba(245, 158, 11, 0.18)' : 'rgba(34, 197, 94, 0.12)'} stroke={selected ? '#f59e0b' : '#2563eb'} strokeWidth={selected ? 6 : 4} />
              <text x={center.x} y={center.y} textAnchor="middle" className="fill-slate-800 dark:fill-white text-[22px] font-bold" paintOrder="stroke" stroke="white" strokeWidth="5">
                {area.name}
              </text>
            </g>
          );
        })}

        {trackPath.length > 1 && (
          <polyline points={trackPath.map((point) => `${point.x},${point.y}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {harvests.map((harvest) => {
          const point = project({ lat: Number(harvest.latitude), lng: Number(harvest.longitude) });
          return (
            <g key={harvest.id} onClick={(event) => { event.stopPropagation(); setSelected({ type: 'Harvest', title: harvest.species, notes: harvest.notes }); }} className="cursor-pointer">
              <circle cx={point.x} cy={point.y} r="13" fill="#dc2626" stroke="white" strokeWidth="4" />
              <text x={point.x + 18} y={point.y - 12} className="fill-slate-900 dark:fill-white text-[20px] font-bold" paintOrder="stroke" stroke="white" strokeWidth="4">{harvest.species}</text>
            </g>
          );
        })}

        {markers.map((marker) => {
          const point = project({ lat: Number(marker.latitude), lng: Number(marker.longitude) });
          const isHighSeat = marker.marker_type === 'high_seat';
          return (
            <g key={marker.id} onClick={(event) => { event.stopPropagation(); setSelected({ type: marker.marker_type, title: markerLabel(marker), notes: marker.notes }); }} className="cursor-pointer">
              <circle cx={point.x} cy={point.y} r={isHighSeat ? 15 : 12} fill={isHighSeat ? '#f97316' : '#16a34a'} stroke="white" strokeWidth="4" />
              <text x={point.x + 18} y={point.y + 6} className="fill-slate-900 dark:fill-white text-[18px] font-semibold capitalize" paintOrder="stroke" stroke="white" strokeWidth="4">{markerLabel(marker)}</text>
            </g>
          );
        })}

        {userLocation && Number.isFinite(userLocation.lat) && Number.isFinite(userLocation.lng) && (() => {
          const point = project(userLocation);
          return (
            <g>
              <circle cx={point.x} cy={point.y} r="18" fill="#2563eb" fillOpacity="0.22" />
              <circle cx={point.x} cy={point.y} r="8" fill="#2563eb" stroke="white" strokeWidth="4" />
              <text x={point.x + 18} y={point.y + 6} className="fill-blue-700 dark:fill-blue-300 text-[18px] font-bold" paintOrder="stroke" stroke="white" strokeWidth="4">My GPS</text>
            </g>
          );
        })()}
      </svg>

      <div className="absolute bottom-24 left-4 z-10 rounded-xl bg-card/90 border border-border shadow-lg px-3 py-2 text-xs text-muted-foreground space-y-1 max-w-[220px]">
        <div className="flex items-center gap-2"><Navigation className="w-3.5 h-3.5 text-blue-600" /> GPS shown when available</div>
        <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-green-600" /> {markers.length} POIs / high seats</div>
        <div className="flex items-center gap-2"><Route className="w-3.5 h-3.5 text-blue-600" /> {activeTrack.length} trail points</div>
      </div>

      {selected && (
        <div className="absolute left-4 right-4 bottom-40 z-20 rounded-2xl bg-card border border-border shadow-xl p-4">
          <p className="text-xs font-bold text-primary uppercase tracking-wide">{String(selected.type).replace(/_/g, ' ')}</p>
          <p className="font-semibold text-foreground mt-1">{selected.title}</p>
          {selected.notes && <p className="text-sm text-muted-foreground mt-2">{selected.notes}</p>}
          <button onClick={() => setSelected(null)} className="mt-3 w-full py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-semibold">Close</button>
        </div>
      )}
    </div>
  );
}