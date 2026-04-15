import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Backend function to restore stock before deleting a session record
 * Handles both Target Shooting and Deer Management stock restoration
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

    console.log(`🟡 [restoreSessionStock] Starting restore for session: ${sessionId}`);

    // Fetch the session record
    const session = await base44.entities.SessionRecord.get(sessionId);
    console.log(`🟡 [restoreSessionStock] Session found:`, {
      id: session.id,
      category: session.category,
      rifles_used: session.rifles_used?.length || 0,
      ammunition_id: session.ammunition_id,
      total_count: session.total_count,
    });

    const restorations = [];

    // Handle Target Shooting (rifles_used array)
    if (session.category === 'target_shooting' && session.rifles_used && Array.isArray(session.rifles_used)) {
      console.log(`🟡 [restoreSessionStock] Processing ${session.rifles_used.length} rifles from Target Shooting`);

      for (const rifle of session.rifles_used) {
        const roundsFired = parseInt(rifle.rounds_fired) || 0;
        console.log(`🟡 [restoreSessionStock] Rifle entry - ammunition_id: ${rifle.ammunition_id}, rounds: ${roundsFired}, brand: ${rifle.ammunition_brand}`);
        
        if (roundsFired > 0) {
          // Case 1: ammunition_id exists (dropdown selection)
          if (rifle.ammunition_id) {
            try {
              console.log(`🟡 [restoreSessionStock] Restoring ammo by ID: ${rifle.ammunition_id} +${roundsFired} rounds`);
              const ammo = await base44.entities.Ammunition.get(rifle.ammunition_id);
              const newQuantity = (ammo.quantity_in_stock || 0) + roundsFired;
              
              await base44.entities.Ammunition.update(rifle.ammunition_id, {
                quantity_in_stock: newQuantity,
              });

              restorations.push({
                ammunition_id: rifle.ammunition_id,
                type: 'target_shooting_rifle',
                quantity_restored: roundsFired,
                new_stock: newQuantity,
              });

              console.log(`🟢 [restoreSessionStock] Ammo ${rifle.ammunition_id} restored. New stock: ${newQuantity}`);
            } catch (error) {
              console.error(`🔴 [restoreSessionStock] Error restoring ammo ${rifle.ammunition_id}:`, error.message);
              throw new Error(`Failed to restore ammunition ${rifle.ammunition_id}: ${error.message}`);
            }
          } else if (rifle.ammunition_brand || rifle.caliber) {
            // Case 2: Manual entry (try to find matching ammo)
            try {
              console.log(`🟡 [restoreSessionStock] Restoring manually-entered ammo: ${rifle.ammunition_brand} ${rifle.caliber} +${roundsFired} rounds`);
              
              // Try to find matching ammunition by brand and caliber
              const allAmmo = await base44.entities.Ammunition.list();
              const matchingAmmo = allAmmo.find(a => 
                a.brand === rifle.ammunition_brand && 
                a.caliber === rifle.caliber &&
                a.bullet_type === rifle.bullet_type
              );
              
              if (matchingAmmo) {
                const newQuantity = (matchingAmmo.quantity_in_stock || 0) + roundsFired;
                await base44.entities.Ammunition.update(matchingAmmo.id, {
                  quantity_in_stock: newQuantity,
                });

                restorations.push({
                  ammunition_id: matchingAmmo.id,
                  type: 'target_shooting_rifle_manual',
                  quantity_restored: roundsFired,
                  new_stock: newQuantity,
                });

                console.log(`🟢 [restoreSessionStock] Manual ammo matched and restored. New stock: ${newQuantity}`);
              } else {
                console.log(`⚠️ [restoreSessionStock] No matching ammunition found for manual entry: ${rifle.ammunition_brand} ${rifle.caliber}`);
              }
            } catch (error) {
              console.error(`🔴 [restoreSessionStock] Error finding/restoring manual ammo:`, error.message);
            }
          }
        }
      }
    }

    // Handle Clay Shooting (single ammunition_used + rounds_fired)
    if (session.category === 'clay_shooting' && session.ammunition_id && session.rounds_fired) {
      const roundsFired = parseInt(session.rounds_fired) || 0;
      if (roundsFired > 0) {
        try {
          console.log(`🟡 [restoreSessionStock] Restoring clay ammo ${session.ammunition_id}: +${roundsFired} rounds`);
          
          const ammo = await base44.entities.Ammunition.get(session.ammunition_id);
          const newQuantity = (ammo.quantity_in_stock || 0) + roundsFired;
          
          await base44.entities.Ammunition.update(session.ammunition_id, {
            quantity_in_stock: newQuantity,
          });

          restorations.push({
            ammunition_id: session.ammunition_id,
            type: 'clay_shooting',
            quantity_restored: roundsFired,
            new_stock: newQuantity,
          });

          console.log(`🟢 [restoreSessionStock] Clay ammo ${session.ammunition_id} restored. New stock: ${newQuantity}`);
        } catch (error) {
          console.error(`🔴 [restoreSessionStock] Error restoring clay ammo ${session.ammunition_id}:`, error.message);
          throw new Error(`Failed to restore ammunition: ${error.message}`);
        }
      }
    }

    // Handle Deer Management (ammunition_id + total_count)
    if (session.category === 'deer_management' && session.ammunition_id && session.total_count) {
      const shotsFired = parseInt(session.total_count) || 0;
      if (shotsFired > 0) {
        try {
          console.log(`🟡 [restoreSessionStock] Restoring deer ammo ${session.ammunition_id}: +${shotsFired} rounds`);
          
          const ammo = await base44.entities.Ammunition.get(session.ammunition_id);
          const newQuantity = (ammo.quantity_in_stock || 0) + shotsFired;
          
          await base44.entities.Ammunition.update(session.ammunition_id, {
            quantity_in_stock: newQuantity,
          });

          restorations.push({
            ammunition_id: session.ammunition_id,
            type: 'deer_management',
            quantity_restored: shotsFired,
            new_stock: newQuantity,
          });

          console.log(`🟢 [restoreSessionStock] Deer ammo ${session.ammunition_id} restored. New stock: ${newQuantity}`);
        } catch (error) {
          console.error(`🔴 [restoreSessionStock] Error restoring deer ammo ${session.ammunition_id}:`, error.message);
          throw new Error(`Failed to restore ammunition: ${error.message}`);
        }
      }
    }

    console.log(`🟢 [restoreSessionStock] Successfully restored ${restorations.length} ammunition items`);

    return Response.json({
      success: true,
      sessionId,
      restorations,
    });
  } catch (error) {
    console.error('🔴 [restoreSessionStock] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});