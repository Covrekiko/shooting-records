import { useState, useEffect } from 'react';

export default function LegalShootingHoursWidget() {
  const [sunTimes, setSunTimes] = useState(null);

  useEffect(() => {
    const calculateSunTimes = () => {
      const today = new Date();
      const latitude = 51.5074; // London default
      const longitude = -0.1278;

      // Simple sunrise/sunset approximation
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
      const sunrise = new Date(today);
      const sunset = new Date(today);

      // Rough calculation: sunrise ~6:30am, sunset ~6:30pm (varies by season)
      const minuteVariation = Math.sin((dayOfYear / 365) * Math.PI * 2) * 120;
      sunrise.setHours(6, Math.floor(30 + minuteVariation), 0);
      sunset.setHours(18, Math.floor(30 - minuteVariation), 0);

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