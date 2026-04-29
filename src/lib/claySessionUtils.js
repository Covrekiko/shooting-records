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
  const data = buildClayScoreCardData(null, scorecard, stands);
  if (!data) return null;

  return {
    totalHits: data.hits,
    totalMisses: data.missed,
    totalTargets: data.totalTargets,
    totalNoBirds: data.noBirds,
    percentage: data.percentage,
    label: `${data.hits} / ${data.totalTargets}`,
  };
}

export function buildClayScoreCardData(record = {}, scorecard = null, stands = [], shotsByStand = {}) {
  const normalizedStands = (stands || [])
    .map((stand, index) => {
      const shots = shotsByStand[stand.id] || stand.shots || [];
      const targetResults = shots
        .sort((a, b) => (a.shot_number || 0) - (b.shot_number || 0))
        .map((shot) => {
          if (shot.result === 'hit' || shot.result === 'dead') return 'H';
          if (shot.result === 'no_bird') return 'NB';
          return 'M';
        });

      const hits = Number(stand.hits ?? targetResults.filter(result => result === 'H').length ?? 0);
      const missed = Number(stand.misses ?? targetResults.filter(result => result === 'M').length ?? 0);
      const noBirds = Number(stand.no_birds ?? targetResults.filter(result => result === 'NB').length ?? 0);
      const targets = Number(stand.valid_scored_clays ?? stand.clays_total ?? (hits + missed) ?? 0);
      const percentage = targets > 0 ? Math.round((hits / targets) * 100) : Number(stand.hit_percentage || 0);

      return {
        standNumber: stand.stand_number || index + 1,
        discipline: stand.discipline_type || stand.discipline || stand.round_type || 'Sporting',
        hits,
        targets,
        missed,
        noBirds,
        percentage,
        targetResults,
      };
    })
    .filter((stand) => stand.targets > 0 || stand.hits > 0 || stand.missed > 0 || stand.targetResults.length > 0);

  const totalTargets = Number(scorecard?.total_valid_scored_clays ?? scorecard?.total_clays ?? normalizedStands.reduce((sum, stand) => sum + stand.targets, 0) ?? record?.total_targets ?? 0);
  const hits = Number(scorecard?.total_hits ?? normalizedStands.reduce((sum, stand) => sum + stand.hits, 0) ?? record?.hits ?? 0);
  const missed = Number(scorecard?.total_misses ?? normalizedStands.reduce((sum, stand) => sum + stand.missed, 0) ?? record?.missed ?? record?.misses ?? 0);
  const noBirds = Number(scorecard?.total_no_birds ?? normalizedStands.reduce((sum, stand) => sum + stand.noBirds, 0) ?? 0);
  const percentage = totalTargets > 0 ? Math.round((hits / totalTargets) * 100) : Number(scorecard?.hit_percentage || record?.percentage || 0);

  if (totalTargets === 0 && hits === 0 && missed === 0 && noBirds === 0 && normalizedStands.length === 0) return null;

  return {
    totalTargets,
    hits,
    missed,
    noBirds,
    percentage,
    roundType: normalizedStands[0]?.discipline || scorecard?.round_type || record?.round_type || 'Clay Shooting',
    stands: normalizedStands,
    hasTargetGrid: normalizedStands.some((stand) => stand.targetResults.length > 0),
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