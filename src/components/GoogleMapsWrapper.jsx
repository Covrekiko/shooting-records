import { useEffect, useState } from 'react';

export default function GoogleMapsWrapper({ children }) {
  const [apiKey, setApiKey] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        // Try to load from environment variable first
        const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (envKey) {
          setApiKey(envKey);
          return;
        }

        // Fall back to fetching from a backend endpoint if available
        const response = await fetch('/api/google-maps-key');
        if (response.ok) {
          const data = await response.json();
          setApiKey(data.key);
        } else {
          setError('Failed to load Google Maps API key');
        }
      } catch (err) {
        setError('Error loading Google Maps API key: ' + err.message);
      }
    };

    loadApiKey();
  }, []);

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <p className="text-red-500 font-semibold">{error}</p>
          <p className="text-sm mt-2">Please check your Google Maps API key configuration.</p>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Set the API key globally for @react-google-maps/api
  window.GOOGLE_MAPS_API_KEY = apiKey;

  return children;
}