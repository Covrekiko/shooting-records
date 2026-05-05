import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function uniqueByKey(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getRifleUses(record) {
  const uses = [];
  if (Array.isArray(record.rifles_used)) {
    for (const item of record.rifles_used) {
      if (item?.rifle_id) uses.push({ id: item.rifle_id, rounds: Number(item.rounds_fired || 0) });
    }
  }
  if (record.rifle_id) {
    uses.push({ id: record.rifle_id, rounds: Number(record.rounds_fired || 0) });
  }
  return uniqueByKey(uses, (item) => item.id);
}

function getShotgunUses(record) {
  if (!record.shotgun_id) return [];
  return [{ id: record.shotgun_id, rounds: Number(record.rounds_fired || 0) }];
}

function buildAlert({ firearm, firearmType, sinceCleaning, totalCount, threshold, sessionRecordId }) {
  const unit = firearmType === 'rifle' ? 'rounds' : 'cartridges';
  const alertType = sinceCleaning >= threshold * 2 ? 'deep_cleaning_due' : 'maintenance_due';
  const recommendation = alertType === 'deep_cleaning_due' ? 'a deep cleaning' : 'maintenance';

  return {
    firearm_id: firearm.id,
    firearm_type: firearmType,
    firearm_name: firearm.name || 'Unnamed firearm',
    alert_type: alertType,
    threshold_count: threshold,
    current_since_cleaning: sinceCleaning,
    trigger_total_count: totalCount,
    session_record_id: sessionRecordId,
    message: `${firearm.name || 'This firearm'} has fired ${sinceCleaning} ${unit} since its last cleaning. Consider ${recommendation}.`,
    status: 'active',
    notified_email: false,
    notified_at: new Date().toISOString(),
  };
}

async function maybeCreateAlert(base44, ownerEmail, alert) {
  const existing = await base44.asServiceRole.entities.MaintenanceAlert.filter({
    created_by: ownerEmail,
    firearm_id: alert.firearm_id,
    firearm_type: alert.firearm_type,
    trigger_total_count: alert.trigger_total_count,
    alert_type: alert.alert_type,
  });

  if (existing.length > 0) return null;

  const created = await base44.asServiceRole.entities.MaintenanceAlert.create(alert);

  let emailed = false;
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: ownerEmail,
      subject: alert.alert_type === 'deep_cleaning_due' ? 'Deep cleaning recommended' : 'Firearm maintenance due',
      body: `${alert.message}\n\nOpen your Armory page to record the cleaning once complete.`,
    });
    emailed = true;
    await base44.asServiceRole.entities.MaintenanceAlert.update(created.id, { notified_email: true });
  } catch (error) {
    console.warn('[createMaintenanceAlertsFromSession] Email notification failed:', error.message);
  }

  return { ...created, notified_email: emailed };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const event = payload.event || {};

    if (!['create', 'update'].includes(event.type)) {
      return Response.json({ success: true, created_count: 0, reason: 'Ignored event type' });
    }

    let record = payload.data;
    if (!record && payload.payload_too_large && event.entity_id) {
      record = await base44.asServiceRole.entities.SessionRecord.get(event.entity_id);
    }

    if (!record?.created_by) {
      return Response.json({ success: true, created_count: 0, reason: 'No session owner found' });
    }

    const ownerEmail = record.created_by;
    const createdAlerts = [];

    for (const use of getRifleUses(record)) {
      if (!use.rounds) continue;
      const rifle = await base44.asServiceRole.entities.Rifle.get(use.id);
      if (!rifle || rifle.created_by !== ownerEmail || !rifle.cleaning_reminder_threshold) continue;

      const totalCount = Number(rifle.total_rounds_fired || 0);
      const sinceCleaning = Math.max(0, totalCount - Number(rifle.rounds_at_last_cleaning || 0));
      const threshold = Number(rifle.cleaning_reminder_threshold || 0);
      if (threshold > 0 && sinceCleaning >= threshold) {
        const alert = buildAlert({ firearm: rifle, firearmType: 'rifle', sinceCleaning, totalCount, threshold, sessionRecordId: record.id });
        const created = await maybeCreateAlert(base44, ownerEmail, alert);
        if (created) createdAlerts.push(created);
      }
    }

    for (const use of getShotgunUses(record)) {
      if (!use.rounds) continue;
      const shotgun = await base44.asServiceRole.entities.Shotgun.get(use.id);
      if (!shotgun || shotgun.created_by !== ownerEmail || !shotgun.cleaning_reminder_threshold) continue;

      const totalCount = Number(shotgun.total_cartridges_fired || 0);
      const sinceCleaning = Math.max(0, totalCount - Number(shotgun.cartridges_at_last_cleaning || 0));
      const threshold = Number(shotgun.cleaning_reminder_threshold || 0);
      if (threshold > 0 && sinceCleaning >= threshold) {
        const alert = buildAlert({ firearm: shotgun, firearmType: 'shotgun', sinceCleaning, totalCount, threshold, sessionRecordId: record.id });
        const created = await maybeCreateAlert(base44, ownerEmail, alert);
        if (created) createdAlerts.push(created);
      }
    }

    return Response.json({ success: true, created_count: createdAlerts.length, alerts: createdAlerts });
  } catch (error) {
    console.error('[createMaintenanceAlertsFromSession] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});