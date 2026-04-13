import { Sun, AlertCircle } from 'lucide-react';
import { useSunTimes } from '@/hooks/useSunTimes';
import { useState, useEffect } from 'react';

export default function ShootingHoursWidget() {
  const sunTimes = useSunTimes();
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isLegalHours, setIsLegalHours] = useState(false);

  useEffect(() => {
    if (!sunTimes || sunTimes.type !== 'normal') return;

    const now = new Date();
    const legalStart = new Date(sunTimes.sunrise.getTime() - 60 * 60000);
    const legalEnd = new Date(sunTimes.sunset.getTime() + 60 * 60000);

    const isLegal = now >= legalStart && now <= legalEnd;
    setIsLegalHours(isLegal);

    if (isLegal) {
      const msRemaining = legalEnd - now;
      const hours = Math.floor(msRemaining / 3600000);
      const minutes = Math.floor((msRemaining % 3600000) / 60000);
      setTimeRemaining(`${hours}h ${minutes}m`);
    }
  }, [sunTimes]);

  if (!sunTimes || sunTimes.type !== 'normal') {
    return (
      <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Shooting Hours</p>
            <p className="text-lg font-semibold text-foreground">Enable location</p>
          </div>
          <AlertCircle className="w-6 h-6 text-muted-foreground" />
        </div>
      </div>
    );
  }

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const legalStart = new Date(sunTimes.sunrise.getTime() - 60 * 60000);
  const legalEnd = new Date(sunTimes.sunset.getTime() + 60 * 60000);

  return (
    <div className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm text-muted-foreground mb-2">Legal Shooting Hours</p>
          <p className={`text-sm font-semibold ${isLegalHours ? 'text-green-600' : 'text-amber-600'}`}>
            {formatTime(legalStart)} – {formatTime(legalEnd)}
          </p>
        </div>
        <Sun className={`w-6 h-6 ${isLegalHours ? 'text-green-600' : 'text-amber-600'}`} />
      </div>
      {isLegalHours && (
        <p className="text-xs text-green-600 font-medium">
          Permitted for {timeRemaining}
        </p>
      )}
      {!isLegalHours && (
        <p className="text-xs text-amber-600 font-medium">
          Shooting hours not active
        </p>
      )}
    </div>
  );
}