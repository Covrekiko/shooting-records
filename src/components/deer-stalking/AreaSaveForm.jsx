import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];

export default function AreaSaveForm({ polygon, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    deer_species: [],
    location_address: '',
    postcode: '',
  });
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const handleSearchAddress = async () => {
    if (!formData.location_address && !formData.postcode) {
      alert('Enter an address or postcode');
      return;
    }
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Search for location coordinates for: ${formData.location_address || ''} ${formData.postcode || ''}. Return only JSON with lat and lng as numbers.`,
        response_json_schema: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } } },
      });
      setSearchResults([response]);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
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
          <label className="block text-sm font-medium mb-1">Address</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.location_address}
              onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
              placeholder="Enter address"
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
            />
            <button
              onClick={handleSearchAddress}
              disabled={loading}
              className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Postcode</label>
          <input
            type="text"
            value={formData.postcode}
            onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
            placeholder="e.g. SW1A 1AA"
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
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