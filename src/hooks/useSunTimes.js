import { useState, useEffect } from 'react';
import { useGeolocation } from './useGeolocation';

export function useSunTimes() {
  const { location } = useGeolocation();
  const [sunTimes, setSunTimes] = useState(null);

  useEffect(() => {
    if (!location) return;

    const now = new Date();
    const times = calculateSunTimes(
      location.latitude,
      location.longitude,
      now
    );
    setSunTimes(times);
  }, [location]);

  return sunTimes;
}

function calculateSunTimes(lat, lon, date) {
  const J2000 = 2451545.0;
  const jd =
    date.getUTCDate() -
    32075 +
    1461 * ((date.getUTCFullYear() + 4800 + Math.floor((date.getUTCMonth() - 14) / 12)) / 4) -
    Math.floor((((date.getUTCFullYear() + 4900 + Math.floor((date.getUTCMonth() - 14) / 12)) / 100) * 3) / 4) +
    date.getUTCHours() / 24.0 +
    date.getUTCMinutes() / 1440.0;

  const n = jd - J2000 - 0.0009;
  const J = n + lon / 360.0;
  const M = (357.5291 + 0.98560028 * J) % 360;
  const C = (1.9146 - 0.004817 * Math.cos((M * Math.PI) / 180) - 0.000014 * Math.cos((2 * M * Math.PI) / 180)) * Math.sin((M * Math.PI) / 180);
  const L = (280.4665 + 0.98564734 * J + C) % 360;
  const e = 23.439291 - 0.0000004 * J;

  const sinDec = Math.sin((e * Math.PI) / 180) * Math.sin((L * Math.PI) / 180);
  const cosDec = Math.sqrt(1 - sinDec * sinDec);

  const cosH = (-Math.sin((50.17 * Math.PI) / 180) - Math.sin((lat * Math.PI) / 180) * sinDec) / (Math.cos((lat * Math.PI) / 180) * cosDec);

  if (cosH > 1) {
    return { sunrise: null, sunset: null, type: 'polar_night' };
  } else if (cosH < -1) {
    return { sunrise: null, sunset: null, type: 'polar_day' };
  }

  const H = Math.acos(cosH) * (180 / Math.PI);
  const Jrise = J - H / 360.0;
  const Jset = J + H / 360.0;

  const sunrise = new Date(toGregorianDate(Jrise + 0.0009));
  const sunset = new Date(toGregorianDate(Jset + 0.0009));

  return { sunrise, sunset, type: 'normal' };
}

function toGregorianDate(jd) {
  const a = Math.floor(jd + 0.5);
  const b = a < 2299161 ? 0 : Math.floor((a - 1867216.25) / 36524.25);
  const c = a + (a < 2299161 ? 1524 : 1525 + b);
  const d = Math.floor((c - 122.1) / 365.25);
  const e = Math.floor(365.25 * d);
  const f = Math.floor((c - e) / 30.6001);

  const day = c - e - Math.floor(30.6001 * f);
  const month = f < 14 ? f - 1 : f - 13;
  const year = month > 2 ? d - 4716 : d - 4715;
  const fraction = jd + 0.5 - Math.floor(jd + 0.5);

  const hours = Math.floor(fraction * 24);
  const minutes = Math.floor((fraction * 24 - hours) * 60);

  return new Date(year, month - 1, day, hours, minutes);
}