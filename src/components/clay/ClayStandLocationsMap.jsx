import { useState, useMemo } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { LayoutGrid, Map as MapIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ClayStandLocationsMap({ sessions, stands, clubs }) {
  const [mapView, setMapView] = useState(true);
  const [selectedClub, setSelectedClub] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);

  // Calculate center and parse club coordinates
  const clubCoords = useMemo(() => {
    return clubs
      .filter(c => c.location && c.location.match(/-?\d+\.\d+.*-?\d+\.\d+/))
      .map(c => {
        const match = c.location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        return match ? { id: c.id, name: c.name, lat: parseFloat(match[1]), lng: parseFloat(match[2]) } : null;
      })
      .filter(Boolean);
  }, [clubs]);

  const center = useMemo(() => {
    return clubCoords.length > 0
      ? {
          lat: clubCoords.reduce((s, c) => s + c.lat, 0) / clubCoords.length,
          lng: clubCoords.reduce((s, c) => s + c.lng, 0) / clubCoords.length,
        }
      : { lat: 51.505, lng: -0.09 };
  }, [clubCoords]);

  // Group stands by club
  const standsByClub = useMemo(() => {
    const groups = {};
    stands.forEach(stand => {
      const session = sessions.find(s => s.id === stand.clay_session_id);
      if (session) {
        if (!groups[session.location_name]) {
          groups[session.location_name] = { club: session, stands: [] };
        }
        groups[session.location_name].stands.push({ ...stand, session });
      }
    });
    return groups;
  }, [stands, sessions]);

  if (!mapView) {
    return (
      <div className="space-y-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setMapView(true)}
          className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold"
        >
          <MapIcon className="w-3.5 h-3.5" />
          Map View
        </motion.button>

        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Clubs with Recorded Stands</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(standsByClub).map(([clubName, data]) => (
              <motion.button
                key={clubName}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedClub(clubName)}
                className={`w-full p-3 rounded-lg border transition-colors text-left ${
                  selectedClub === clubName ? 'bg-primary/10 border-primary' : 'bg-secondary/30 border-border hover:bg-secondary/50'
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

  const mapContainerStyle = { width: '100%', height: '400px', borderRadius: '12px' };

  return (
    <div className="space-y-3">
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setMapView(false)}
        className="w-full flex items-center justify-center gap-2 py-2 bg-secondary text-secondary-foreground rounded-lg text-xs font-semibold"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        List View
      </motion.button>

      <div className="rounded-xl border border-border overflow-hidden">
        <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
          <GoogleMap mapContainerStyle={mapContainerStyle} center={center} zoom={10} options={{ disableDefaultUI: true, zoomControl: true }}>
            {clubCoords.map(club => {
              const clubStands = standsByClub[club.name]?.stands || [];
              const avgHitRate = clubStands.length > 0
                ? Math.round(clubStands.reduce((s, st) => {
                    const valid = (st.hits || 0) + (st.misses || 0);
                    return s + (valid > 0 ? (st.hits / valid) * 100 : 0);
                  }, 0) / clubStands.length)
                : 0;

              const markerColor = avgHitRate >= 75 ? '22c55e' : avgHitRate >= 50 ? 'eab308' : 'ef4444';

              return (
                <Marker
                  key={club.id}
                  position={{ lat: club.lat, lng: club.lng }}
                  onClick={() => setSelectedMarker(club)}
                  icon={{
                    path: 'M12 0C7.03 0 3 4.03 3 9c0 5.25 9 23 9 23s9-17.75 9-23c0-4.97-4.03-9-9-9zm0 13c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z',
                    fillColor: `#${markerColor}`,
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                    scale: 2,
                  }}
                >
                  {selectedMarker?.id === club.id && (
                    <InfoWindow onCloseClick={() => setSelectedMarker(null)}>
                      <div className="text-xs">
                        <p className="font-bold">{club.name}</p>
                        <p>Stands: {clubStands.length}</p>
                        <p>Avg Hit Rate: {avgHitRate}%</p>
                      </div>
                    </InfoWindow>
                  )}
                </Marker>
              );
            })}
          </GoogleMap>
        </LoadScript>
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