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
    <div className={isGrouped ? "relative" : "fixed top-20 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto px-4 sm:px-0"}>
      {!isOpen ? (
        /* Closed: Icon Button */
        <button
          onClick={() => setIsOpen(true)}
          className="w-11 h-11 sm:w-12 sm:h-12 bg-white/20 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 rounded-full shadow-lg hover:shadow-xl hover:bg-white/30 dark:hover:bg-slate-700/40 active:scale-95 transition-all flex items-center justify-center flex-shrink-0 border border-white/40 dark:border-slate-600/40 backdrop-blur-md"
          title="Search location"
        >
          <Search className="w-5 h-5" />
        </button>
      ) : (
        /* Expanded: Search Bar */
        <form onSubmit={handleSearch} className="w-full sm:w-96 max-w-[calc(100vw-2rem)]">
          <div className="bg-white/20 dark:bg-slate-700/30 rounded-2xl shadow-lg overflow-hidden border border-white/40 dark:border-slate-600/40 animate-in fade-in slide-in-from-top-2 duration-200 backdrop-blur-md">
            {/* Search Input */}
            <div className="flex items-center gap-2 px-4 py-3">
              <Search className="w-4 h-4 text-slate-600 dark:text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setError('');
                }}
                placeholder="Address, postcode..."
                className="flex-1 bg-transparent text-sm outline-none placeholder-slate-500 dark:placeholder-slate-400 text-slate-700 dark:text-slate-300"
                disabled={loading}
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 hover:bg-white/20 dark:hover:bg-slate-600/30 rounded transition-colors flex-shrink-0"
                  disabled={loading}
                >
                  <X className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="p-1 hover:bg-white/20 dark:hover:bg-slate-600/30 rounded transition-colors flex-shrink-0"
              >
                <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-2.5 bg-red-500/15 text-red-700 dark:text-red-400 text-xs flex items-center gap-2 border-t border-white/20 dark:border-slate-600/30">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Search Button */}
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full px-4 py-3 bg-amber-500/20 dark:bg-amber-600/25 text-amber-700 dark:text-amber-400 text-sm font-semibold hover:bg-amber-500/30 dark:hover:bg-amber-600/35 disabled:opacity-50 transition-colors border-t border-white/20 dark:border-slate-600/30 active:scale-95"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}