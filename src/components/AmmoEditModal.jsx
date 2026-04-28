import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function AmmoEditModal({ ammo, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    caliber: '',
    brand: '',
    bullet_type: '',
    grain: '',
    quantity_in_stock: 0,
    cost_per_unit: 0,
    date_purchased: '',
    notes: '',
  });

  useEffect(() => {
    if (ammo) {
      setFormData({
        caliber: ammo.caliber || '',
        brand: ammo.brand || '',
        bullet_type: ammo.bullet_type || '',
        grain: ammo.grain || '',
        quantity_in_stock: ammo.quantity_in_stock || 0,
        cost_per_unit: ammo.cost_per_unit || 0,
        date_purchased: ammo.date_purchased || '',
        notes: ammo.notes || '',
      });
    }
  }, [ammo, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm";

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-[50000] flex items-center justify-center p-4"
      style={{ touchAction: 'none' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card rounded-xl w-full max-w-md max-h-[90vh] flex flex-col shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-bold">Edit Ammunition</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto overscroll-contain flex-1" style={{ touchAction: 'pan-y' }}>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Caliber</label>
            <input
              type="text"
              value={formData.caliber}
              onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
              className={inputCls}
              placeholder="e.g., .308 Win"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className={inputCls}
              placeholder="e.g., Hornady"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Bullet Type</label>
            <input
              type="text"
              value={formData.bullet_type}
              onChange={(e) => setFormData({ ...formData, bullet_type: e.target.value })}
              className={inputCls}
              placeholder="e.g., SST"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Grain</label>
            <input
              type="text"
              value={formData.grain}
              onChange={(e) => setFormData({ ...formData, grain: e.target.value })}
              className={inputCls}
              placeholder="e.g., 150gr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Quantity</label>
            <input
              type="number"
              value={formData.quantity_in_stock}
              onChange={(e) => setFormData({ ...formData, quantity_in_stock: parseInt(e.target.value) || 0 })}
              className={inputCls}
              min="0"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Cost per Round</label>
            <input
              type="number"
              value={formData.cost_per_unit}
              onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
              className={inputCls}
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Purchase Date</label>
            <input
              type="date"
              value={formData.date_purchased}
              onChange={(e) => setFormData({ ...formData, date_purchased: e.target.value })}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={inputCls}
              rows="3"
              placeholder="Additional notes"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              type="submit"
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-lg font-semibold hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}