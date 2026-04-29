import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rifleNames = ['BLASER R8 2.0', 'TIKKA TX1 ACE TARGET', 'Brabus'];
    
    // Load all rifles for this user
    const allRifles = await base44.entities.Rifle.filter({ created_by: user.email });
    
    // Find matching rifles by name
    const riflesToReset = allRifles.filter(r => rifleNames.includes(r.name));
    
    if (riflesToReset.length === 0) {
      return Response.json({ error: 'No matching rifles found' }, { status: 404 });
    }

    // Reset counters for each rifle
    const results = [];
    for (const rifle of riflesToReset) {
      await base44.entities.Rifle.update(rifle.id, {
        total_rounds_fired: 0,
        rounds_at_last_cleaning: 0,
      });
      results.push({
        id: rifle.id,
        name: rifle.name,
        resetTo: 0,
      });
    }

    return Response.json({
      success: true,
      message: `Reset ${results.length} rifle(s) to 0 rounds`,
      rifles: results,
    });
  } catch (error) {
    console.error('Error resetting rifle counters:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});