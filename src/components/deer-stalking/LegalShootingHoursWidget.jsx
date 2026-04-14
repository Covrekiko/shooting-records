import { useState, useEffect } from 'react';
import { Sun } from 'lucide-react';

export default function LegalShootingHoursWidget() {
  const [sunTimes, setSunTimes] = useState(null);

  useEffect(() => {
    const calculateSunTimes = () => {
      const today = new Date();
      const lat = 51.5074; // London latitude
      const lng = -0.1278; // London longitude

      // Day of year
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
      
      // Simplified accurate sunrise/sunset using equation of time
      const J = dayOfYear - 1;
      const M = (6.2401 + 0.01720197 * (365.25 * (today.getFullYear() - 2000) + J)) % (2 * Math.PI);
      const eot = 9.87 * Math.sin(2 * M) - 7.53 * Math.cos(M) - 1.5 * Math.sin(M);
      
      const decl = 0.4093 * Math.sin((2 * Math.PI * (dayOfYear - 81)) / 365);
      const ha = Math.acos(-Math.tan(lat * Math.PI / 180) * Math.tan(decl));
      
      const sunrise = new Date(today);
      const sunset = new Date(today);
      
      // UTC times
      const solarNoon = (12 - lng / 15 - eot / 60) * 60;
      const sunriseMin = (solarNoon - (ha * 180 / Math.PI) / 15 * 60);
      const sunsetMin = (solarNoon + (ha * 180 / Math.PI) / 15 * 60);
      
      sunrise.setMinutes(sunriseMin);
      sunset.setMinutes(sunsetMin);

      setSunTimes({ sunrise, sunset });
    };

    calculateSunTimes();
  }, []);

  if (!sunTimes) {
    return null;
  }

  const formatTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const startTime = formatTime(sunTimes.sunrise);
  const endTime = formatTime(sunTimes.sunset);

  // Calculate legal shooting hours (30 mins before sunrise to 30 mins after sunset in UK)
  const legalStart = new Date(sunTimes.sunrise);
  legalStart.setMinutes(legalStart.getMinutes() - 30);
  const legalEnd = new Date(sunTimes.sunset);
  legalEnd.setMinutes(legalEnd.getMinutes() + 30);

  const legalStartTime = formatTime(legalStart);
  const legalEndTime = formatTime(legalEnd);

  return (
    <div className="bg-card/95 backdrop-blur-sm rounded-2xl px-3 py-2 border border-border shadow-lg">
      <div className="text-xs font-medium text-muted-foreground mb-1">Legal Shooting</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Sun className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-muted-foreground">Rise:</span>
            <span className="text-xs font-semibold text-foreground">{startTime}</span>
          </div>
          <span className="text-xs text-muted-foreground text-right">Legal: {legalStartTime}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Sun className="w-3 h-3 text-amber-600 opacity-70" />
            <span className="text-xs text-muted-foreground">Set:</span>
            <span className="text-xs font-semibold text-foreground">{endTime}</span>
          </div>
          <span className="text-xs text-muted-foreground text-right">Legal: {legalEndTime}</span>
        </div>
      </div>
    </div>
  );
}