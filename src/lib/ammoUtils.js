import { base44 } from '@/api/base44Client';

export async function decrementAmmoStock(ammunitionId, quantity) {
  if (!ammunitionId || !quantity) return;
  
  try {
    const ammo = await base44.entities.Ammunition.get(ammunitionId);
    const newQuantity = Math.max(0, ammo.quantity_in_stock - quantity);
    await base44.entities.Ammunition.update(ammunitionId, { quantity_in_stock: newQuantity });
  } catch (error) {
    console.error('Error decrementing ammo stock:', error);
  }
}