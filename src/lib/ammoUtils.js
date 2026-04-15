import { base44 } from '@/api/base44Client';

export async function decrementAmmoStock(ammunitionId, quantity, sessionType = null) {
  if (!ammunitionId || !quantity) return;
  
  try {
    const ammo = await base44.entities.Ammunition.get(ammunitionId);
    const newQuantity = Math.max(0, ammo.quantity_in_stock - quantity);
    
    // Update stock
    await base44.entities.Ammunition.update(ammunitionId, { quantity_in_stock: newQuantity });
    
    // Log spending
    if (ammo.cost_per_unit) {
      const totalCost = quantity * ammo.cost_per_unit;
      await base44.entities.AmmoSpending.create({
        ammunition_id: ammunitionId,
        brand: ammo.brand,
        caliber: ammo.caliber,
        quantity_used: quantity,
        cost_per_unit: ammo.cost_per_unit,
        total_cost: totalCost,
        date_used: new Date().toISOString().split('T')[0],
        session_type: sessionType,
      });
    }
  } catch (error) {
    console.error('Error decrementing ammo stock:', error);
  }
}