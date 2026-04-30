import { useState, useEffect, useRef } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useOuting } from '@/context/OutingContext';
import FloatingActionBar from '@/components/deer-stalking/FloatingActionBar';
import POIModal from '@/components/deer-stalking/POIModal';
import HarvestModal from '@/components/deer-stalking/HarvestModal';
import OutingModal from '@/components/deer-stalking/OutingModal';
import { AlertCircle, Home, Satellite, LocateFixed } from 'lucide-react';
import { createPortal } from 'react-dom';
import UnifiedCheckoutModal from '@/components/UnifiedCheckoutModal.jsx';
import { decrementAmmoStock } from '@/lib/ammoUtils';
import { trackingService } from '@/lib/trackingService';
import AreaDrawer from '@/components/deer-stalking/AreaDrawer';
import AreaSaveForm from '@/components/deer-stalking/AreaSaveForm';
import AreaSelector from '@/components/deer-stalking/AreaSelector';
import FloatingMapSearch from '@/components/deer-stalking/FloatingMapSearch';
import LegalShootingHoursWidget from '@/components/deer-stalking/LegalShootingHoursWidget';
import { useAutoCheckin } from '@/hooks/useAutoCheckin';
import AutoCheckinBanner from '@/components/AutoCheckinBanner';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 51.5074,
  lng: -0.1278,
};

// Stable libraries array — defined outside component to prevent recreation on re-render
const GOOGLE_MAPS_LIBRARIES = ['drawing', 'places'];

export default function DeerStalkingMap() {
  const { activeOuting, loading: outingLoading, startOuting, endOuting, endOutingWithData, updateGpsTrack } = useOuting();
  
  const [apiKey, setApiKey] = useState(() => import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load Google Maps with API key
  useEffect(() => {
    if (!apiKey) {
      base44.functions.invoke('getGoogleMapsApiKey', {})
        .then(res => {
          const key = res.data?.apiKey;
          if (key) {
            loadGoogleMapsScript(key);
            setApiKey(key);
          }
        })
        .catch(() => {});
    } else {
      loadGoogleMapsScript(apiKey);
    }
  }, [apiKey]);

  const loadGoogleMapsScript = (key) => {
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }
    if (document.getElementById('google-maps-script')) {
      // Script already loading, wait for it
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          setIsLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=${GOOGLE_MAPS_LIBRARIES.join(',')}`;
    script.async = true;
    script.onload = () => {
      if (window.google?.maps) {
        setIsLoaded(true);
      }
    };
    script.onerror = () => console.error('Failed to load Google Maps');
    document.head.appendChild(script);
  };

  const [markers, setMarkers] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [userLocation, setUserLocation] = useState(defaultCenter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapClick, setMapClick] = useState(null);
  const loadDataTimeoutRef = useRef(null);

  // Modal states
  const [showPOI, setShowPOI] = useState(false);
  const [showHarvest, setShowHarvest] = useState(false);
  const [showOuting, setShowOuting] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [focusedHarvestId, setFocusedHarvestId] = useState(null);
  const [waitingForPin, setWaitingForPin] = useState(null);
  const [rifles, setRifles] = useState([]);
  const [ammunition, setAmmunition] = useState([]);
  const [showAreaDrawer, setShowAreaDrawer] = useState(false);
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [searchMarker, setSearchMarker] = useState(null);
  const [savedAreas, setSavedAreas] = useState([]);
  const [selectedAreaId, setSelectedAreaId] = useState(null);
  const [areaBounds, setAreaBounds] = useState(null);
  const [useSatellite, setUseSatellite] = useState(false);
  const [showError, setShowError] = useState(true);
  const [autoCheckinMatch, setAutoCheckinMatch] = useState(null);
  const [autoCheckinEnabled, setAutoCheckinEnabled] = useState(false);
  const [openInfoWindowId, setOpenInfoWindowId] = useState(null);
  const [openInfoWindowType, setOpenInfoWindowType] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    loadData();
    getUserLocation();
    loadRiflesAndAmmo();
    base44.auth.me().then(u => setAutoCheckinEnabled(u?.autoCheckinEnabled === true));
  }, []);

  useAutoCheckin({
    enabled: autoCheckinEnabled,
    clubs: [],
    areas: savedAreas,
    hasActiveSession: !!activeOuting,
    onAutoCheckin: (match) => setAutoCheckinMatch(match),
  });

  const handleAutoCheckinConfirm = async () => {
    if (!autoCheckinMatch || activeOuting) return;
    const now = new Date();
    const area = savedAreas.find(a => a.id === autoCheckinMatch.id);
    try {
      await startOuting({
        location_name: autoCheckinMatch.name,
        area_id: autoCheckinMatch.id,
        start_time: now.toISOString(),
        check_in_method: 'auto_geolocation',
        auto_check_in_detected: true,
        auto_check_in_time: now.toISOString(),
        auto_check_in_confirmed: true,
      });
      setAutoCheckinMatch(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // Note: Tracking is managed by trackingService via OutingContext
  // No duplicate watchers here — trackingService is the single source of truth

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me();
      // Filter MapMarker and Harvest by current user (privacy)
      const [markersData, harvestsData, areasData] = await Promise.all([
        base44.entities.MapMarker.filter({ created_by: currentUser.email }),
        base44.entities.Harvest.filter({ created_by: currentUser.email }),
        base44.entities.Area.filter({ created_by: currentUser.email }),
      ]);
      setMarkers(markersData || []);
      setHarvests(harvestsData || []);
      setSavedAreas(areasData || []);
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
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        () => {}
      );
    }
  };

  const loadRiflesAndAmmo = async () => {
    try {
      const currentUser = await base44.auth.me();
      const [riflesList, ammoList] = await Promise.all([
        base44.entities.Rifle.filter({ created_by: currentUser.email }),
        base44.entities.Ammunition.filter({ created_by: currentUser.email }),
      ]);
      setRifles(riflesList);
      setAmmunition(ammoList);
    } catch (error) {
      console.error('Error loading rifles and ammo:', error);
    }
  };

  const handleRecenter = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(newLocation);
        if (mapRef.current) {
          mapRef.current.panTo(newLocation);
          mapRef.current.setZoom(16);
        }
      },
      (error) => {
        let errorMsg = 'Unable to get location';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location unavailable';
        }
        setError(errorMsg);
      }
    );
  };

  const handleMapClick = (e) => {
    if (!waitingForPin) return;

    const clickLocation = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setMapClick(clickLocation);

    if (waitingForPin === 'poi') {
      setShowPOI(true);
      setWaitingForPin(null);
    } else if (waitingForPin === 'harvest') {
      setShowHarvest(true);
      setWaitingForPin(null);
    }
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
      setWaitingForPin('poi');
      if (loadDataTimeoutRef.current) clearTimeout(loadDataTimeoutRef.current);
      loadDataTimeoutRef.current = setTimeout(() => loadData(), 500);
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
      setWaitingForPin('harvest');
      if (loadDataTimeoutRef.current) clearTimeout(loadDataTimeoutRef.current);
      loadDataTimeoutRef.current = setTimeout(() => loadData(), 500);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartOuting = async (data) => {
    try {
      await startOuting(data);
      setShowOuting(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEndOuting = () => {
    setShowCheckout(true);
  };

  const handleCheckoutSubmit = async (checkoutData) => {
    if (!activeOuting) return;

    try {
      const finalTrack = trackingService.getTrack();
      const roundsFired = checkoutData.shot_anything
        ? (parseInt(checkoutData.rounds_fired) > 0 ? parseInt(checkoutData.rounds_fired) : parseInt(checkoutData.total_count) || 0)
        : 0;
      const submitData = { ...checkoutData, active_checkin: false, rounds_fired: roundsFired };

      if (!checkoutData.shot_anything) {
        submitData.species_list = [];
        submitData.total_count = null;
        submitData.rounds_fired = 0;
        submitData.rifle_id = null;
        submitData.ammunition_used = null;
        submitData.ammunition_id = null;
      }

      if (checkoutData.shot_anything && checkoutData.ammunition_id && roundsFired > 0) {
        await decrementAmmoStock(checkoutData.ammunition_id, roundsFired, 'deer_management', activeOuting.id);
      }

      await endOutingWithData(activeOuting.id, submitData, finalTrack);
      setShowCheckout(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeletePOI = async (id) => {
    try {
      await base44.entities.MapMarker.delete(id);
      if (loadDataTimeoutRef.current) clearTimeout(loadDataTimeoutRef.current);
      loadDataTimeoutRef.current = setTimeout(() => loadData(), 500);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteHarvest = async (id) => {
    try {
      await base44.entities.Harvest.delete(id);
      if (loadDataTimeoutRef.current) clearTimeout(loadDataTimeoutRef.current);
      loadDataTimeoutRef.current = setTimeout(() => loadData(), 500);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartAreaCreation = () => {
    const currentCenter = mapRef.current?.getCenter();
    const currentZoom = mapRef.current?.getZoom();
    setAreaBounds({ center: { lat: currentCenter.lat(), lng: currentCenter.lng() }, zoom: currentZoom });
    setShowAreaDrawer(true);
  };

  const handleFinishDrawing = (polygon) => {
    setDrawnPolygon(polygon);
    setShowAreaDrawer(false);
    setShowAreaForm(true);
  };

  const handleSaveArea = async (areaData) => {
    try {
      const area = await base44.entities.Area.create(areaData);
      setSavedAreas([...savedAreas, area]);
      setSelectedAreaId(area.id);
      setShowAreaForm(false);
      setDrawnPolygon(null);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectArea = (area) => {
    setSelectedAreaId(area.id);

    if (mapRef.current && area.center_point) {
      mapRef.current.panTo({ lat: area.center_point.lat, lng: area.center_point.lng });
      mapRef.current.setZoom(14);
    }
  };

  const handleMapSearch = (result) => {
    setSearchMarker({
      lat: result.lat,
      lng: result.lng,
      label: result.query,
    });

    if (mapRef.current) {
      mapRef.current.panTo({ lat: result.lat, lng: result.lng });
      mapRef.current.setZoom(15);
    }

    setTimeout(() => {
      setSearchMarker(null);
    }, 10000);
  };

  if (loading || outingLoading || !isLoaded) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
          <p className="text-white text-xs text-slate-400">Map initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-900 relative overflow-hidden cursor-crosshair">
      <style>{`
        .gm-style-cc { display: none !important; }
        .gm-attribution { display: none !important; }
        .gm-style-mmc { display: none !important; }
      `}</style>
      <div className={`absolute inset-0 z-0 ${showPOI || showHarvest || showOuting || showCheckout ? 'pointer-events-none' : ''}`}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={userLocation}
          zoom={13}
          onLoad={(map) => (mapRef.current = map)}
          onClick={handleMapClick}
          options={{
            mapTypeId: useSatellite ? 'satellite' : 'roadmap',
            disableDefaultUI: true,
            gestureHandling: 'greedy',
          }}
        >
          {/* User location - Google Maps style blue dot */}
          <Marker
            position={userLocation}
            title="My Location"
            icon={{
              path: window.google?.maps?.SymbolPath?.CIRCLE,
              fillColor: '#4285F4',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
              scale: 10,
            }}
          />

          {/* POI Markers */}
          {markers.map((marker) => (
            <div key={marker.id}>
              <Marker
                position={{ lat: marker.latitude, lng: marker.longitude }}
                onClick={() => {
                  setOpenInfoWindowId(marker.id);
                  setOpenInfoWindowType('poi');
                }}
              />
              {openInfoWindowId === marker.id && openInfoWindowType === 'poi' && (
                <InfoWindow
                  position={{ lat: marker.latitude, lng: marker.longitude }}
                  onCloseClick={() => setOpenInfoWindowId(null)}
                >
                  <div className="text-sm max-w-xs bg-white p-2 rounded">
                    <p className="font-bold capitalize mb-2">{marker.marker_type.replace(/_/g, ' ')}</p>
                    {marker.notes && <p className="mb-2">{marker.notes}</p>}
                    {marker.photos && marker.photos.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        {marker.photos.map((photo, idx) => (
                          <img key={idx} src={photo} alt="poi" className="w-full h-20 object-cover rounded" />
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => handleDeletePOI(marker.id)}
                      className="w-full mt-2 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </InfoWindow>
              )}
            </div>
          ))}

          {/* Temporary Pin Preview */}
          {waitingForPin && mapClick && (
            <Marker position={mapClick} />
          )}

          {/* Harvest Markers */}
          {harvests.map((harvest) => (
            <div key={harvest.id}>
              <Marker
                position={{ lat: harvest.latitude, lng: harvest.longitude }}
                onClick={() => {
                  setOpenInfoWindowId(harvest.id);
                  setOpenInfoWindowType('harvest');
                }}
              />
              {openInfoWindowId === harvest.id && openInfoWindowType === 'harvest' && (
                <InfoWindow
                  position={{ lat: harvest.latitude, lng: harvest.longitude }}
                  onCloseClick={() => setOpenInfoWindowId(null)}
                >
                  <div className="text-sm max-w-xs bg-white p-2 rounded">
                    <p className="font-bold text-base mb-2">{harvest.species}</p>
                    <p className="text-xs text-slate-600 mb-2">
                      <strong>Sex:</strong> {harvest.sex}
                    </p>
                    {harvest.harvest_date && (
                      <p className="text-xs text-slate-600 mb-2">
                        <strong>Date:</strong> {new Date(harvest.harvest_date).toLocaleDateString()}
                      </p>
                    )}
                    {harvest.notes && <p className="text-xs mb-3">{harvest.notes}</p>}
                    {harvest.photos && harvest.photos.length > 0 && (
                      <details className="mb-2">
                        <summary className="cursor-pointer text-xs font-semibold text-primary hover:underline mb-2">
                          View Photos ({harvest.photos.length})
                        </summary>
                        <div className="grid grid-cols-2 gap-2">
                          {harvest.photos.map((photo, idx) => (
                            <a key={idx} href={photo} target="_blank" rel="noopener noreferrer">
                              <img
                                src={photo}
                                alt="harvest"
                                className="w-full h-24 object-cover rounded hover:opacity-80 transition-opacity"
                              />
                            </a>
                          ))}
                        </div>
                      </details>
                    )}
                    <button
                      onClick={() => setFocusedHarvestId(focusedHarvestId === harvest.id ? null : harvest.id)}
                      className="w-full mt-2 px-2 py-1 bg-primary text-white text-xs rounded hover:bg-primary/90"
                    >
                      {focusedHarvestId === harvest.id ? 'Unpin' : 'Pin on Map'}
                    </button>
                    <button
                      onClick={() => handleDeleteHarvest(harvest.id)}
                      className="w-full mt-1 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </InfoWindow>
              )}
            </div>
          ))}

          {/* Active Outing GPS Track */}
          {activeOuting && activeOuting.gps_track && activeOuting.gps_track.length > 1 && (
            <Polyline
              path={activeOuting.gps_track.map((p) => ({ lat: p.lat, lng: p.lng }))}
              options={{
                strokeColor: '#3b82f6',
                strokeOpacity: 0.7,
                strokeWeight: 3,
              }}
            />
          )}

          {/* Saved Area Boundaries */}
          {savedAreas.map((area) => (
            <Polyline
              key={area.id}
              path={area.polygon_coordinates.map((coord) => ({ lat: coord[0], lng: coord[1] }))}
              options={{
                strokeColor: '#3b82f6',
                strokeOpacity: 1,
                strokeWeight: 5,
              }}
            />
          ))}

          {/* Search Result Marker */}
          {searchMarker && (
            <Marker position={{ lat: searchMarker.lat, lng: searchMarker.lng }}>
              <InfoWindow>
                <div>{searchMarker.label}</div>
              </InfoWindow>
            </Marker>
          )}
        </GoogleMap>
      </div>

      {/* ── TOP LEFT: Legal Hours + Area Selector ── */}
      <div className="fixed top-4 left-4 z-[9999] pointer-events-auto space-y-2 max-w-[200px]">
        <LegalShootingHoursWidget />
        <AreaSelector
          savedAreas={savedAreas}
          selectedAreaId={selectedAreaId}
          onSelectArea={handleSelectArea}
          userLocation={userLocation}
        />
      </div>

      {/* ── TOP RIGHT: Home + Satellite + Locate + Search ── */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-auto items-end">
        {/* Home */}
        <Link
          to="/"
          title="Dashboard"
          className="flex w-10 h-10 rounded-full bg-white/20 dark:bg-slate-700/30 border border-white/40 dark:border-slate-600/40 items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-white/30 dark:hover:bg-slate-700/40 active:scale-95 transition-all shadow-lg backdrop-blur-md"
        >
          <Home className="w-4 h-4" />
        </Link>

        {/* Satellite toggle */}
        <button
          onClick={() => setUseSatellite(!useSatellite)}
          title={useSatellite ? 'Map view' : 'Satellite view'}
          className={`w-10 h-10 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-lg backdrop-blur-md border ${
            useSatellite
              ? 'bg-emerald-500/30 dark:bg-emerald-600/30 border-emerald-400/40 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
              : 'bg-white/20 dark:bg-slate-700/30 border-white/40 dark:border-slate-600/40 text-slate-700 dark:text-slate-300 hover:bg-white/30 dark:hover:bg-slate-700/40'
          }`}
        >
          <Satellite className="w-4 h-4" />
        </button>

        {/* Locate */}
        <button
          onClick={handleRecenter}
          title="My Location"
          className="w-10 h-10 rounded-full bg-white/20 dark:bg-slate-700/30 border border-white/40 dark:border-slate-600/40 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-white/30 dark:hover:bg-slate-700/40 active:scale-95 transition-all shadow-lg backdrop-blur-md"
        >
          <LocateFixed className="w-4 h-4" />
        </button>

        {/* Search */}
        <FloatingMapSearch onSearch={handleMapSearch} isGrouped={true} />
      </div>

      {/* ── PIN PLACEMENT TOAST ── */}
      {waitingForPin && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9998] pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-white/20 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 rounded-2xl shadow-lg border border-white/40 dark:border-slate-600/40 backdrop-blur-md">
            <span className="text-sm font-semibold">Tap map to place pin</span>
            <button
              onClick={() => setWaitingForPin(null)}
              className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── AUTO CHECK-IN BANNER ── */}
      {autoCheckinMatch && (
        <AutoCheckinBanner
          match={autoCheckinMatch}
          onConfirm={handleAutoCheckinConfirm}
          onCancel={() => setAutoCheckinMatch(null)}
          onDismiss={() => setAutoCheckinMatch(null)}
        />
      )}

      {/* ── ERROR TOAST ── */}
      {error && showError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9998] pointer-events-auto">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/30 dark:bg-red-600/30 text-red-700 dark:text-red-300 rounded-2xl shadow-lg border border-red-400/40 dark:border-red-500/40 text-sm max-w-xs backdrop-blur-md">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{error}</span>
            <button onClick={() => setShowError(false)} className="ml-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold text-base leading-none">×</button>
          </div>
        </div>
      )}

      {/* ── FLOATING ACTION BAR - Bottom Right ── */}
      <div className="fixed bottom-8 right-5 z-[9999] pointer-events-auto">
        <FloatingActionBar
          onPOI={() => {
            setMapClick(null);
            setWaitingForPin('poi');
          }}
          onHarvest={() => {
            setMapClick(null);
            setWaitingForPin('harvest');
          }}
          onOuting={() => setShowOuting(true)}
          onRecenter={handleRecenter}
          activeOuting={activeOuting}
          onEndOuting={handleEndOuting}
          onCreateArea={handleStartAreaCreation}
        />
      </div>

      {/* Modals — GlobalModal handles its own portal/overlay */}
      {showPOI && mapClick && (
        <POIModal location={mapClick} onClose={() => { setShowPOI(false); setWaitingForPin(null); }} onSubmit={handlePOISubmit} />
      )}

      {showHarvest && mapClick && (
        <HarvestModal location={mapClick} onClose={() => { setShowHarvest(false); setWaitingForPin(null); }} onSubmit={handleHarvestSubmit} />
      )}

      {showOuting && (
        <OutingModal onClose={() => setShowOuting(false)} onSubmit={handleStartOuting} selectedArea={savedAreas.find(a => a.id === selectedAreaId)} />
      )}

      {showCheckout && activeOuting && (
        <UnifiedCheckoutModal activeOuting={activeOuting} rifles={rifles} ammunition={ammunition} onSubmit={handleCheckoutSubmit} onClose={() => setShowCheckout(false)} />
      )}

      {showAreaDrawer && createPortal(
        <div className="fixed inset-0 z-[50001] w-full h-full">
          <AreaDrawer
            userLocation={userLocation}
            mapCenter={areaBounds?.center}
            mapZoom={areaBounds?.zoom}
            savedAreas={savedAreas}
            onFinish={handleFinishDrawing}
            onCancel={() => { setShowAreaDrawer(false); setDrawnPolygon(null); setAreaBounds(null); }}
          />
        </div>,
        document.body
      )}

      {showAreaForm && drawnPolygon && createPortal(
        <AreaSaveForm
          polygon={drawnPolygon}
          onSave={handleSaveArea}
          onCancel={() => { setShowAreaForm(false); setDrawnPolygon(null); }}
          onFlyTo={(lat, lng) => { if (mapRef.current) { mapRef.current.panTo({ lat, lng }); mapRef.current.setZoom(15); } }}
        />,
        document.body
      )}
    </div>
  );
}