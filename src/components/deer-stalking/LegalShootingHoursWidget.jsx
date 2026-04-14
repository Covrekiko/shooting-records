import { useState, useEffect } from 'react';
import { Sun } from 'lucide-react';

export default function LegalShootingHoursWidget() {
  const [sunTimes, setSunTimes] = useState(null);

  useEffect(() => {
    const calculateSunTimes = () => {
      const today = new Date();
      const lat = 51.5074; // London latitude
      const lng = -0.1278; // London longitude (negative for West)
      
      const J = today.getFullYear();
      const M = today.getMonth() + 1;
      const D = today.getDate();
      
      // Day of year
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
      
      // Julian day
      const JD = 367 * J - Math.floor(7 * (J + Math.floor((M + 9) / 12)) / 4) + Math.floor(275 * M / 9) + D - 730531.5;
      
      // Mean solar time
      const n = dayOfYear + (today.getHours() - 12) / 24;
      
      // Solar mean anomaly
      const J_prime = JD + 0.0009;
      const M_sun = (357.5291 + 0.98560028 * J_prime) % 360;
      const M_rad = M_sun * Math.PI / 180;
      
      // Equation of center
      const C = (1.9146 - 0.004817 * (J_prime / 36525) - 0.000014 * Math.pow(J_prime / 36525, 2)) * Math.sin(M_rad) + (0.019993 - 0.000101 * (J_prime / 36525)) * Math.sin(2 * M_rad) + 0.00029 * Math.sin(3 * M_rad);
      
      // Sun's true longitude
      const lambda = 280.4665 + 36000.76983 * (J_prime / 36525) + 0.0003032 * Math.pow(J_prime / 36525, 2) + C;
      
      // Sun's declination
      const lambda_rad = lambda * Math.PI / 180;
      const dec_rad = Math.asin(0.39779 * Math.sin(lambda_rad));
      
      // Hour angle
      const lat_rad = lat * Math.PI / 180;
      const cosH = -Math.tan(lat_rad) * Math.tan(dec_rad);
      
      let H = 0;
      if (cosH < -1) H = Math.PI; // Polar night
      else if (cosH > 1) H = 0; // Polar day
      else H = Math.acos(cosH);
      
      // Equation of time
      const e_year = (J_prime - 1) / 36525;
      const e_mult = 229.18 * (0.01674 * Math.sin(M_rad) - 2 * 0.01331 * Math.sin(M_rad) + 0.00369 * Math.sin(2 * M_rad));
      
      // Sunrise/Sunset times in UTC (hours)
      const sunrise_ut = 12 + (lng / 15) - (H * 180 / Math.PI / 15) - (e_mult / 60);
      const sunset_ut = 12 + (lng / 15) + (H * 180 / Math.PI / 15) - (e_mult / 60);
      
      // Convert to local time
      const offset = today.getTimezoneOffset() / -60;
      const sunrise_local = sunrise_ut + offset;
      const sunset_local = sunset_ut + offset;
      
      const sunrise = new Date(today);
      sunrise.setHours(Math.floor(sunrise_local % 24));
      sunrise.setMinutes(Math.round((sunrise_local % 1) * 60));
      sunrise.setSeconds(0);
      
      const sunset = new Date(today);
      sunset.setHours(Math.floor(sunset_local % 24));
      sunset.setMinutes(Math.round((sunset_local % 1) * 60));
      sunset.setSeconds(0);

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