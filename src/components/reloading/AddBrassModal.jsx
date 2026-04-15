import { useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function AddBrassModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    caliber: '',
    case_length: '',
    times_fired: 0,
    quantity_total: '',
    unit: 'pieces',
    price_total: '',
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      component_type: 'brass',
      name: formData.name || `${formData.brand} ${formData.caliber}`.trim(),
      quantity_total: parseInt(formData.quantity_total) || 0,
      unit: formData.unit,
      price_total: parseFloat(formData.price_total) || 0,
      notes: formData.notes,
      metadata: {
        brand: formData.brand,
        caliber: formData.caliber,
        case_length: formData.case_length,
        times_fired: formData.times_fired,
      },
    });
    setFormData({
      name: '',
      brand: '',
      caliber: '',
      case_length: '',
      times_fired: 0,
      quantity_total: '',
      unit: 'pieces',
      price_total: '',
      notes: '',
    });
  };

  if (!isOpen) return null;

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm";

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[50000] flex items-center justify-center p-4">
      <div className="bg-card rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">Add New Brass</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className={inputCls}
              placeholder="e.g., Lapua, Hornady"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Caliber</label>
            <input
              type="text"
              value={formData.caliber}
              onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
              className={inputCls}
              placeholder="e.g., .308 Win"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Case Length</label>
            <input
              type="text"
              value={formData.case_length}
              onChange={(e) => setFormData({ ...formData, case_length: e.target.value })}
              className={inputCls}
              placeholder="e.g., 2.015"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Times Fired</label>
            <input
              type="number"
              value={formData.times_fired}
              onChange={(e) => setFormData({ ...formData, times_fired: parseInt(e.target.value) || 0 })}
              className={inputCls}
              min="0"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Quantity</label>
            <input
              type="number"
              value={formData.quantity_total}
              onChange={(e) => setFormData({ ...formData, quantity_total: e.target.value })}
              className={inputCls}
              placeholder="100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Total Cost</label>
            <input
              type="number"
              value={formData.price_total}
              onChange={(e) => setFormData({ ...formData, price_total: e.target.value })}
              className={inputCls}
              placeholder="50.00"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={inputCls}
              rows="2"
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