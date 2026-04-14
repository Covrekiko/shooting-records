import { useState, useEffect } from 'react';
import { Sun } from 'lucide-react';

export default function LegalShootingHoursWidget() {
  const [sunTimes, setSunTimes] = useState(null);

  useEffect(() => {
    const calculateSunTimes = () => {
      const today = new Date();
      const lat = 51.5074; // London latitude
      const lng = 0.1278; // London longitude (positive for East)
      
      const J = today.getFullYear();
      const M = today.getMonth() + 1;
      const D = today.getDate();
      
      const n = 367 * J - Math.floor(7 * (J + Math.floor((M + 9) / 12)) / 4) + Math.floor(275 * M / 9) + D - 730531.5;
      
      const J2000 = n + 0.0008;
      const M_sun = (357.5291 + 0.98560028 * J2000) % 360;
      const lambda = 280.4659 + 0.98564736 * J2000 + 1.9146 * Math.sin(M_sun * Math.PI / 180) + 0.0200 * Math.sin(2 * M_sun * Math.PI / 180);
      
      const JD = J2000 + 2451545;
      const dec = Math.asin(Math.sin(lambda * Math.PI / 180) * Math.sin(23.439 * Math.PI / 180)) * 180 / Math.PI;
      
      const cosH = -Math.tan(lat * Math.PI / 180) * Math.tan(dec * Math.PI / 180);
      let h = 0;
      
      if (cosH < -1) {
        h = 180; // Polar night
      } else if (cosH > 1) {
        h = 0; // Polar day
      } else {
        h = Math.acos(cosH) * 180 / Math.PI;
      }
      
      const eq = 9.81 * Math.sin(2 * lambda * Math.PI / 180) - 7.53 * Math.cos((lambda - 78.51) * Math.PI / 180) - 1.5 * Math.sin((lambda - 2.4) * Math.PI / 180);
      
      const sunrise_ut = 12 - h / 15 + lng / 15 - eq / 60;
      const sunset_ut = 12 + h / 15 + lng / 15 - eq / 60;
      
      // Convert to local time (BST/GMT)
      const offset = today.getTimezoneOffset() / -60; // Get timezone offset in hours
      
      const sunrise = new Date(today);
      sunrise.setHours(Math.floor((sunrise_ut + offset) % 24));
      sunrise.setMinutes(Math.round(((sunrise_ut + offset) % 1) * 60));
      
      const sunset = new Date(today);
      sunset.setHours(Math.floor((sunset_ut + offset) % 24));
      sunset.setMinutes(Math.round(((sunset_ut + offset) % 1) * 60));

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