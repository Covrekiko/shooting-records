import { Sunrise, Sunset, AlertCircle, Sun, CheckCircle } from 'lucide-react';
import { useSunTimes } from '@/hooks/useSunTimes';
import { useState, useEffect } from 'react';

export default function LegalShootingHours() {
  const sunTimes = useSunTimes();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeRemaining, setTimeRemaining] = useState('');
  const [isLegalHours, setIsLegalHours] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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
  }, [sunTimes, currentTime]);

  const sunrise = sunTimes?.sunrise || new Date(new Date().setHours(6, 12, 0, 0));
  const sunset = sunTimes?.sunset || new Date(new Date().setHours(19, 52, 0, 0));
  const legalStart = new Date(sunrise.getTime() - 60 * 60000);
  const legalEnd = new Date(sunset.getTime() + 60 * 60000);

  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formatSunTime = (date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const getTimelinePosition = () => {
    const dayStart = new Date(currentTime);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentTime);
    dayEnd.setHours(23, 59, 59, 999);
    const dayDuration = dayEnd - dayStart;

    const timeSinceStart = currentTime - dayStart;
    return (timeSinceStart / dayDuration) * 100;
  };

  const legalStartPercent = ((legalStart - new Date(legalStart).setHours(0, 0, 0, 0)) / 86400000) * 100;
  const legalEndPercent = ((legalEnd - new Date(legalEnd).setHours(0, 0, 0, 0)) / 86400000) * 100;

  return (
    <div className="mb-6">
      <div className="mb-4">
        <h2 className="text-3xl font-bold mb-1">Legal Shooting Hours</h2>
        <p className="text-muted-foreground">Check the legal shooting hours for your current location</p>
      </div>

      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sun className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-green-900">Legal Shooting Hours</h3>
          </div>
          {isLegalHours && <CheckCircle className="w-6 h-6 text-green-600" />}
        </div>

        <p className="text-sm font-semibold text-slate-600 mb-3">Legal Window</p>

        {/* Timeline */}
        <div className="mb-6">
          <div className="relative h-10 bg-gradient-to-r from-red-200 via-green-400 to-red-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-black"
              style={{ left: `${getTimelinePosition()}%` }}
            />
          </div>
        </div>

        {/* Times */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <div className="flex items-center gap-1 text-slate-600 text-xs mb-1">
              <Sunrise className="w-4 h-4" />
              <span>Legal Start</span>
            </div>
            <p className="font-bold text-slate-900">{formatTime(legalStart)}</p>
            <p className="text-xs text-slate-600">Sunrise {formatSunTime(sunrise)}</p>
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-600 uppercase font-semibold mb-1">Current Time</p>
            <p className="font-bold text-slate-900 text-lg">{currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1 text-slate-600 text-xs mb-1 justify-end">
              <Sunset className="w-4 h-4" />
              <span>Legal End</span>
            </div>
            <p className="font-bold text-slate-900">{formatTime(legalEnd)}</p>
            <p className="text-xs text-slate-600">Sunset {formatSunTime(sunset)}</p>
          </div>
        </div>

        {isLegalHours && (
          <div className="text-sm font-semibold text-green-600 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Shooting permitted for another {timeRemaining}
          </div>
        )}

        <p className="text-xs text-slate-700 mt-4 pt-4 border-t border-green-200">
          Under the Deer Act 1991, deer may be shot from one hour before sunrise to one hour after sunset. Night shooting is prohibited without special licence.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Note:</span> Legal shooting hours vary by location and time of year. Always check local regulations and with the estate manager before shooting.
        </p>
      </div>
    </div>
  );
}