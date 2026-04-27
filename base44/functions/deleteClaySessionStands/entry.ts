import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Backend function to delete all ClayStand and ClayShot records when a clay session is deleted.
 * Ensures cascading deletion of orphaned records.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      return Response.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    console.log(`🟡 [deleteClaySessionStands] Deleting stands/shots for session: ${sessionId}`);

    // Find all scorecards linked to this session
    const scorecards = await base44.entities.ClayScorecard.filter({ 
      clay_session_id: sessionId,
      created_by: user.email 
    });

    let deletedStands = 0;
    let deletedShots = 0;

    for (const scorecard of scorecards) {
      // Find all stands linked to this scorecard
      const stands = await base44.entities.ClayStand.filter({ 
        clay_scorecard_id: scorecard.id,
        created_by: user.email 
      });

      for (const stand of stands) {
        // Delete all shots linked to this stand
        const shots = await base44.entities.ClayShot.filter({ 
          clay_stand_id: stand.id,
          created_by: user.email 
        });

        for (const shot of shots) {
          try {
            await base44.entities.ClayShot.delete(shot.id);
            deletedShots++;
          } catch (e) {
            console.warn(`⚠️ Failed to delete shot ${shot.id}:`, e.message);
          }
        }

        // Delete the stand
        try {
          await base44.entities.ClayStand.delete(stand.id);
          deletedStands++;
        } catch (e) {
          console.warn(`⚠️ Failed to delete stand ${stand.id}:`, e.message);
        }
      }

      // Delete the scorecard
      try {
        await base44.entities.ClayScorecard.delete(scorecard.id);
        console.log(`🟢 Scorecard ${scorecard.id} deleted`);
      } catch (e) {
        console.warn(`⚠️ Failed to delete scorecard ${scorecard.id}:`, e.message);
      }
    }

    console.log(`🟢 [deleteClaySessionStands] Done. Deleted ${deletedStands} stands, ${deletedShots} shots.`);
    return Response.json({ success: true, sessionId, deletedStands, deletedShots });

  } catch (error) {
    console.error('🔴 [deleteClaySessionStands] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});