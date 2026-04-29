export function resolveClayClubName(record, clubs = {}, locations = {}) {
  return record?.club_name ||
    record?.range_name ||
    record?.location_name ||
    record?.place_name ||
    record?.venue_name ||
    (record?.club_id && clubs[record.club_id]?.name) ||
    (record?.location_id && clubs[record.location_id]?.name) ||
    (record?.location_id && locations[record.location_id]?.name) ||
    'Not recorded';
}

export function getClayScoreSummary(scorecard, stands = []) {
  if (!scorecard && (!stands || stands.length === 0)) return null;

  const totalHits = Number(scorecard?.total_hits ?? stands.reduce((sum, stand) => sum + Number(stand.hits || 0), 0));
  const totalMisses = Number(scorecard?.total_misses ?? stands.reduce((sum, stand) => sum + Number(stand.misses || 0), 0));
  const totalTargets = Number(scorecard?.total_valid_scored_clays ?? stands.reduce((sum, stand) => sum + Number(stand.valid_scored_clays || (Number(stand.hits || 0) + Number(stand.misses || 0))), 0));
  const totalNoBirds = Number(scorecard?.total_no_birds ?? stands.reduce((sum, stand) => sum + Number(stand.no_birds || 0), 0));
  const percentage = totalTargets > 0 ? Math.round((totalHits / totalTargets) * 100) : Number(scorecard?.hit_percentage || 0);

  if (totalTargets === 0 && totalHits === 0 && totalMisses === 0 && totalNoBirds === 0) return null;

  return {
    totalHits,
    totalMisses,
    totalTargets,
    totalNoBirds,
    percentage,
    label: `${totalHits} / ${totalTargets}`,
  };
}

export function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  if ([startHour, startMinute, endHour, endMinute].some(Number.isNaN)) return null;

  let minutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  if (minutes < 0) minutes += 24 * 60;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

export function normalizePhotos(photos = []) {
  return photos
    .map((photo) => typeof photo === 'string' ? photo : photo?.url)
    .filter(Boolean);
}