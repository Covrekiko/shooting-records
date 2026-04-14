import { useState, useEffect } from 'react';

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

  return (
    <div className="bg-card/95 backdrop-blur-sm rounded-2xl px-3 py-2 border border-border shadow-lg">
      <div className="text-xs font-medium text-muted-foreground mb-1">Legal Hours</div>
      <div className="flex items-center gap-2">
        <div className="text-center">
          <div className="text-sm font-semibold text-foreground">{startTime}</div>
          <div className="text-xs text-muted-foreground">Start</div>
        </div>
        <div className="text-muted-foreground">—</div>
        <div className="text-center">
          <div className="text-sm font-semibold text-foreground">{endTime}</div>
          <div className="text-xs text-muted-foreground">End</div>
        </div>
      </div>
    </div>
  );
}