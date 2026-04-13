import { useState } from 'react';
import { X, Search, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];

export default function AreaSaveForm({ polygon, onSave, onCancel, onMapNavigate }) {
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    deer_species: [],
    location_address: '',
    postcode: '',
  });
  const [coordsData, setCoordsData] = useState({ lat: '', lng: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locatingUser, setLocatingUser] = useState(false);

  // Calculate center point
  const calculateCenter = () => {
    const lats = polygon.map((p) => p[0]);
    const lngs = polygon.map((p) => p[1]);
    return {
      lat: (Math.max(...lats) + Math.min(...lats)) / 2,
      lng: (Math.max(...lngs) + Math.min(...lngs)) / 2,
    };
  };

  const handleSearchAddressPostcode = async () => {
    if (!formData.location_address && !formData.postcode) {
      setError('Enter an address or postcode');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for location coordinates for: ${formData.location_address || ''} ${formData.postcode || ''}. Return only JSON with lat and lng as numbers.`,
        response_json_schema: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } },
        add_context_from_internet: true,
      });
      if (response.lat && response.lng) {
        onMapNavigate(response.lat, response.lng, 14);
      } else {
        setError('Location not found');
      }
    } catch (error) {
      setError('Search failed. Try a different address or postcode.');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchCoordinates = async () => {
    if (!coordsData.lat || !coordsData.lng) {
      setError('Enter both latitude and longitude');
      return;
    }
    setError(null);
    const lat = parseFloat(coordsData.lat);
    const lng = parseFloat(coordsData.lng);
    if (isNaN(lat) || isNaN(lng)) {
      setError('Invalid coordinates. Use decimal format.');
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setError('Coordinates out of range. Latitude: -90 to 90, Longitude: -180 to 180');
      return;
    }
    onMapNavigate(lat, lng, 15);
  };

  const handleMyLocation = async () => {
    setError(null);
    setLocatingUser(true);
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser');
      setLocatingUser(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onMapNavigate(position.coords.latitude, position.coords.longitude, 16);
        setLocatingUser(false);
      },
      (err) => {
        let errorMsg = 'Unable to get location';
        if (err.code === 1) errorMsg = 'Location permission denied. Enable location in settings.';
        else if (err.code === 2) errorMsg = 'Location unavailable. Check connection.';
        else if (err.code === 3) errorMsg = 'Location request timeout.';
        setError(errorMsg);
        setLocatingUser(false);
      }
    );
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
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
            {error}
          </div>
        )}

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

        {/* Location Search Section */}
        <div className="border border-border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
          <h3 className="text-sm font-semibold mb-3">Jump to Location</h3>

          {/* My Location */}
          <button
            onClick={handleMyLocation}
            disabled={locatingUser || loading}
            className="w-full px-4 py-2 mb-3 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            {locatingUser ? 'Getting location...' : 'My Location'}
          </button>

          {/* Address / Postcode Search */}
          <div className="space-y-2 mb-3 pb-3 border-b border-border">
            <label className="block text-xs font-medium text-muted-foreground">Address / Postcode</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                placeholder="Address"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                placeholder="Postcode (e.g. SW1A 1AA)"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
              <button
                onClick={handleSearchAddressPostcode}
                disabled={loading || locatingUser}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 disabled:opacity-50 rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Coordinates Search */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted-foreground">Latitude / Longitude</label>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                value={coordsData.lat}
                onChange={(e) => setCoordsData({ ...coordsData, lat: e.target.value })}
                placeholder="Latitude"
                step="0.0001"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
              <input
                type="number"
                value={coordsData.lng}
                onChange={(e) => setCoordsData({ ...coordsData, lng: e.target.value })}
                placeholder="Longitude"
                step="0.0001"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
            </div>
            <button
              onClick={handleSearchCoordinates}
              disabled={loading || locatingUser}
              className="w-full px-4 py-2 bg-secondary hover:bg-secondary/80 disabled:opacity-50 rounded-lg transition-colors text-sm"
            >
              Search Coordinates
            </button>
          </div>
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