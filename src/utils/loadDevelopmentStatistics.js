// Shared Load Development chronograph statistics utility (V2).
// Single authoritative calculation path for the result form, displays, and PDF.
// SD convention: SAMPLE standard deviation (N-1) is displayed/saved for newly
// calculated values. See LOAD_DEVELOPMENT_STATISTICS.md.

export const isValidVelocity = (v) =>
  typeof v === 'number' && isFinite(v) && v > 0;

// Normalize raw velocity_readings entries (objects or plain numbers) into
// [{ shot_number, velocity, included }], dropping invalid velocities.
export function normalizeVelocityReadings(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, i) => {
      if (typeof entry === 'number') {
        return { shot_number: i + 1, velocity: entry, included: true };
      }
      const velocity = parseFloat(entry?.velocity);
      return {
        shot_number: parseInt(entry?.shot_number, 10) || i + 1,
        velocity: isNaN(velocity) ? null : velocity,
        included: entry?.included !== false,
      };
    })
    .filter(r => isValidVelocity(r.velocity));
}

// Compatibility adapter: prefer velocity_readings, otherwise reconstruct
// readings from legacy velocity_1...velocity_5 fields.
export function getVelocityReadings(result) {
  if (!result) return [];
  if (Array.isArray(result.velocity_readings) && result.velocity_readings.length > 0) {
    return normalizeVelocityReadings(result.velocity_readings);
  }
  return [result.velocity_1, result.velocity_2, result.velocity_3, result.velocity_4, result.velocity_5]
    .map((v, i) => ({
      shot_number: i + 1,
      velocity: typeof v === 'number' ? v : parseFloat(v),
      included: true,
    }))
    .filter(r => isValidVelocity(r.velocity));
}

export function calculateMean(values) {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function calculateExtremeSpread(values) {
  if (!values.length) return null;
  return Math.max(...values) - Math.min(...values);
}

export function calculatePopulationSD(values) {
  if (!values.length) return null;
  const mean = calculateMean(values);
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function calculateSampleSD(values) {
  if (values.length < 2) return null;
  const mean = calculateMean(values);
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// Summary from readings: only valid, included readings contribute to statistics.
export function summarizeReadings(readings) {
  const normalized = normalizeVelocityReadings(readings);
  const included = normalized.filter(r => r.included).map(r => r.velocity);
  const sd = calculateSampleSD(included);
  return {
    recordedCount: normalized.length,
    includedCount: included.length,
    avg: included.length ? Math.round(calculateMean(included)) : null,
    es: included.length ? Math.round(calculateExtremeSpread(included)) : null,
    sd: sd !== null ? Math.round(sd * 10) / 10 : null,
  };
}

// Parse pasted velocity text: newline, comma, semicolon, or whitespace separated.
// Returns { values: number[], invalid: string[] }. Nothing is written by parsing.
export function parsePastedVelocities(text) {
  const tokens = String(text || '')
    .split(/[\s,;]+/)
    .map(t => t.trim())
    .filter(Boolean);
  const values = [];
  const invalid = [];
  for (const token of tokens) {
    const n = parseFloat(token);
    if (!isNaN(n) && isFinite(n) && n > 0 && /^[\d.]+$/.test(token)) {
      values.push(n);
    } else {
      invalid.push(token);
    }
  }
  return { values, invalid };
}