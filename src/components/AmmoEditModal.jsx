import { useState, useEffect } from 'react';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import NumberInput from '@/components/ui/NumberInput.jsx';

export default function AmmoEditModal({ ammo, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    caliber: '',
    brand: '',
    bullet_type: '',
    grain: '',
    quantity_in_stock: '',
    cost_per_unit: '',
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
        quantity_in_stock: ammo.quantity_in_stock != null ? String(ammo.quantity_in_stock) : '',
        cost_per_unit: ammo.cost_per_unit != null ? String(ammo.cost_per_unit) : '',
        date_purchased: ammo.date_purchased || '',
        notes: ammo.notes || '',
      });
    }
  }, [ammo, isOpen]);

  const inp = 'w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/40';
  const lbl = 'block text-xs font-bold text-muted-foreground uppercase mb-1.5';

  const handleSubmit = () => {
    onSave({
      ...formData,
      quantity_in_stock: parseInt(formData.quantity_in_stock) || 0,
      cost_per_unit: parseFloat(formData.cost_per_unit) || 0,
    });
  };

  return (
    <GlobalModal
      open={isOpen}
      onClose={onClose}
      title="Edit Ammunition"
      onSubmit={handleSubmit}
      primaryAction="Save"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div>
          <label className={lbl}>Caliber</label>
          <input type="text" value={formData.caliber}
            onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
            className={inp} placeholder="e.g., .308 Win" />
        </div>

        <div>
          <label className={lbl}>Brand</label>
          <input type="text" value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            className={inp} placeholder="e.g., Hornady" required />
        </div>

        <div>
          <label className={lbl}>Bullet Type</label>
          <input type="text" value={formData.bullet_type}
            onChange={(e) => setFormData({ ...formData, bullet_type: e.target.value })}
            className={inp} placeholder="e.g., SST" />
        </div>

        <div>
          <label className={lbl}>Grain</label>
          <input type="text" value={formData.grain}
            onChange={(e) => setFormData({ ...formData, grain: e.target.value })}
            className={inp} placeholder="e.g., 150gr" />
        </div>

        <NumberInput
          label="Quantity"
          value={formData.quantity_in_stock}
          onChange={(v) => setFormData({ ...formData, quantity_in_stock: v })}
          placeholder="0"
          unit="rounds"
        />

        <NumberInput
          label="Cost per Round"
          value={formData.cost_per_unit}
          onChange={(v) => setFormData({ ...formData, cost_per_unit: v })}
          placeholder="0.00"
          allowDecimal
          unit="£"
        />

        <div>
          <label className={lbl}>Purchase Date</label>
          <input type="date" value={formData.date_purchased}
            onChange={(e) => setFormData({ ...formData, date_purchased: e.target.value })}
            className={inp} />
        </div>

        <div>
          <label className={lbl}>Notes</label>
          <textarea value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className={inp} rows="3" placeholder="Additional notes" />
        </div>
      </div>
    </GlobalModal>
  );
}