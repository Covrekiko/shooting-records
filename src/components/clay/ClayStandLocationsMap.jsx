import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Icon } from 'leaflet';
import { base44 } from '@/api/base44Client';
import { LayoutGrid, Map as MapIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const clayStandIcon = new Icon({
  iconUrl: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23f97316"><circle cx="12" cy="12" r="10"/></svg>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const clubIcon = new Icon({
  iconUrl: 'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232563eb"><path d="M3 21h18v-2H3m6-4h6v6h-6m-6-4h4v4H3m14-4h4v4h-4m2-10L5 5v6h14V5"/></svg>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export default function ClayStandLocationsMap({ sessions, stands, clubs }) {
  const [mapView, setMapView] = useState(true);
  const [selectedClub, setSelectedClub] = useState(null);

  // Calculate center of all clubs
  const validClubs = clubs.filter(c => c.location && c.location.match(/-?\d+\.\d+.*-?\d+\.\d+/));
  const clubCoords = validClubs.map(c => {
    const match = c.location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    return match ? { id: c.id, name: c.name, lat: parseFloat(match[1]), lng: parseFloat(match[2]) } : null;
  }).filter(Boolean);

  const center = clubCoords.length > 0
    ? [clubCoords.reduce((s, c) => s + c.lat, 0) / clubCoords.length, clubCoords.reduce((s, c) => s + c.lng, 0) / clubCoords.length]
    : [51.505, -0.09];

  // Group stands by club
  const standsByClub = {};
  stands.forEach(stand => {
    const session = sessions.find(s => s.id === stand.clay_session_id);
    if (session) {
      if (!standsByClub[session.location_name]) {
        standsByClub[session.location_name] = { club: session, stands: [] };
      }
      standsByClub[session.location_name].stands.push({
        ...stand,
        session: session,
      });
    }
  });

  if (!mapView) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setMapView(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold"
          >
            <MapIcon className="w-3.5 h-3.5" />
            Map View
          </motion.button>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Clubs with Recorded Stands</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(standsByClub).map(([clubName, data]) => (
              <motion.button
                key={clubName}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedClub(clubName)}
                className={`w-full p-3 rounded-lg border transition-colors text-left ${
                  selectedClub === clubName
                    ? 'bg-primary/10 border-primary'
                    : 'bg-secondary/30 border-border hover:bg-secondary/50'
                }`}
              >
                <p className="text-sm font-semibold">{clubName}</p>
                <p className="text-xs text-muted-foreground">{data.stands.length} stands recorded</p>
                <div className="flex gap-2 mt-2 text-xs">
                  <span className="text-emerald-600">📊 {data.stands.reduce((s, st) => s + (st.hits || 0), 0)} hits</span>
                  <span className="text-muted-foreground">{data.stands.length} stands</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setMapView(false)}
          className="flex-1 flex items-center justify-center gap-2 py-2 bg-secondary text-secondary-foreground rounded-lg text-xs font-semibold"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          List View
        </motion.button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden h-96">
        <MapContainer center={center} zoom={10} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Club markers */}
          {clubCoords.map(club => (
            <Marker key={club.id} position={[club.lat, club.lng]} icon={clubIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-bold">{club.name}</p>
                  {standsByClub[club.name] && (
                    <p className="text-xs text-muted-foreground">{standsByClub[club.name].stands.length} stands</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Clay stand density circles */}
          {clubCoords.map(club => {
            const clubStands = standsByClub[club.name]?.stands || [];
            const avgHitRate = clubStands.length > 0
              ? Math.round(clubStands.reduce((s, st) => {
                  const valid = (st.hits || 0) + (st.misses || 0);
                  return s + (valid > 0 ? (st.hits / valid) * 100 : 0);
                }, 0) / clubStands.length)
              : 0;

            const radius = Math.max(100, clubStands.length * 20);
            const color = avgHitRate >= 75 ? '#22c55e' : avgHitRate >= 50 ? '#eab308' : '#ef4444';

            return (
              <CircleMarker
                key={`circle-${club.id}`}
                center={[club.lat, club.lng]}
                radius={Math.min(radius / 100, 25)}
                fillColor={color}
                fillOpacity={0.3}
                weight={2}
                color={color}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold">{club.name}</p>
                    <p>Stands: {clubStands.length}</p>
                    <p>Avg Hit Rate: {avgHitRate}%</p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-card border border-border rounded-lg p-2 text-center">
          <p className="text-muted-foreground">Total Stands</p>
          <p className="text-lg font-bold">{stands.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-2 text-center">
          <p className="text-muted-foreground">Clubs</p>
          <p className="text-lg font-bold">{clubCoords.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-2 text-center">
          <p className="text-muted-foreground">Sessions</p>
          <p className="text-lg font-bold">{sessions.length}</p>
        </div>
      </div>
    </div>
  );
}