import { useState } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { DESIGN } from '@/lib/designConstants';

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];

export default function AreaSaveForm({ polygon, onSave, onCancel, onFlyTo }) {
  const [formData, setFormData] = useState({ name: '', notes: '', deer_species: [], location_address: '', postcode: '' });
  const [loading, setLoading] = useState(false);
  const [loadingMyAddress, setLoadingMyAddress] = useState(false);
  const [geocodedCoords, setGeocodedCoords] = useState(null);

  const calculateCenter = () => {
    const points = polygon.length > 0 && polygon[polygon.length - 1] === polygon[0]
      ? polygon.slice(0, -1) : polygon;
    const lats = points.map(p => p[0]);
    const lngs = points.map(p => p[1]);
    return { lat: (Math.max(...lats) + Math.min(...lats)) / 2, lng: (Math.max(...lngs) + Math.min(...lngs)) / 2 };
  };

  const geocodeAddress = async (addressStr) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyByd7U3DJDZ6CqjhGmlllVXz3a56B45Df0';
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressStr)}&key=${apiKey}`);
    const data = await res.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng, formatted: data.results[0].formatted_address };
    }
    return null;
  };

  const handleSearchAddress = async () => {
    const query = [formData.location_address, formData.postcode].filter(Boolean).join(' ');
    if (!query) { alert('Enter an address or postcode'); return; }
    setLoading(true);
    try {
      const result = await geocodeAddress(query);
      if (result) {
        setGeocodedCoords({ lat: result.lat, lng: result.lng });
        if (onFlyTo) onFlyTo(result.lat, result.lng);
      } else {
        alert('Address not found');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyAddress = () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    setLoadingMyAddress(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude: lat, longitude: lng } = position.coords;
          setGeocodedCoords({ lat, lng });
          if (onFlyTo) onFlyTo(lat, lng);
          const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyByd7U3DJDZ6CqjhGmlllVXz3a56B45Df0';
          const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
          const data = await res.json();
          if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            const postcodePart = result.address_components?.find(c => c.types.includes('postal_code'))?.long_name || '';
            setFormData(prev => ({ ...prev, location_address: result.formatted_address, postcode: postcodePart || prev.postcode }));
          }
        } finally {
          setLoadingMyAddress(false);
        }
      },
      () => { alert('Unable to get your location. Check permissions.'); setLoadingMyAddress(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) { alert('Area name is required'); return; }
    onSave({
      name: formData.name,
      polygon_coordinates: polygon,
      center_point: calculateCenter(),
      deer_species: formData.deer_species,
      notes: formData.notes,
      location_address: formData.location_address,
      postcode: formData.postcode,
      active: true,
    });
  };

  const toggleSpecies = (species) =>
    setFormData(prev => ({
      ...prev,
      deer_species: prev.deer_species.includes(species)
        ? prev.deer_species.filter(s => s !== species)
        : [...prev.deer_species, species],
    }));

  return (
    <GlobalModal
      open={true}
      onClose={onCancel}
      title="Save Area"
      onSubmit={handleSubmit}
      primaryAction="Save Area"
      secondaryAction="Cancel"
    >
      <div className="space-y-4">
        <div>
          <label className={DESIGN.LABEL}>Area Name *</label>
          <input type="text" value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. North Block" className={DESIGN.INPUT} required />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={DESIGN.LABEL}>Address</label>
            <button type="button" onClick={handleUseMyAddress} disabled={loadingMyAddress}
              className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline disabled:opacity-50">
              {loadingMyAddress ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
              Use current location
            </button>
          </div>
          <div className="flex gap-2">
            <input type="text" value={formData.location_address}
              onChange={(e) => { setFormData({ ...formData, location_address: e.target.value }); setGeocodedCoords(null); }}
              placeholder="Enter address" className={`flex-1 ${DESIGN.INPUT}`} autoComplete="off" />
            <button type="button" onClick={handleSearchAddress} disabled={loading}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
          {geocodedCoords && (
            <p className="mt-1 text-[11px] text-muted-foreground font-mono">
              📍 {geocodedCoords.lat.toFixed(6)}, {geocodedCoords.lng.toFixed(6)}
            </p>
          )}
        </div>

        <div>
          <label className={DESIGN.LABEL}>Postcode</label>
          <input type="text" value={formData.postcode}
            onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
            placeholder="e.g. SW1A 1AA" className={DESIGN.INPUT} autoComplete="off" />
        </div>

        <div>
          <label className={DESIGN.LABEL}>Deer Species</label>
          <div className="grid grid-cols-2 gap-2">
            {DEER_SPECIES.map(species => (
              <label key={species} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.deer_species.includes(species)}
                  onChange={() => toggleSpecies(species)} className="w-4 h-4" />
                <span className="text-sm">{species}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className={DESIGN.LABEL}>Notes</label>
          <textarea value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g. Good for stalking in autumn..."
            className={DESIGN.INPUT} rows="3" />
        </div>
      </div>
    </GlobalModal>
  );
}