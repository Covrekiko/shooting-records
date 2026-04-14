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
    <div className="flex gap-4">
      {/* Sunrise Card */}
      <div className="bg-card/95 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border shadow-lg text-center">
        <Sun className="w-6 h-6 text-amber-500 mx-auto mb-2" />
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Sunrise</div>
        <div className="text-2xl font-bold text-foreground mb-1">{startTime}</div>
        <div className="text-xs text-muted-foreground">Legal: {legalStartTime}</div>
      </div>

      {/* Sunset Card */}
      <div className="bg-card/95 backdrop-blur-sm rounded-2xl px-4 py-3 border border-border shadow-lg text-center">
        <Sun className="w-6 h-6 text-amber-600 mx-auto mb-2 opacity-70" />
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Sunset</div>
        <div className="text-2xl font-bold text-foreground mb-1">{endTime}</div>
        <div className="text-xs text-muted-foreground">Legal: {legalEndTime}</div>
      </div>
    </div>
  );
}