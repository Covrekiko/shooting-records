import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AmmoStockWidget() {
  const [ammo, setAmmo] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAmmo();
  }, []);

  const loadAmmo = async () => {
    try {
      const currentUser = await base44.auth.me();
      const ammoList = await base44.entities.Ammunition.filter({ created_by: currentUser.email });
      setAmmo(ammoList);
    } catch (error) {
      if (error) setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const lowStockItems = ammo.filter((item) => item.quantity_in_stock < item.low_stock_threshold);
  const totalValue = ammo.reduce((sum, item) => sum + (item.quantity_in_stock * (item.cost_per_unit || 0)), 0);

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 shadow-[0_6px_20px_rgba(180,83,9,0.08)]">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-[0_6px_20px_rgba(180,83,9,0.08)]">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold flex items-center gap-2.5 text-foreground">
          <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary">
            <Package className="w-4 h-4" />
          </span>
          Ammunition Inventory
        </h3>
        <Link to="/settings/ammunition-inventory" className="text-xs text-primary hover:text-orange-700 font-medium">
          Manage
        </Link>
      </div>

      {ammo.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ammunition tracked</p>
      ) : (
        <div className="space-y-3">
          {lowStockItems.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded p-3 mb-3">
              <div className="flex items-start gap-2 text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">{lowStockItems.length} items low</p>
                  {lowStockItems.slice(0, 2).map((item) => (
                    <p key={item.id} className="text-xs">
                      {item.brand} {item.caliber}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Types:</span>
              <span className="font-semibold text-primary">{ammo.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Value:</span>
              <span className="font-semibold text-primary">£{totalValue.toFixed(2)}</span>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground font-medium mb-2.5">Top 3 in Stock:</p>
              {[...ammo]
                .sort((a, b) => b.quantity_in_stock - a.quantity_in_stock)
                .slice(0, 3)
                .map((item) => (
                  <div key={item.id} className="flex justify-between text-xs mb-1">
                    <span>{item.brand} {item.caliber}</span>
                    <span className="font-medium">{item.quantity_in_stock}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}