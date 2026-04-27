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
      console.error('Error loading ammo:', error);
    } finally {
      setLoading(false);
    }
  };

  const lowStockItems = ammo.filter((item) => item.quantity_in_stock < item.low_stock_threshold);
  const totalValue = ammo.reduce((sum, item) => sum + (item.quantity_in_stock * (item.cost_per_unit || 0)), 0);

  if (loading) {
    return (
      <div className="rounded-2xl p-4 shadow-sm" style={{
        backgroundColor: 'var(--app-card)',
        borderColor: 'var(--app-border)',
        borderWidth: '1px',
        boxShadow: 'var(--app-shadow)',
      }}>
        <div className="w-6 h-6 border-4 rounded-full animate-spin" style={{
          borderColor: 'var(--app-accent)',
          borderTopColor: 'transparent',
        }}></div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 shadow-sm" style={{
      backgroundColor: 'var(--app-card)',
      borderColor: 'var(--app-border)',
      borderWidth: '1px',
      boxShadow: 'var(--app-shadow)',
    }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold flex items-center gap-2.5" style={{ color: 'var(--app-text)' }}>
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--app-icon-bg)' }}>
            <Package className="w-4 h-4" style={{ color: 'var(--app-icon)' }} />
          </div>
          Ammunition Stock
        </h3>
        <Link to="/settings/ammunition-inventory" className="text-xs font-medium hover:opacity-80" style={{ color: 'var(--app-accent)' }}>
          Manage
        </Link>
      </div>

      {ammo.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--app-text-muted)' }}>No ammunition tracked</p>
      ) : (
        <div className="space-y-3">
          {lowStockItems.length > 0 && (
            <div className="rounded p-3 mb-3" style={{
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              borderWidth: '1px',
            }}>
              <div className="flex items-start gap-2" style={{ color: 'rgb(239, 68, 68)' }}>
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
              <span style={{ color: 'var(--app-text-muted)' }}>Types:</span>
              <span className="font-semibold" style={{ color: 'var(--app-text)' }}>{ammo.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: 'var(--app-text-muted)' }}>Total Value:</span>
              <span className="font-semibold" style={{ color: 'var(--app-text)' }}>£{totalValue.toFixed(2)}</span>
            </div>
            <div className="pt-3" style={{
              borderTopColor: 'var(--app-border)',
              borderTopWidth: '1px',
            }}>
              <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--app-text-muted)' }}>Top 3 in Stock:</p>
              {[...ammo]
                .sort((a, b) => b.quantity_in_stock - a.quantity_in_stock)
                .slice(0, 3)
                .map((item) => (
                  <div key={item.id} className="flex justify-between text-xs mb-1" style={{ color: 'var(--app-text)' }}>
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