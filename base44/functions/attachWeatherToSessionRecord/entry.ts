import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function getRecordLocation(record) {
  const gpsTrack = Array.isArray(record?.gps_track) ? record.gps_track : [];
  const point = gpsTrack.find((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
  if (!point) return null;
  return { latitude: Number(point.lat), longitude: Number(point.lng) };
}

function nearestVisibility(hourly, currentTime) {
  const times = hourly?.time || [];
  const values = hourly?.visibility || [];
  if (!times.length || !values.length) return null;

  const target = new Date(currentTime || Date.now()).getTime();
  let bestIndex = 0;
  let bestDelta = Infinity;

  times.forEach((time, index) => {
    const delta = Math.abs(new Date(time).getTime() - target);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = index;
    }
  });

  const value = Number(values[bestIndex]);
  return Number.isFinite(value) ? value : null;
}

async function fetchWeather(latitude, longitude) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'temperature_2m,wind_speed_10m,wind_direction_10m,weather_code');
  url.searchParams.set('hourly', 'visibility');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '1');

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Weather fetch failed with status ${response.status}`);

  const data = await response.json();
  return {
    temperature_c: Number(data.current?.temperature_2m),
    wind_speed_kmh: Number(data.current?.wind_speed_10m),
    wind_direction_degrees: Number(data.current?.wind_direction_10m),
    visibility_m: nearestVisibility(data.hourly, data.current?.time),
    weather_code: Number(data.current?.weather_code),
    latitude,
    longitude,
    source: 'Open-Meteo',
    captured_at: new Date().toISOString(),
    status: 'captured',
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const event = payload.event || {};
    const record = payload.data || null;

    if (event.type !== 'create' || event.entity_name !== 'SessionRecord' || !event.entity_id) {
      return Response.json({ skipped: true, reason: 'Not a SessionRecord create event' });
    }

    if (record?.weather_metadata?.status === 'captured') {
      return Response.json({ skipped: true, reason: 'Weather already captured' });
    }

    const location = getRecordLocation(record);
    if (!location) {
      await base44.asServiceRole.entities.SessionRecord.update(event.entity_id, {
        weather_metadata: {
          status: 'location_unavailable',
          source: 'Open-Meteo',
          captured_at: new Date().toISOString(),
          error: 'No GPS location was available on this record',
        },
      });
      return Response.json({ success: true, status: 'location_unavailable' });
    }

    const weather = await fetchWeather(location.latitude, location.longitude);
    await base44.asServiceRole.entities.SessionRecord.update(event.entity_id, { weather_metadata: weather });

    return Response.json({ success: true, weather });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});