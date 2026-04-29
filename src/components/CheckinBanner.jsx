import { useState } from 'react';
import { MapPin, X } from 'lucide-react';

export default function CheckinBanner({ location, distance, onDismiss, onCheckin }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || distance > 0.5) return null; // Hide if >500m away or dismissed

  return (
    <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-bottom-5 z-40">
      <div className="flex items-start gap-3">
        <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{location}</p>
          <p className="text-xs opacity-90 mt-1">{distance.toFixed(1)}km away. Check in?</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onCheckin}
              className="flex-1 px-3 py-1 bg-primary-foreground text-primary rounded text-xs font-medium hover:opacity-90"
            >
              Check In
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="px-2 py-1 hover:bg-primary-foreground/20 rounded text-xs"
            >
              Later
            </button>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-primary-foreground hover:opacity-75 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}