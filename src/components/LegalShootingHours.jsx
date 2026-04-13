import { Sunrise, Sunset, AlertCircle } from 'lucide-react';
import { useSunTimes } from '@/hooks/useSunTimes';

export default function LegalShootingHours() {
  const sunTimes = useSunTimes();

  if (!sunTimes || sunTimes.type !== 'normal') {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 text-muted-foreground">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">Unable to calculate shooting hours for your location</p>
        </div>
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