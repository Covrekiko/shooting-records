import { useState, useEffect } from 'react';
import { useSunTimes } from '@/hooks/useSunTimes';

export default function LegalShootingHoursWidget() {
  const { sunTimes } = useSunTimes();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
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