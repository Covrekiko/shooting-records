/**
 * AutoCheckinSettingToggle
 * Drop-in settings toggle. Reads/writes user preference via base44.auth.updateMe.
 * Can be embedded in Profile or any settings page.
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MapPin, Info } from 'lucide-react';

export default function AutoCheckinSettingToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    base44.auth.me().then((user) => {
      setEnabled(user?.autoCheckinEnabled === true);
      setLoading(false);
    });
  }, []);

  const toggle = async () => {
    if (loading) return;

    // If turning ON, request geolocation permission first
    if (!enabled) {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
      try {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        setPermissionDenied(false);
      } catch {
        setPermissionDenied(true);
        return;
      }
    }

    const next = !enabled;
    setEnabled(next);
    setLoading(true);
    await base44.auth.updateMe({ autoCheckinEnabled: next });
    setLoading(false);
  };

  if (loading) return null;

  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Auto Check-In by Location</p>
            <p className="text-xs text-muted-foreground">Checks you in automatically after 10 min at a saved location</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowInfo(!showInfo)} className="p-1 text-muted-foreground hover:text-foreground">
            <Info className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggle}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'}`}
            aria-label="Toggle auto check-in"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
      </div>

      {showInfo && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-1">How it works</p>
          <p>Auto Check-In uses your location only to detect if you are at a saved shooting club, clay ground, or stalking boundary. Your location is never uploaded or stored when this feature is off.</p>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Detects clubs/ranges within 300m</li>
            <li>Detects stalking areas from drawn boundaries</li>
            <li>Check-in created after 10 minutes inside the location</li>
            <li>You can cancel or delete any auto check-in</li>
          </ul>
        </div>
      )}

      {permissionDenied && (
        <p className="text-xs text-destructive font-medium">
          Location permission was denied. Please enable location access in your browser or device settings.
        </p>
      )}

      <p className="text-[10px] text-muted-foreground">
        Status: <span className={`font-semibold ${enabled ? 'text-emerald-600' : 'text-slate-400'}`}>{enabled ? 'On' : 'Off (default)'}</span>
      </p>
    </div>
  );
}