import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import FloatingActionBar from '@/components/deer-stalking/FloatingActionBar';
import POIModal from '@/components/deer-stalking/POIModal';
import HarvestModal from '@/components/deer-stalking/HarvestModal';
import OutingModal from '@/components/deer-stalking/OutingModal';
import { AlertCircle, Home } from 'lucide-react';

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function DeerStalkingMap() {
  const [markers, setMarkers] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [outings, setOutings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [activeOuting, setActiveOuting] = useState(null);
  const [userLocation, setUserLocation] = useState([51.5074, -0.1278]); // Default: London
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapClick, setMapClick] = useState(null);

  // Modal states
  const [showPOI, setShowPOI] = useState(false);
  const [showHarvest, setShowHarvest] = useState(false);
  const [showOuting, setShowOuting] = useState(false);
  const [focusedHarvestId, setFocusedHarvestId] = useState(null);

  useEffect(() => {
    loadData();
    getUserLocation();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [markersData, harvestsData, outingsData, locationsData] = await Promise.all([
        base44.entities.MapMarker.list(),
        base44.entities.Harvest.list(),
        base44.entities.DeerOuting.list(),
        base44.entities.DeerLocation.list(),
      ]);
      setMarkers(markersData || []);
      setHarvests(harvestsData || []);
      setOutings(outingsData || []);
      setLocations(locationsData || []);
      
      // Check for active outing
      const active = outingsData?.find(o => o.active);
      setActiveOuting(active);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        () => {} // Silent fail, use default
      );
    }
  };

  const handleMapClick = (e) => {
    setMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
  };

  const handlePOISubmit = async (data) => {
    try {
      await base44.entities.MapMarker.create({
        marker_type: data.type,
        latitude: mapClick.lat,
        longitude: mapClick.lng,
        notes: data.notes,
        photos: data.photos || [],
        created_at: new Date().toISOString(),
      });
      setShowPOI(false);
      setMapClick(null);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleHarvestSubmit = async (data) => {
    try {
      await base44.entities.Harvest.create({
        latitude: mapClick.lat,
        longitude: mapClick.lng,
        species: data.species,
        sex: data.sex,
        harvest_date: new Date(data.date).toISOString(),
        notes: data.notes,
        photos: data.photos || [],
      });
      setShowHarvest(false);
      setMapClick(null);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartOuting = async (data) => {
    try {
      const outing = await base44.entities.DeerOuting.create({
        location_name: data.place_name,
        start_time: new Date(data.date + 'T' + data.start_time).toISOString(),
        gps_track: [],
        active: true,
      });
      setActiveOuting(outing);
      setShowOuting(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEndOuting = async () => {
    if (!activeOuting) return;
    try {
      await base44.entities.DeerOuting.update(activeOuting.id, {
        end_time: new Date().toISOString(),
        active: false,
      });
      setActiveOuting(null);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={userLocation}
          zoom={13}
          style={{ width: '100%', height: '100%' }}
          onClick={handleMapClick}
          zoomControl={true}
        >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        {/* User location */}
        <Marker position={userLocation}>
          <Popup>Your Location</Popup>
        </Marker>

        {/* POI Markers */}
        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.latitude, marker.longitude]}>
            <Popup>
              <div className="text-sm">
                <p className="font-bold capitalize">{marker.marker_type.replace(/_/g, ' ')}</p>
                {marker.notes && <p>{marker.notes}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Harvest Markers */}
        {harvests.map((harvest) => (
          <Marker
            key={harvest.id}
            position={[harvest.latitude, harvest.longitude]}
            icon={L.icon({
              iconUrl: focusedHarvestId === harvest.id 
                ? 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23fbbf24%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22/%3E%3C/svg%3E'
                : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%23dc2626%22%3E%3Ccircle cx=%2212%22 cy=%2212%22 r=%2210%22/%3E%3C/svg%3E',
              iconSize: focusedHarvestId === harvest.id ? [35, 35] : [25, 25],
            })}
          >
            <Popup>
              <div className="text-sm max-w-xs">
                <p className="font-bold text-base mb-2">{harvest.species}</p>
                <p className="text-xs text-slate-600 mb-2"><strong>Sex:</strong> {harvest.sex}</p>
                {harvest.harvest_date && <p className="text-xs text-slate-600 mb-2"><strong>Date:</strong> {new Date(harvest.harvest_date).toLocaleDateString()}</p>}
                {harvest.notes && <p className="text-xs mb-3">{harvest.notes}</p>}
                {harvest.photos && harvest.photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {harvest.photos.map((photo, idx) => (
                      <img key={idx} src={photo} alt="harvest" className="w-full h-20 object-cover rounded" />
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setFocusedHarvestId(focusedHarvestId === harvest.id ? null : harvest.id)}
                  className="w-full mt-2 px-2 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90"
                >
                  {focusedHarvestId === harvest.id ? 'Unpin' : 'Pin on Map'}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Active Outing GPS Track */}
        {activeOuting && activeOuting.gps_track && activeOuting.gps_track.length > 1 && (
          <Polyline
            positions={activeOuting.gps_track.map((p) => [p.lat, p.lng])}
            color="#3b82f6"
            weight={3}
            opacity={0.7}
          />
        )}
      </MapContainer>
      </div>

      {/* Back to Dashboard */}
      <Link
        to="/"
        className="fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all pointer-events-auto"
      >
        <Home className="w-4 h-4" />
        Dashboard
      </Link>
      {error && (
        <div className="fixed top-4 left-4 right-4 z-[9998] bg-red-500 text-white p-3 rounded-lg flex items-center gap-2 pointer-events-auto">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Floating Action Bar */}
      <FloatingActionBar
        onPOI={() => setShowPOI(true)}
        onHarvest={() => setShowHarvest(true)}
        onOuting={() => setShowOuting(true)}
        onRecenter={() => {}} 
        activeOuting={activeOuting}
        onEndOuting={handleEndOuting}
      />

      {/* Modals */}
      {showPOI && mapClick && (
        <POIModal
          location={mapClick}
          onClose={() => setShowPOI(false)}
          onSubmit={handlePOISubmit}
        />
      )}

      {showHarvest && mapClick && (
        <HarvestModal
          location={mapClick}
          onClose={() => setShowHarvest(false)}
          onSubmit={handleHarvestSubmit}
        />
      )}

      {showOuting && (
        <OutingModal
          locations={locations}
          onClose={() => setShowOuting(false)}
          onSubmit={handleStartOuting}
        />
      )}
    </div>
  );
}