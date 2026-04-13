import { useState } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const COORDINATE_REGEX = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;

export default function MapSearchBar({ onSearch, onError }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

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
        onSearch({
          lat: result.lat,
          lng: result.lng,
          query: query.trim(),
          type: result.type,
        });
      } else {
        setError('Location not found. Try a different search.');
        if (onError) onError('Location not found');
      }
    } catch (err) {
      setError('Search failed. Please try again.');
      if (onError) onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setError('');
  };

  return (
    <div className="fixed bottom-32 left-6 z-[99999] pointer-events-auto">
      {/* Search Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-secondary transition-colors"
        title="Search locations"
      >
        <Search className="w-5 h-5 text-primary" />
      </button>

      {/* Expandable Search Form */}
      {isOpen && (
        <form onSubmit={handleSearch} className="absolute bottom-16 left-0 w-80 pointer-events-auto">
          <div className="bg-card rounded-lg shadow-lg overflow-hidden border border-border">
            {/* Search Input */}
            <div className="flex items-center gap-2 px-3 py-2">
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError('');
                }}
                placeholder="Address, postcode, coordinates..."
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

            {/* Button Row */}
            <div className="flex gap-2 px-3 py-2 border-t border-border">
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="flex-1 px-3 py-1 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-1 border border-border rounded text-xs font-medium hover:bg-secondary transition-colors"
              >
                Close
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-3 py-2 bg-destructive/10 text-destructive text-xs flex items-center gap-2 border-t border-border">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Help Text */}
            {!error && !query && (
              <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground border-t border-border">
                Try: "51.5, -0.1" or "SW1A 1AA"
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  );
}