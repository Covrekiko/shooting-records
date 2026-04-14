import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sun } from 'lucide-react';

function LegalShootingHoursWidgetLarge() {
  const [sunTimes, setSunTimes] = useState(null);

  useEffect(() => {
    const calculateSunTimes = () => {
      const today = new Date();
      const lat = 51.5074;
      const lng = 0.1278;
      
      const J = today.getFullYear();
      const M = today.getMonth() + 1;
      const D = today.getDate();
      
      const n = 367 * J - Math.floor(7 * (J + Math.floor((M + 9) / 12)) / 4) + Math.floor(275 * M / 9) + D - 730531.5;
      
      const J2000 = n + 0.0008;
      const M_sun = (357.5291 + 0.98560028 * J2000) % 360;
      const lambda = 280.4659 + 0.98564736 * J2000 + 1.9146 * Math.sin(M_sun * Math.PI / 180) + 0.0200 * Math.sin(2 * M_sun * Math.PI / 180);
      
      const dec = Math.asin(Math.sin(lambda * Math.PI / 180) * Math.sin(23.439 * Math.PI / 180)) * 180 / Math.PI;
      
      const cosH = -Math.tan(lat * Math.PI / 180) * Math.tan(dec * Math.PI / 180);
      let h = 0;
      
      if (cosH < -1) {
        h = 180;
      } else if (cosH > 1) {
        h = 0;
      } else {
        h = Math.acos(cosH) * 180 / Math.PI;
      }
      
      const eq = 9.81 * Math.sin(2 * lambda * Math.PI / 180) - 7.53 * Math.cos((lambda - 78.51) * Math.PI / 180) - 1.5 * Math.sin((lambda - 2.4) * Math.PI / 180);
      
      const sunrise_ut = 12 - h / 15 + lng / 15 - eq / 60;
      const sunset_ut = 12 + h / 15 + lng / 15 - eq / 60;
      
      const offset = today.getTimezoneOffset() / -60;
      
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

  if (!sunTimes) return null;

  const formatTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const startTime = formatTime(sunTimes.sunrise);
  const endTime = formatTime(sunTimes.sunset);
  const legalStart = new Date(sunTimes.sunrise);
  legalStart.setMinutes(legalStart.getMinutes() - 30);
  const legalEnd = new Date(sunTimes.sunset);
  legalEnd.setMinutes(legalEnd.getMinutes() + 30);
  const legalStartTime = formatTime(legalStart);
  const legalEndTime = formatTime(legalEnd);

  return (
    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl px-8 py-8 border border-border shadow-lg">
      <h2 className="text-2xl font-bold mb-8 text-center">Today's Legal Shooting Hours</h2>
      <div className="space-y-6 max-w-md mx-auto">
        <div className="flex items-center justify-between gap-4 bg-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Sun className="w-8 h-8 text-amber-500" />
            <div>
              <div className="text-sm text-muted-foreground">Sunrise</div>
              <div className="text-2xl font-bold">{startTime}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-primary/10 rounded-2xl p-4 text-center">
          <div className="text-sm font-medium text-muted-foreground mb-2">Legal Shooting Window</div>
          <div className="text-xl font-bold text-primary">{legalStartTime} — {legalEndTime}</div>
          <div className="text-xs text-muted-foreground mt-2">(30 min before sunrise to 30 min after sunset)</div>
        </div>
        
        <div className="flex items-center justify-between gap-4 bg-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Sun className="w-8 h-8 text-amber-600 opacity-70" />
            <div>
              <div className="text-sm text-muted-foreground">Sunset</div>
              <div className="text-2xl font-bold">{endTime}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SunriseSunsetForecast() {
  const [forecast, setForecast] = useState([]);

  useEffect(() => {
    const calculateForecast = () => {
      const lat = 51.5074;
      const lng = 0.1278;
      const days = [];

      for (let dayOffset = 0; dayOffset < 15; dayOffset++) {
        const date = new Date();
        date.setDate(date.getDate() + dayOffset);
        
        const J = date.getFullYear();
        const M = date.getMonth() + 1;
        const D = date.getDate();
        
        const n = 367 * J - Math.floor(7 * (J + Math.floor((M + 9) / 12)) / 4) + Math.floor(275 * M / 9) + D - 730531.5;
        const J2000 = n + 0.0008;
        const M_sun = (357.5291 + 0.98560028 * J2000) % 360;
        const lambda = 280.4659 + 0.98564736 * J2000 + 1.9146 * Math.sin(M_sun * Math.PI / 180) + 0.0200 * Math.sin(2 * M_sun * Math.PI / 180);
        
        const dec = Math.asin(Math.sin(lambda * Math.PI / 180) * Math.sin(23.439 * Math.PI / 180)) * 180 / Math.PI;
        const cosH = -Math.tan(lat * Math.PI / 180) * Math.tan(dec * Math.PI / 180);
        
        let h = 0;
        if (cosH < -1) h = 180;
        else if (cosH > 1) h = 0;
        else h = Math.acos(cosH) * 180 / Math.PI;
        
        const eq = 9.81 * Math.sin(2 * lambda * Math.PI / 180) - 7.53 * Math.cos((lambda - 78.51) * Math.PI / 180) - 1.5 * Math.sin((lambda - 2.4) * Math.PI / 180);
        
        const sunrise_ut = 12 - h / 15 + lng / 15 - eq / 60;
        const sunset_ut = 12 + h / 15 + lng / 15 - eq / 60;
        
        const offset = date.getTimezoneOffset() / -60;
        
        const sunrise = new Date(date);
        sunrise.setHours(Math.floor((sunrise_ut + offset) % 24));
        sunrise.setMinutes(Math.round(((sunrise_ut + offset) % 1) * 60));
        
        const sunset = new Date(date);
        sunset.setHours(Math.floor((sunset_ut + offset) % 24));
        sunset.setMinutes(Math.round(((sunset_ut + offset) % 1) * 60));

        days.push({ date, sunrise, sunset });
      }

      setForecast(days);
    };

    calculateForecast();
  }, []);

  const formatTime = (date) => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold px-4">15-Day Forecast</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-4">
        {forecast.map((day, idx) => (
          <div key={idx} className="bg-card rounded-lg p-3 border border-border/50">
            <div className="text-xs font-medium text-muted-foreground mb-2">{formatDate(day.date)}</div>
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-500" />
                <span className="text-xs">{formatTime(day.sunrise)}</span>
              </div>
              <span className="text-xs text-muted-foreground">→</span>
              <div className="flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-600 opacity-70" />
                <span className="text-xs">{formatTime(day.sunset)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SunriseSunsetTracker() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-secondary rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Sunrise & Sunset</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <LegalShootingHoursWidgetLarge />
        <SunriseSunsetForecast />
      </div>
    </div>
  );
}