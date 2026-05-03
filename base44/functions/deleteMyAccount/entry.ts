import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const USER_OWNED_ENTITIES = [
  'SessionRecord',
  'TargetShooting',
  'ClayShooting',
  'DeerManagement',
  'DeerOuting',
  'Rifle',
  'Shotgun',
  'Club',
  'Area',
  'DeerLocation',
  'Ammunition',
  'AmmoSpending',
  'CleaningHistory',
  'Goal',
  'MapMarker',
  'Harvest',
  'ReloadingSession',
  'ReloadingComponent',
  'ReloadingInventory',
  'ReloadingStock',
  'ReloadingTest',
  'ReloadingTestVariant',
  'ReloadingTestResult',
  'ScopeProfile',
  'ScopeDistanceData',
  'TargetSession',
  'TargetGroup',
  'TargetPhoto',
  'ClayScorecard',
  'ClayStand',
  'ClayShot',
  'BallisticProfile',
  'BetaFeedbackPost',
  'BetaFeedbackComment'
];

async function deleteOwnedRecords(base44, userEmail) {
  const summary = [];

  for (const entityName of USER_OWNED_ENTITIES) {
    const sdk = base44.asServiceRole.entities[entityName];
    if (!sdk?.filter || !sdk?.delete) continue;

    try {
      const records = await sdk.filter({ created_by: userEmail });
      for (const record of records || []) {
        if (record?.id) await sdk.delete(record.id);
      }
      summary.push({ entityName, deleted: records?.length || 0 });
    } catch (error) {
      summary.push({ entityName, deleted: 0, error: error.message });
    }
  }

  return summary;
}

async function cleanupSharedAreaData(base44, userEmail) {
  const summary = [];
  const deletedUserLabel = 'Deleted user';
  const deletedUserEmail = 'deleted-user';

  try {
    const areaShares = base44.asServiceRole.entities.AreaShare;
    if (areaShares?.filter && areaShares?.delete && areaShares?.update) {
      const ownedShares = await areaShares.filter({ owner_email: userEmail });
      for (const share of ownedShares || []) {
        if (share?.id) await areaShares.delete(share.id);
      }

      const acceptedShares = await areaShares.filter({ accepted_by_email: userEmail });
      for (const share of acceptedShares || []) {
        if (share?.id) {
          await areaShares.update(share.id, {
            accepted_by_email: deletedUserEmail,
            invitee_name: deletedUserLabel,
          });
        }
      }

      summary.push({ entityName: 'AreaShare', deleted: ownedShares?.length || 0, anonymized: acceptedShares?.length || 0 });
    }
  } catch (error) {
    summary.push({ entityName: 'AreaShare', deleted: 0, anonymized: 0, error: error.message });
  }

  try {
    const clientLogs = base44.asServiceRole.entities.SharedClientOutingLog;
    if (clientLogs?.filter && clientLogs?.delete && clientLogs?.update) {
      const ownerLogs = await clientLogs.filter({ owner_email: userEmail });
      for (const log of ownerLogs || []) {
        if (log?.id) await clientLogs.delete(log.id);
      }

      const clientOwnedLogs = await clientLogs.filter({ client_email: userEmail });
      for (const log of clientOwnedLogs || []) {
        if (log?.id) {
          await clientLogs.update(log.id, {
            client_email: deletedUserEmail,
            client_name: deletedUserLabel,
            gps_start: null,
            gps_end: null,
            gps_track: [],
            live_current_location: null,
            checkout_data: null,
            notes: '',
            photos: [],
            live_tracking_enabled: false,
          });
        }
      }

      summary.push({ entityName: 'SharedClientOutingLog', deleted: ownerLogs?.length || 0, anonymized: clientOwnedLogs?.length || 0 });
    }
  } catch (error) {
    summary.push({ entityName: 'SharedClientOutingLog', deleted: 0, anonymized: 0, error: error.message });
  }

  return summary;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.id || !user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deletedRecords = await deleteOwnedRecords(base44, user.email);
    const sharedAreaData = await cleanupSharedAreaData(base44, user.email);

    await base44.asServiceRole.entities.User.delete(user.id);

    return Response.json({
      success: true,
      message: 'Account and user-owned app data deleted.',
      deletedRecords,
      sharedAreaData,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});