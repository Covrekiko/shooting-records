import { useState, useEffect, useRef } from 'react';
import { GoogleMap, Marker, Polyline, InfoWindow, useLoadScript } from '@react-google-maps/api';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useOuting } from '@/context/OutingContext';
import FloatingActionBar from '@/components/deer-stalking/FloatingActionBar';
import POIModal from '@/components/deer-stalking/POIModal';
import HarvestModal from '@/components/deer-stalking/HarvestModal';
import OutingModal from '@/components/deer-stalking/OutingModal';
import { AlertCircle, Home, Satellite } from 'lucide-react';
import { createPortal } from 'react-dom';
import UnifiedCheckoutModal from '@/components/UnifiedCheckoutModal';
import { decrementAmmoStock } from '@/lib/ammoUtils';
import AreaDrawer from '@/components/deer-stalking/AreaDrawer';
import AreaSaveForm from '@/components/deer-stalking/AreaSaveForm';
import AreaSelector from '@/components/deer-stalking/AreaSelector';
import FloatingMapSearch from '@/components/deer-stalking/FloatingMapSearch';
import LegalShootingHoursWidget from '@/components/deer-stalking/LegalShootingHoursWidget';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 51.5074,
  lng: -0.1278,
};

export default function DeerStalkingMap() {
  const { activeOuting, loading: outingLoading, startOuting, endOuting, endOutingWithData, updateGpsTrack } = useOuting();
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyByd7U3DJDZ6CqjhGmlllVXz3a56B45Df0',
  });

  const [markers, setMarkers] = useState([]);
  const [harvests, setHarvests] = useState([]);
  const [locations, setLocations] = useState([]);
  const [userLocation, setUserLocation] = useState(defaultCenter);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapClick, setMapClick] = useState(null);

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
  const [openInfoWindowId, setOpenInfoWindowId] = useState(null);
  const [openInfoWindowType, setOpenInfoWindowType] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    loadData();
    getUserLocation();
    loadRiflesAndAmmo();
  }, []);

  // GPS tracking for active outing
  useEffect(() => {
    if (!activeOuting?.id) return;

    let currentTrack = activeOuting.gps_track || [];
    let lastSaveTime = 0;
    let isScheduled = false;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const timestamp = Date.now();
        currentTrack = [...currentTrack, { lat: latitude, lng: longitude, timestamp }];

        if (timestamp - lastSaveTime >= 60000 && !isScheduled) {
          isScheduled = true;
          lastSaveTime = timestamp;
          updateGpsTrack(activeOuting.id, currentTrack);
          isScheduled = false;
        }
      },
      (error) => console.error('❌ Geolocation error:', error),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeOuting?.id, updateGpsTrack]);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me();
      const [markersData, harvestsData, locationsData, areasData] = await Promise.all([
        base44.entities.MapMarker.list(),
        base44.entities.Harvest.list(),
        base44.entities.DeerLocation.list(),
        base44.entities.Area.filter({ created_by: currentUser.email }),
      ]);
      setMarkers(markersData || []);
      setHarvests(harvestsData || []);
      setLocations(locationsData || []);
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
      setWaitingForPin('harvest');
      loadData();
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
    if (!activeOuting) {
      console.error('🔴 No active outing found for checkout');
      return;
    }
    try {
      if (checkoutData.ammunition_id && checkoutData.total_count) {
        await decrementAmmoStock(checkoutData.ammunition_id, parseInt(checkoutData.total_count));
      }

      const submitData = { ...checkoutData, active_checkin: false };
      if (!checkoutData.shot_anything) {
        submitData.species_list = [];
        submitData.total_count = null;
        submitData.rifle_id = null;
        submitData.ammunition_used = null;
      }

      await endOutingWithData(activeOuting.id, submitData, activeOuting.gps_track || []);
      setShowCheckout(false);
      loadData();
    } catch (err) {
      console.error('🔴 Error during checkout:', err);
      setError(err.message);
    }
  };

  const handleDeletePOI = async (id) => {
    try {
      await base44.entities.MapMarker.delete(id);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteHarvest = async (id) => {
    try {
      await base44.entities.Harvest.delete(id);
      loadData();
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-900 relative overflow-hidden cursor-crosshair">
      <div className={`absolute inset-0 z-0 ${showPOI || showHarvest || showOuting ? 'pointer-events-none' : ''}`}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={userLocation}
          zoom={13}
          onLoad={(map) => (mapRef.current = map)}
          onClick={handleMapClick}
          options={{
            mapTypeId: useSatellite ? 'satellite' : 'roadmap',
            zoomControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            mapTypeControl: false,
          }}
        >
          {/* User location */}
          <Marker position={userLocation} title="My Location" />

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

      {/* Satellite Toggle - Top Right */}
      <div className="fixed top-4 right-4 z-[9999] pointer-events-auto">
        <button
          onClick={() => setUseSatellite(!useSatellite)}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-white/15 text-slate-900 rounded-full hover:bg-white/25 transition-all backdrop-blur-lg shadow-lg hover:shadow-xl flex items-center justify-center border border-white/30"
          title={useSatellite ? 'Switch to map view' : 'Switch to satellite view'}
        >
          <Satellite className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Search Bar - Center Top */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] pointer-events-auto">
        <FloatingMapSearch onSearch={handleMapSearch} isGrouped={true} />
      </div>

      {/* Legal Shooting Hours Widget + Area Selector - Top Left */}
      <div className="fixed top-4 left-4 z-[9999] pointer-events-auto space-y-2">
        <LegalShootingHoursWidget />
        <AreaSelector
          savedAreas={savedAreas}
          selectedAreaId={selectedAreaId}
          onSelectArea={handleSelectArea}
          userLocation={userLocation}
        />
      </div>

      {/* Back to Dashboard */}
      <Link
        to="/"
        className="fixed top-4 right-20 z-[9999] w-10 h-10 sm:w-12 sm:h-12 bg-white/15 text-slate-900 rounded-full shadow-lg hover:shadow-xl transition-all pointer-events-auto flex items-center justify-center border border-white/30 hover:bg-white/25 backdrop-blur-lg"
        title="Dashboard"
      >
        <Home className="w-4 h-4 sm:w-5 sm:h-5" />
      </Link>

      {/* Selection Mode Instruction */}
      {waitingForPin && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9998] bg-blue-500 text-white px-2 py-0.5 rounded flex items-center justify-between pointer-events-auto gap-1 h-6 w-48">
          <p className="text-xs font-semibold">Tap to place</p>
          <button
            onClick={() => setWaitingForPin(null)}
            className="px-1 py-0 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-all whitespace-nowrap"
          >
            Cancel
          </button>
        </div>
      )}

      {error && showError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9998] bg-red-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1 pointer-events-auto max-w-xs">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{error}</span>
          <button onClick={() => setShowError(false)} className="ml-1 hover:opacity-80">
            ×
          </button>
        </div>
      )}

      {/* Floating Action Bar - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-[9999] pointer-events-auto">
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

      {/* Modals - rendered via portal */}
      {createPortal(
        <>
          {(showPOI || showHarvest || showOuting || showCheckout || showAreaDrawer || showAreaForm) && (
            <div className="fixed inset-0 z-[50000] pointer-events-auto" />
          )}

          {showPOI && mapClick && (
            <div className="fixed inset-0 z-[50001] flex items-center justify-center">
              <POIModal
                location={mapClick}
                onClose={() => {
                  setShowPOI(false);
                  setWaitingForPin(null);
                }}
                onSubmit={handlePOISubmit}
              />
            </div>
          )}

          {showHarvest && mapClick && (
            <div className="fixed inset-0 z-[50001] flex items-center justify-center">
              <HarvestModal
                location={mapClick}
                onClose={() => {
                  setShowHarvest(false);
                  setWaitingForPin(null);
                }}
                onSubmit={handleHarvestSubmit}
              />
            </div>
          )}

          {showOuting && (
            <div className="fixed inset-0 z-[50001] flex items-center justify-center">
              <OutingModal
                locations={locations}
                onClose={() => setShowOuting(false)}
                onSubmit={handleStartOuting}
                selectedArea={savedAreas.find((a) => a.id === selectedAreaId)}
              />
            </div>
          )}

          {showCheckout && activeOuting && (
            <div className="fixed inset-0 z-[50001] flex items-center justify-center">
              <UnifiedCheckoutModal
                activeOuting={activeOuting}
                rifles={rifles}
                ammunition={ammunition}
                onSubmit={handleCheckoutSubmit}
                onClose={() => setShowCheckout(false)}
              />
            </div>
          )}

          {showAreaDrawer && (
            <div className="fixed inset-0 z-[50001] w-full h-full">
              <AreaDrawer
                userLocation={userLocation}
                mapCenter={areaBounds?.center}
                mapZoom={areaBounds?.zoom}
                savedAreas={savedAreas}
                onFinish={handleFinishDrawing}
                onCancel={() => {
                  setShowAreaDrawer(false);
                  setDrawnPolygon(null);
                  setAreaBounds(null);
                }}
              />
            </div>
          )}

          {showAreaForm && drawnPolygon && (
            <div className="fixed inset-0 z-[50001] flex items-center justify-center">
              <AreaSaveForm
                polygon={drawnPolygon}
                onSave={handleSaveArea}
                onCancel={() => {
                  setShowAreaForm(false);
                  setDrawnPolygon(null);
                }}
              />
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}