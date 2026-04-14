import { useState, useEffect } from 'react';
import { Sun } from 'lucide-react';

export default function LegalShootingHoursWidget() {
  const [sunTimes, setSunTimes] = useState(null);

  useEffect(() => {
    const calculateSunTimes = () => {
      const today = new Date();
      const lat = 51.5074; // London latitude
      const lng = 0.1278; // London longitude (positive)
      
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
      
      // Simplified NOAA algorithm
      const J_century = (today.getFullYear() + dayOfYear / 365.25 - 2000) / 100;
      const J_day = dayOfYear - 1 + 0.5;
      const J2000 = 367 * today.getFullYear() - Math.floor(7 * (today.getFullYear() + Math.floor((today.getMonth() + 1 + 9) / 12)) / 4) + Math.floor(275 * (today.getMonth() + 1) / 9) + today.getDate() - 730531.5;
      
      // Mean anomaly (degrees)
      const M = (357.52911 + 35999.05029 * J_century - 0.0001536 * J_century * J_century) % 360;
      const M_rad = M * Math.PI / 180;
      
      // Equation of center
      const C = (1.914602 - 0.004817 * J_century - 0.000014 * J_century * J_century) * Math.sin(M_rad) 
        + (0.019993 - 0.000101 * J_century) * Math.sin(2 * M_rad) 
        + 0.000029 * Math.sin(3 * M_rad);
      
      // Sun's true longitude
      const sun_lon = (280.46646 + 36000.76983 * J_century + 0.0003032 * J_century * J_century + C) % 360;
      
      // Sun's apparent longitude
      const omega = 125.04 - 1934.136 * J_century;
      const lambda = sun_lon - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180);
      
      // Declination
      const eps = (23.439291 - 0.0130042 * J_century - 0.00000016 * J_century * J_century + 0.000000504 * J_century * J_century * J_century) * Math.PI / 180;
      const sin_dec = Math.sin(eps) * Math.sin(lambda * Math.PI / 180);
      const dec = Math.asin(sin_dec) * 180 / Math.PI;
      
      // Hour angle
      const lat_rad = lat * Math.PI / 180;
      const dec_rad = dec * Math.PI / 180;
      const h = -0.833; // Standard altitude for sunrise/sunset
      const cosH = (Math.sin(h * Math.PI / 180) - Math.sin(lat_rad) * Math.sin(dec_rad)) / (Math.cos(lat_rad) * Math.cos(dec_rad));
      
      let H = 0;
      if (cosH < -1) H = 180; // Polar day
      else if (cosH > 1) H = 0; // Polar night
      else H = Math.acos(cosH) * 180 / Math.PI;
      
      // Equation of time (in minutes)
      const y = Math.tan(eps / 2);
      const y_sq = y * y;
      const eot = 229.18 * (y_sq * Math.sin(2 * M_rad) - 2 * 0.0167 * Math.sin(M_rad) + 4 * y_sq * Math.cos(2 * M_rad) - 2.5 * y_sq);
      
      // Sunrise/Sunset times (UTC hours)
      const sunrise_utc = 12 + lng / 15 - (H + lng) / 15 - eot / 60;
      const sunset_utc = 12 + lng / 15 + (H - lng) / 15 - eot / 60;
      
      // Convert to local time (BST = UTC+1)
      const sunrise_local = (sunrise_utc + 1 + 24) % 24;
      const sunset_local = (sunset_utc + 1 + 24) % 24;
      
      const sunrise = new Date(today);
      sunrise.setHours(Math.floor(sunrise_local), Math.round((sunrise_local % 1) * 60), 0, 0);
      
      const sunset = new Date(today);
      sunset.setHours(Math.floor(sunset_local), Math.round((sunset_local % 1) * 60), 0, 0);

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