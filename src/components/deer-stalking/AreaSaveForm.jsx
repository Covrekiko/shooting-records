import { useState } from 'react';
import { X, Search, MapPin, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];

export default function AreaSaveForm({ polygon, onSave, onCancel, onFlyTo }) {
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    deer_species: [],
    location_address: '',
    postcode: '',
  });
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMyAddress, setLoadingMyAddress] = useState(false);
  const [geocodedCoords, setGeocodedCoords] = useState(null);

  // Calculate center point (exclude last point if it's a duplicate of the first)
  const calculateCenter = () => {
    const points = polygon.length > 0 && polygon[polygon.length - 1] === polygon[0]
      ? polygon.slice(0, -1)
      : polygon;
    const lats = points.map((p) => p[0]);
    const lngs = points.map((p) => p[1]);
    return {
      lat: (Math.max(...lats) + Math.min(...lats)) / 2,
      lng: (Math.max(...lngs) + Math.min(...lngs)) / 2,
    };
  };

  const geocodeAddress = async (addressStr) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyByd7U3DJDZ6CqjhGmlllVXz3a56B45Df0';
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addressStr)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng, formatted: data.results[0].formatted_address };
    }
    return null;
  };

  const handleSearchAddress = async () => {
    const query = [formData.location_address, formData.postcode].filter(Boolean).join(' ');
    if (!query) {
      alert('Enter an address or postcode');
      return;
    }
    setLoading(true);
    try {
      const result = await geocodeAddress(query);
      if (result) {
        setGeocodedCoords({ lat: result.lat, lng: result.lng });
        setSearchResults([result]);
        if (onFlyTo) onFlyTo(result.lat, result.lng);
      } else {
        alert('Address not found');
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyAddress = async () => {
    setLoadingMyAddress(true);
    try {
      const user = await base44.auth.me();
      const parts = [user.addressLine1, user.addressLine2, user.postcode].filter(Boolean);
      if (parts.length === 0) {
        alert('No address found on your profile. Please update your profile first.');
        return;
      }
      const addressStr = parts.join(', ');
      // Pre-fill fields
      setFormData((prev) => ({
        ...prev,
        location_address: [user.addressLine1, user.addressLine2].filter(Boolean).join(', '),
        postcode: user.postcode || prev.postcode,
      }));
      // Geocode and fly to
      const result = await geocodeAddress(addressStr);
      if (result) {
        setGeocodedCoords({ lat: result.lat, lng: result.lng });
        if (onFlyTo) onFlyTo(result.lat, result.lng);
      }
    } catch (error) {
      console.error('Error loading profile address:', error);
    } finally {
      setLoadingMyAddress(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Area name is required');
      return;
    }

    const centerPoint = calculateCenter();
    const areaData = {
      name: formData.name,
      polygon_coordinates: polygon,
      center_point: centerPoint,
      deer_species: formData.deer_species,
      notes: formData.notes,
      location_address: formData.location_address,
      postcode: formData.postcode,
      active: true,
    };

    onSave(areaData);
  };

  const toggleSpecies = (species) => {
    setFormData((prev) => ({
      ...prev,
      deer_species: prev.deer_species.includes(species)
        ? prev.deer_species.filter((s) => s !== species)
        : [...prev.deer_species, species],
    }));
  };

  return (
    <div className="bg-card rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Save Area</h2>
        <button onClick={onCancel} className="p-1 hover:bg-slate-100 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Area Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. North Block"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium">Address</label>
            <button
              type="button"
              onClick={handleUseMyAddress}
              disabled={loadingMyAddress}
              className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline disabled:opacity-50"
            >
              {loadingMyAddress
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <MapPin className="w-3 h-3" />}
              Use my address
            </button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.location_address}
              onChange={(e) => { setFormData({ ...formData, location_address: e.target.value }); setGeocodedCoords(null); }}
              placeholder="Enter address"
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleSearchAddress}
              disabled={loading}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
            >
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
          <label className="block text-sm font-medium mb-1">Postcode</label>
          <input
            type="text"
            value={formData.postcode}
            onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
            placeholder="e.g. SW1A 1AA"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Deer Species</label>
          <div className="grid grid-cols-2 gap-2">
            {DEER_SPECIES.map((species) => (
              <label key={species} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.deer_species.includes(species)}
                  onChange={() => toggleSpecies(species)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{species}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="e.g. Good for stalking in autumn..."
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            rows="3"
          />
        </div>

        <div className="flex gap-3 sticky bottom-0 bg-card pt-4">
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Save Area
          </button>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}