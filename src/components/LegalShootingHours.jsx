import { Sunrise, Sunset, AlertCircle, MapPin } from 'lucide-react';
import { useSunTimes } from '@/hooks/useSunTimes';
import { useState } from 'react';

export default function LegalShootingHours() {
  const sunTimes = useSunTimes();
  const [showManual, setShowManual] = useState(false);
  const [manualHours, setManualHours] = useState({ start: '06:00', end: '20:00' });

  if (!sunTimes || sunTimes.type !== 'normal') {
    return (
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm mb-1">Geolocation Unavailable</p>
              <p className="text-sm text-muted-foreground">Enable location access or set shooting hours manually</p>
            </div>
          </div>
          <button
            onClick={() => setShowManual(!showManual)}
            className="text-xs font-medium px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors flex-shrink-0"
          >
            {showManual ? 'Hide' : 'Set'}
          </button>
        </div>
        {showManual && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Start Time</label>
                <input
                  type="time"
                  value={manualHours.start}
                  onChange={(e) => setManualHours({ ...manualHours, start: e.target.value })}
                  className="w-full px-2 py-1 border border-border rounded text-sm bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">End Time</label>
                <input
                  type="time"
                  value={manualHours.end}
                  onChange={(e) => setManualHours({ ...manualHours, end: e.target.value })}
                  className="w-full px-2 py-1 border border-border rounded text-sm bg-background"
                />
              </div>
            </div>
          </div>
        )}
        {!showManual && manualHours.start && (
          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            Window: {manualHours.start} - {manualHours.end}
          </div>
        )}
      </div>
    );
  }

  const sunrise = sunTimes.sunrise;
  const sunset = sunTimes.sunset;
  const legalStartTime = new Date(sunrise.getTime() + 30 * 60000); // 30 min before sunrise = after sunrise - 30 min... actually legal start is 30 min BEFORE sunrise
  const legalStartActual = new Date(sunrise.getTime() - 30 * 60000);
  const legalEndTime = new Date(sunset.getTime() + 30 * 60000);

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Legal Shooting Hours</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-start gap-3">
          <Sunrise className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
          <div>
            <p className="text-sm text-muted-foreground">Sunrise</p>
            <p className="font-semibold text-lg">{formatTime(sunrise)}</p>
          </div>
        </div>

        <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
          <p className="text-xs text-muted-foreground font-medium uppercase mb-2">Legal Shooting Window</p>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-primary">{formatTime(legalStartActual)} - {formatTime(legalEndTime)}</p>
            <p className="text-xs text-muted-foreground">30 minutes before sunrise to 30 minutes after sunset</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Sunset className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
          <div>
            <p className="text-sm text-muted-foreground">Sunset</p>
            <p className="font-semibold text-lg">{formatTime(sunset)}</p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
        Times calculated based on your device's GPS location. Always check local hunting regulations for your specific area.
      </p>
    </div>
  );
}