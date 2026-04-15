import { useState, useEffect } from 'react';
import { Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LegalShootingHoursWidget() {
  const navigate = useNavigate();
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

  const legalStart = new Date(sunTimes.sunrise);
  legalStart.setHours(legalStart.getHours() - 1);
  const legalEnd = new Date(sunTimes.sunset);
  legalEnd.setHours(legalEnd.getHours() + 1);

  const legalStartTime = formatTime(legalStart);
  const legalEndTime = formatTime(legalEnd);

  return (
    <button onClick={() => navigate('/sunrise-sunset')} className="w-full text-left hover:opacity-95 active:scale-95 transition-all relative z-[9999]">
      <div className="bg-white/20 dark:bg-slate-700/30 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/40 dark:border-slate-600/40 shadow-lg hover:shadow-xl transition-shadow">
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5 uppercase tracking-wide">Legal Hours</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-xs text-slate-700 dark:text-slate-300">Rise:</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{startTime}</span>
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400 text-right">{legalStartTime}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-amber-500 opacity-60 flex-shrink-0" />
              <span className="text-xs text-slate-700 dark:text-slate-300">Set:</span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{endTime}</span>
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400 text-right">{legalEndTime}</span>
          </div>
        </div>
      </div>
    </button>
  );
}