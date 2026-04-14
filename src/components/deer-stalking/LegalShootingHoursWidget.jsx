import { useState, useEffect } from 'react';
import { Sun } from 'lucide-react';

export default function LegalShootingHoursWidget() {
  const [sunTimes, setSunTimes] = useState(null);

  useEffect(() => {
    const calculateSunTimes = () => {
      const today = new Date();
      const lat = 51.5074; // London latitude
      const lng = -0.1278; // London longitude
      
      const J = today.getFullYear();
      const M = today.getMonth() + 1;
      const D = today.getDate();
      
      // Simplified sunrise/sunset calculation
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
      
      // Julian day
      const JD = 367 * J - Math.floor(7 * (J + Math.floor((M + 9) / 12)) / 4) + Math.floor(275 * M / 9) + D - 730531.5;
      const nstar = dayOfYear - 0.0009 - lng / 360;
      
      // Solar mean anomaly
      const Jstar = Math.floor(JD - 0.0009 + (lng / 360));
      const n = dayOfYear - 0.0009 - lng / 360;
      const J_prime = Jstar + 0.0009 + (lng / 360);
      const M_sun = (357.52911 + 35999.05029 * ((J_prime - 2451545) / 36525)) % 360;
      
      // Sun's equation of center
      const C = (1.914602 - 0.004817 * ((J_prime - 2451545) / 36525) - 0.000014 * Math.pow((J_prime - 2451545) / 36525, 2)) * Math.sin(M_sun * Math.PI / 180) 
        + (0.019993 - 0.000101 * ((J_prime - 2451545) / 36525)) * Math.sin(2 * M_sun * Math.PI / 180) 
        + 0.000289 * Math.sin(3 * M_sun * Math.PI / 180);
      
      // Sun's true longitude
      const sun_true_long = M_sun + C;
      const sun_app_long = sun_true_long - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * ((J_prime - 2451545) / 36525)) * Math.PI / 180);
      
      // Declination
      const dec = Math.asin(Math.sin(23.439291 * Math.PI / 180) * Math.sin(sun_app_long * Math.PI / 180)) * 180 / Math.PI;
      
      // Hour angle
      const lat_rad = lat * Math.PI / 180;
      const cosH = -Math.tan(lat_rad) * Math.tan(dec * Math.PI / 180);
      
      let H = 0;
      if (cosH < -1) H = 180;
      else if (cosH > 1) H = 0;
      else H = Math.acos(cosH) * 180 / Math.PI;
      
      // Equation of time
      const eps = Math.asin(Math.sin(23.439291 * Math.PI / 180) * Math.sin(sun_app_long * Math.PI / 180));
      const y = Math.pow(Math.tan((23.439291 / 2) * Math.PI / 180), 2);
      const eqtime = 229.18 * (y * Math.sin(2 * M_sun * Math.PI / 180) - 2 * 0.01670 * Math.sin(M_sun * Math.PI / 180) + 4 * y * Math.cos(2 * M_sun * Math.PI / 180) - 2 * 0.01670 * y);
      
      // Sunrise/Sunset in UTC (minutes from midnight)
      const sunrise_ut = (720 - 4 * lng - eqtime - 60 * Math.acos(-Math.tan(lat_rad) * Math.tan(dec * Math.PI / 180)) * 180 / Math.PI) / 60;
      const sunset_ut = (720 - 4 * lng - eqtime + 60 * Math.acos(-Math.tan(lat_rad) * Math.tan(dec * Math.PI / 180)) * 180 / Math.PI) / 60;
      
      // Convert to BST (UTC+1)
      const offset = 1; // BST
      const sunrise_local = sunrise_ut + offset;
      const sunset_local = sunset_ut + offset;
      
      const sunrise = new Date(today);
      const sunriseHours = Math.floor(sunrise_local);
      const sunriseMinutes = Math.round((sunrise_local - sunriseHours) * 60);
      sunrise.setHours(sunriseHours, sunriseMinutes, 0, 0);
      
      const sunset = new Date(today);
      const sunsetHours = Math.floor(sunset_local);
      const sunsetMinutes = Math.round((sunset_local - sunsetHours) * 60);
      sunset.setHours(sunsetHours, sunsetMinutes, 0, 0);

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