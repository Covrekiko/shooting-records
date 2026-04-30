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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.id || !user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deletedRecords = await deleteOwnedRecords(base44, user.email);

    await base44.asServiceRole.entities.User.delete(user.id);

    return Response.json({
      success: true,
      message: 'Account and user-owned app data deleted.',
      deletedRecords,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});