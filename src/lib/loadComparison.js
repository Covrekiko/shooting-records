import { getSdAssessment } from '@/utils/loadDevelopmentStatistics';

const ISSUE_WORDS = ['jam', 'misfeed', 'misfire', 'fail', 'failure', 'pressure', 'stuck', 'split', 'pierced', 'hard bolt', 'eject', 'extract'];

export function average(values) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

export function hasIssueText(text = '') {
  const lower = String(text).toLowerCase();
  if (!lower.trim() || ['none', 'no issues', 'nil', 'n/a'].includes(lower.trim())) return false;
  return ISSUE_WORDS.some((word) => lower.includes(word));
}

export function scoreReliability(notes = [], testedCount = 0) {
  if (!testedCount) return 65;
  const issueCount = notes.filter(hasIssueText).length;
  return clamp(100 - issueCount * 18);
}

export function scoreAccuracy(avgMoa) {
  if (!Number.isFinite(avgMoa)) return 55;
  return clamp(110 - avgMoa * 35);
}

export function scoreConsistency(sd, es) {
  if (Number.isFinite(sd)) return clamp(105 - sd * 2.5);
  if (Number.isFinite(es)) return clamp(105 - es * 0.8);
  return 60;
}

export function scoreCost(cost, minCost, maxCost) {
  if (!Number.isFinite(cost)) return 60;
  if (!Number.isFinite(minCost) || !Number.isFinite(maxCost) || minCost === maxCost) return 85;
  return clamp(100 - ((cost - minCost) / (maxCost - minCost)) * 55);
}

export function formatMoney(value) {
  return Number.isFinite(value) ? `£${value.toFixed(2)}` : 'N/A';
}

export function formatMoa(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)} MOA` : 'No groups';
}

export function buildComparisonRows({ rifles, ammunition, reloadingSessions, targetSessions, targetGroups, tests, variants, results }) {
  const rifleById = Object.fromEntries((rifles || []).map((rifle) => [rifle.id, rifle]));
  const reloadById = Object.fromEntries((reloadingSessions || []).map((session) => [session.id, session]));
  const sessionById = Object.fromEntries((targetSessions || []).map((session) => [session.id, session]));
  const groupsBySession = (targetGroups || []).reduce((map, group) => {
    if (!group.session_id) return map;
    map[group.session_id] = [...(map[group.session_id] || []), group];
    return map;
  }, {});

  const ammoRows = (ammunition || []).flatMap((ammo) => {
    const relatedSessions = (targetSessions || []).filter((session) => session.ammo_id === ammo.id);
    const directGroups = (targetGroups || []).filter((group) => group.ammunition_id === ammo.id);
    const rifleIds = [...new Set([
      ...relatedSessions.map((session) => session.rifle_id),
      ...directGroups.map((group) => group.rifle_id),
      reloadById[ammo.reload_session_id || ammo.source_id]?.firearm_id,
    ].filter(Boolean))];

    const effectiveRifleIds = rifleIds.length ? rifleIds : [''];
    return effectiveRifleIds.map((rifleId) => {
      const sessionIds = relatedSessions.filter((session) => !rifleId || session.rifle_id === rifleId).map((session) => session.id);
      const sessionGroups = sessionIds.flatMap((sessionId) => groupsBySession[sessionId] || []);
      const rifleGroups = directGroups.filter((group) => !rifleId || group.rifle_id === rifleId);
      const allGroups = [...sessionGroups, ...rifleGroups].filter((group, index, arr) => arr.findIndex((match) => match.id === group.id) === index);
      const groupMoas = allGroups.map((group) => group.user_confirmed_group_size_moa || group.group_size_moa || group.ai_group_size_moa);
      const reload = reloadById[ammo.reload_session_id || ammo.source_id];
      const notes = [ammo.notes, ...relatedSessions.map((session) => session.notes), ...allGroups.map((group) => group.notes)].filter(Boolean);
      const cost = Number(reload?.cost_per_round ?? ammo.cost_per_unit);

      return {
        id: `ammo-${ammo.id}-${rifleId || 'general'}`,
        sourceType: ammo.ammo_type === 'reloaded' || ammo.source_type === 'reload_batch' ? 'Reload batch' : 'Factory ammo',
        name: [ammo.brand, ammo.caliber, ammo.bullet_type, ammo.grain && `${ammo.grain}gr`].filter(Boolean).join(' '),
        batch: ammo.lot_number || ammo.batch_number || reload?.batch_number || '',
        rifleId,
        rifleName: rifleById[rifleId]?.name || 'Any rifle',
        caliber: ammo.caliber,
        costPerRound: Number.isFinite(cost) ? cost : null,
        avgMoa: average(groupMoas),
        bestMoa: Math.min(...groupMoas.map(Number).filter(Number.isFinite)),
        testedCount: allGroups.length,
        reliability: scoreReliability(notes, allGroups.length || relatedSessions.length),
        consistency: 60,
        notes,
      };
    });
  });

  const testById = Object.fromEntries((tests || []).map((test) => [test.id, test]));
  const resultsByVariant = (results || []).reduce((map, result) => {
    if (!result.variant_id) return map;
    map[result.variant_id] = [...(map[result.variant_id] || []), result];
    return map;
  }, {});

  const variantRows = (variants || []).map((variant) => {
    const test = testById[variant.test_id] || {};
    const variantResults = resultsByVariant[variant.id] || [];
    const groupMoas = variantResults.map((result) => result.group_size_moa);
    const sdAssessments = variantResults.map((result) => getSdAssessment(result));
    const calculatedSds = sdAssessments.filter((sd) => sd.comparable).map((sd) => sd.value);
    const esValues = variantResults.map((result) => result.es);
    const notes = variantResults.flatMap((result) => [result.pressure_signs_notes, result.feeding_notes, result.recoil_notes, result.final_comments]).filter(Boolean);

    return {
      id: `variant-${variant.id}`,
      sourceType: 'Load test variant',
      name: variant.label,
      batch: [variant.powder_lot_number && `Powder ${variant.powder_lot_number}`, variant.bullet_lot_number && `Bullet ${variant.bullet_lot_number}`].filter(Boolean).join(' · '),
      rifleId: test.rifle_id || '',
      rifleName: test.rifle_name || rifleById[test.rifle_id]?.name || 'Any rifle',
      caliber: test.caliber,
      costPerRound: null,
      avgMoa: average(groupMoas),
      bestMoa: Math.min(...groupMoas.map(Number).filter(Number.isFinite)),
      testedCount: variantResults.filter((result) => result.tested || Number.isFinite(Number(result.group_size_moa))).length,
      reliability: scoreReliability(notes, variantResults.length),
      consistency: scoreConsistency(average(calculatedSds), average(esValues)),
      sdAssessments,
      consistencySdSource: calculatedSds.length ? 'calculated_sample' : 'es_fallback',
      notes,
    };
  });

  const rows = [...ammoRows, ...variantRows].map((row) => ({
    ...row,
    bestMoa: Number.isFinite(row.bestMoa) ? row.bestMoa : null,
  }));

  const costs = rows.map((row) => row.costPerRound).filter(Number.isFinite);
  const minCost = costs.length ? Math.min(...costs) : null;
  const maxCost = costs.length ? Math.max(...costs) : null;

  return rows.map((row) => {
    const accuracyScore = scoreAccuracy(row.avgMoa);
    const costScore = scoreCost(row.costPerRound, minCost, maxCost);
    const overallScore = Math.round((accuracyScore * 0.45) + (row.reliability * 0.25) + (costScore * 0.2) + (row.consistency * 0.1));
    return { ...row, accuracyScore, costScore, overallScore };
  }).sort((a, b) => b.overallScore - a.overallScore);
}