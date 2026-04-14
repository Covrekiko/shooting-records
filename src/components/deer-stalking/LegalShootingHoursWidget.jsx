import { useState, useEffect } from 'react';
import { Sun, MapPin, AlertCircle, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function LegalShootingHoursWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState(null);

  useEffect(() => {
    const initializeLocation = async () => {
      setLoading(true);
      let lat = 51.4081; // Bromley default
      let lng = -0.0123;
      let location = 'Bromley, England';
      let outsideEngland = false;

      // Try to get live GPS location
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;

          // Check if outside England and reverse geocode
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: `You are a UK location expert. Given GPS coordinates ${lat}, ${lng}, determine:
1. The nearest town or city
2. Whether this is in England, Wales, Scotland, or Northern Ireland
3. The correct timezone (GMT or BST)

Return ONLY valid JSON: {"town": "name", "country": "England|Wales|Scotland|NI", "timezone": "GMT|BST"}`,
            response_json_schema: {
              type: 'object',
              properties: {
                town: { type: 'string' },
                country: { type: 'string' },
                timezone: { type: 'string' }
              }
            }
          });

          location = `${result.town}, ${result.country}`;
          outsideEngland = result.country !== 'England';
          if (outsideEngland) {
            setWarning('Outside England: Deer hunting laws differ. Verify local regulations before hunting.');
          }
        } catch (err) {
          console.log('Using default Bromley location');
        }
      }

      // Calculate sunrise/sunset
      calculateDeerShootingTimes(lat, lng, location, outsideEngland);
    };

    initializeLocation();
  }, []);

  const calculateDeerShootingTimes = (lat, lng, location, outsideEngland) => {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const J_century = (today.getFullYear() + dayOfYear / 365.25 - 2000) / 100;

    // Mean anomaly
    const M = (357.52911 + 35999.05029 * J_century - 0.0001536 * J_century * J_century) % 360;
    const M_rad = M * Math.PI / 180;

    // Equation of center
    const C = (1.914602 - 0.004817 * J_century - 0.000014 * J_century * J_century) * Math.sin(M_rad) 
      + (0.019993 - 0.000101 * J_century) * Math.sin(2 * M_rad) 
      + 0.000029 * Math.sin(3 * M_rad);

    // Sun's true longitude
    const sun_lon = (280.46646 + 36000.76983 * J_century + 0.0003032 * J_century * J_century + C) % 360;

    // Apparent longitude
    const omega = 125.04 - 1934.136 * J_century;
    const lambda = sun_lon - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180);

    // Declination
    const eps = (23.439291 - 0.0130042 * J_century - 0.00000016 * J_century * J_century + 0.000000504 * J_century * J_century * J_century) * Math.PI / 180;
    const sin_dec = Math.sin(eps) * Math.sin(lambda * Math.PI / 180);
    const dec = Math.asin(sin_dec) * 180 / Math.PI;

    // Hour angle
    const lat_rad = lat * Math.PI / 180;
    const dec_rad = dec * Math.PI / 180;
    const h = -0.833;
    const cosH = (Math.sin(h * Math.PI / 180) - Math.sin(lat_rad) * Math.sin(dec_rad)) / (Math.cos(lat_rad) * Math.cos(dec_rad));

    let H = 0;
    if (cosH < -1) H = 180;
    else if (cosH > 1) H = 0;
    else H = Math.acos(cosH) * 180 / Math.PI;

    // Equation of time
    const y = Math.tan(eps / 2);
    const y_sq = y * y;
    const eot = 229.18 * (y_sq * Math.sin(2 * M_rad) - 2 * 0.0167 * Math.sin(M_rad) + 4 * y_sq * Math.cos(2 * M_rad) - 2.5 * y_sq);

    // UTC times
    const sunrise_utc = 12 + lng / 15 - (H + lng) / 15 - eot / 60;
    const sunset_utc = 12 + lng / 15 + (H - lng) / 15 - eot / 60;

    // Determine if BST or GMT
    const isBST = today.getMonth() > 2 && (today.getMonth() < 9 || (today.getMonth() === 2 && today.getDate() >= 31 - ((5 * today.getFullYear()) / 4 + 4) % 7));
    const offset = isBST ? 1 : 0;

    const sunrise_local = (sunrise_utc + offset + 24) % 24;
    const sunset_local = (sunset_utc + offset + 24) % 24;

    const sunrise = new Date(today);
    sunrise.setHours(Math.floor(sunrise_local), Math.round((sunrise_local % 1) * 60), 0, 0);

    const sunset = new Date(today);
    sunset.setHours(Math.floor(sunset_local), Math.round((sunset_local % 1) * 60), 0, 0);

    // Legal shooting times (1 hour before/after)
    const legalStart = new Date(sunrise);
    legalStart.setHours(legalStart.getHours() - 1);

    const legalEnd = new Date(sunset);
    legalEnd.setHours(legalEnd.getHours() + 1);

    // Calculate total legal hours
    const diffMs = legalEnd - legalStart;
    const totalHours = Math.floor(diffMs / 3600000);
    const totalMinutes = Math.round((diffMs % 3600000) / 60000);

    setData({
      date: today.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }),
      location,
      sunrise: sunrise.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
      sunset: sunset.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
      legalStart: legalStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
      legalEnd: legalEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }),
      totalTime: `${totalHours} hours ${totalMinutes} minutes`,
      timezone: isBST ? 'BST' : 'GMT'
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-card/95 backdrop-blur-sm rounded-2xl px-3 py-2 border border-border shadow-lg">
        <div className="animate-pulse h-4 bg-muted rounded w-20"></div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="bg-card/95 backdrop-blur-sm rounded-2xl border border-border shadow-lg p-3 max-w-sm">
      {/* Header */}
      <div className="mb-3 border-b border-border pb-2">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1">
          <Sun className="w-4 h-4 text-amber-500" /> Legal Deer Shooting Hours
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{data.date}</p>
      </div>

      {/* Location & Timezone */}
      <div className="mb-3 space-y-1">
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 text-primary" />
          <span className="text-xs text-muted-foreground">Location:</span>
          <span className="text-xs font-semibold text-foreground">{data.location}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-primary" />
          <span className="text-xs text-muted-foreground">Timezone:</span>
          <span className="text-xs font-semibold text-foreground">{data.timezone}</span>
        </div>
      </div>

      {/* Sunrise/Sunset */}
      <div className="mb-3 space-y-1 pb-3 border-b border-border">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sun className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-muted-foreground">Sunrise:</span>
          </div>
          <span className="text-xs font-semibold text-foreground">{data.sunrise}</span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sun className="w-3 h-3 text-amber-600 opacity-70" />
            <span className="text-xs text-muted-foreground">Sunset:</span>
          </div>
          <span className="text-xs font-semibold text-foreground">{data.sunset}</span>
        </div>
      </div>

      {/* Legal Shooting Times */}
      <div className="mb-3 space-y-1 pb-3 border-b border-border bg-primary/5 rounded-lg p-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-primary">Legal start:</span>
          <span className="text-xs font-bold text-primary">{data.legalStart}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-primary">Legal end:</span>
          <span className="text-xs font-bold text-primary">{data.legalEnd}</span>
        </div>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-primary/20">
          <span className="text-xs font-bold text-foreground">Total legal time:</span>
          <span className="text-xs font-bold text-foreground">{data.totalTime}</span>
        </div>
      </div>

      {/* Warning if outside England */}
      {warning && (
        <div className="mb-3 flex gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">{warning}</p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2 leading-tight">
        <p className="font-semibold mb-1">Legal disclaimer:</p>
        <p>This calculation is based on the general legal daytime deer shooting rule in England: from 1 hour before sunrise until 1 hour after sunset. Deer seasons, calibre rules, land permission, licence conditions, and local restrictions must still be checked separately.</p>
      </div>
    </div>
  );
}