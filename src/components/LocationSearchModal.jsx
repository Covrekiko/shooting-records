import { useState } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const COORDINATE_REGEX = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;

export default function LocationSearchModal({ isOpen, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const parseCoordinates = (input) => {
    const match = input.trim().match(COORDINATE_REGEX);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng, type: 'coordinates' };
      }
    }
    return null;
  };

  const searchByAddressOrPostcode = async (searchTerm) => {
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Find the geographic coordinates for this location: "${searchTerm}". Return a JSON object with lat (latitude) and lng (longitude) as numbers. Be as accurate as possible.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            lat: { type: 'number' },
            lng: { type: 'number' },
          },
        },
      });
      
      if (response?.lat !== undefined && response?.lng !== undefined) {
        return { lat: response.lat, lng: response.lng, type: 'address' };
      }
      return null;
    } catch (err) {
      console.error('Search error:', err);
      return null;
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a location');
      return;
    }

    setError('');
    setLoading(true);

    try {
      let result = parseCoordinates(query);

      if (!result) {
        result = await searchByAddressOrPostcode(query);
      }

      if (result) {
        onSelect({
          lat: result.lat,
          lng: result.lng,
          query: query.trim(),
          type: result.type,
        });
        setQuery('');
        onClose();
      } else {
        setError('Location not found. Try a different search.');
      }
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 pointer-events-auto">
      <form onSubmit={handleSearch} className="bg-card rounded-lg shadow-xl w-96 max-w-[calc(100%-2rem)] overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold">Find Location</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-background">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError('');
              }}
              placeholder="Address, postcode, or coordinates..."
              className="flex-1 bg-transparent text-sm outline-none"
              disabled={loading}
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-secondary rounded transition-colors"
                disabled={loading}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-3 py-2 bg-destructive/10 text-destructive text-sm flex items-center gap-2 rounded">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Help Text */}
          {!error && !query && (
            <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground rounded">
              <p className="font-medium mb-1">Examples:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>51.5074, -0.1278</li>
                <li>SW1A 1AA</li>
                <li>Big Ben, London</li>
              </ul>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium transition-colors"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}