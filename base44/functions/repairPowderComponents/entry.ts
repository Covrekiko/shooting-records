import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all powder components for this user
    const components = await base44.entities.ReloadingComponent.filter({
      created_by: user.email,
      component_type: 'powder',
    });

    const unitConversions = {
      'grams': 1,
      'kg': 1000,
      'oz': 28.3495,
      'lb': 453.592,
      'grains': 0.06479891,
    };

    const repaired = [];

    for (const comp of components) {
      // Only repair if not already in grams
      if (comp.unit !== 'grams') {
        const conversionFactor = unitConversions[comp.unit] || 1;
        
        // Convert total and remaining to grams
        const newQuantityTotal = comp.quantity_total * conversionFactor;
        // Clamp negative remaining to 0 (can't have negative stock)
        const newQuantityRemaining = Math.max(0, comp.quantity_remaining * conversionFactor);

        // Update the component
        await base44.entities.ReloadingComponent.update(comp.id, {
          quantity_total: newQuantityTotal,
          quantity_remaining: newQuantityRemaining,
          unit: 'grams',
        });

        repaired.push({
          id: comp.id,
          name: comp.name,
          oldUnit: comp.unit,
          oldTotal: comp.quantity_total,
          newTotal: newQuantityTotal,
          oldRemaining: comp.quantity_remaining,
          newRemaining: newQuantityRemaining,
        });
      }
    }

    return Response.json({
      success: true,
      repairedCount: repaired.length,
      repaired,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});