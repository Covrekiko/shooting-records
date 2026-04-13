import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { equipmentId, equipmentType } = await req.json();

    if (!equipmentId || !equipmentType) {
      return Response.json({ error: 'Missing equipmentId or equipmentType' }, { status: 400 });
    }

    // Check if equipment is used in recent records (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let query = { created_by: user.email, date: { $gte: ninetyDaysAgo } };
    let usageFound = false;
    let usageCount = 0;

    if (equipmentType === 'rifle') {
      const targetRecords = await base44.entities.TargetShooting.filter(query);
      const deerRecords = await base44.entities.DeerManagement.filter(query);

      usageFound = targetRecords.some(r => r.rifles_used?.some(ru => ru.rifle_id === equipmentId)) ||
                   deerRecords.some(r => r.rifle_id === equipmentId);
      
      usageCount = (targetRecords.filter(r => r.rifles_used?.some(ru => ru.rifle_id === equipmentId)).length || 0) +
                   (deerRecords.filter(r => r.rifle_id === equipmentId).length || 0);
    } else if (equipmentType === 'shotgun') {
      const clayRecords = await base44.entities.ClayShooting.filter(query);
      usageFound = clayRecords.some(r => r.shotgun_id === equipmentId);
      usageCount = clayRecords.filter(r => r.shotgun_id === equipmentId).length || 0;
    }

    return Response.json({
      canDelete: !usageFound,
      usageFound,
      usageCount,
      message: usageFound 
        ? `This ${equipmentType} has been used in ${usageCount} record(s) in the last 90 days and cannot be deleted.`
        : `This ${equipmentType} is safe to delete.`,
    });
  } catch (error) {
    console.error('Error validating equipment deletion:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});