import { useState } from 'react';
import { Search, X, AlertCircle, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const COORDINATE_REGEX = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;

export default function FloatingMapSearch({ onSearch, onError, isGrouped = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        setQuery('');
        setIsOpen(false);
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

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setError('');
  };

  return (
    <div className={isGrouped ? "relative" : "fixed bottom-24 right-6 z-[9999] pointer-events-auto sm:bottom-32"}>
      {/* Floating Search Icon Button */}
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-800 text-white rounded-full shadow-lg hover:shadow-xl hover:bg-slate-700 transition-all flex items-center justify-center"
          title="Search location"
        >
          <Search className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      ) : (
        /* Expanded Search Bar */
        <form onSubmit={handleSearch} className="absolute bottom-0 right-0 w-72 sm:w-80 max-w-[calc(100vw-2rem)] pointer-events-auto">
          <div className="bg-card rounded-lg shadow-lg overflow-hidden border border-border animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Search Input */}
            <div className="flex items-center gap-1.5 px-2 py-2">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError('');
                }}
                placeholder="Address, postcode..."
                className="flex-1 bg-transparent text-xs sm:text-sm outline-none"
                disabled={loading}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-0.5 hover:bg-secondary rounded transition-colors"
                  disabled={loading}
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="p-0.5 hover:bg-secondary rounded transition-colors"
              >
                <ChevronUp className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-2 py-1.5 bg-destructive/10 text-destructive text-xs flex items-center gap-1.5 border-t border-border">
                <AlertCircle className="w-2.5 h-2.5 flex-shrink-0" />
                <span className="text-xs">{error}</span>
              </div>
            )}

            {/* Search Button */}
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full px-2 py-1.5 bg-primary text-primary-foreground text-xs sm:text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors border-t border-border"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}