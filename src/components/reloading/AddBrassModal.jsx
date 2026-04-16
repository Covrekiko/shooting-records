import { useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { searchCalibers } from '@/utils/caliberCatalog';

export default function AddBrassModal({ isOpen, onClose, onSave, defaultIsUsed = false }) {
  const autoNumber = `BRASS-${format(new Date(), 'yyyyMMdd-HHmm')}`;

  const [isUsed, setIsUsed] = useState(defaultIsUsed);
  const [caliberResults, setCaliberResults] = useState([]);
  const [showCaliberDrop, setShowCaliberDrop] = useState(false);
  const [formData, setFormData] = useState({
    batch_number: autoNumber,
    name: '',
    brand: '',
    caliber: '',
    quantity_total: '',
    price_total: '',
    times_fired: 0,
    max_reloads: '',
    date_acquired: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const handleCaliberSearch = (q) => {
    setCaliberResults(q ? searchCalibers(q) : []);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = parseInt(formData.quantity_total) || 0;
    const price = parseFloat(formData.price_total) || 0;
    const name = formData.name || `${formData.brand} ${formData.caliber}`.trim();
    onSave({
      component_type: 'brass',
      is_used_brass: isUsed,
      batch_number: formData.batch_number,
      name,
      brand: formData.brand,
      caliber: formData.caliber,
      quantity_total: qty,
      quantity_remaining: qty,
      unit: 'pieces',
      price_total: price,
      cost_per_unit: qty > 0 ? price / qty : 0,
      date_acquired: formData.date_acquired,
      times_fired: isUsed ? (parseInt(formData.times_fired) || 0) : 0,
      max_reloads: parseInt(formData.max_reloads) || 0,
      times_reloaded: 0,
      notes: formData.notes,
    });
    // Reset
    setFormData({
      batch_number: autoNumber,
      name: '',
      brand: '',
      caliber: '',
      quantity_total: '',
      price_total: '',
      times_fired: 0,
      max_reloads: '',
      date_acquired: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
  };

  if (!isOpen) return null;

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm";
  const labelCls = "block text-xs font-bold text-muted-foreground uppercase mb-1.5";

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[50000] flex items-center justify-center p-4">
      <div className="bg-card rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-bold">Add Brass</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* New / Used toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setIsUsed(false)}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${!isUsed ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
            >
              New Brass
            </button>
            <button
              type="button"
              onClick={() => setIsUsed(true)}
              className={`flex-1 py-2 text-sm font-semibold transition-colors ${isUsed ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}
            >
              Used Brass
            </button>
          </div>

          {isUsed && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Used brass tracks stock & deducts like new brass. Each batch gets its own number for full traceability.
            </div>
          )}

          {/* Batch number */}
          <div>
            <label className={labelCls}>Batch Number</label>
            <input
              type="text"
              value={formData.batch_number}
              onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
              className={inputCls}
              required
            />
          </div>

          {/* Brand */}
          <div>
            <label className={labelCls}>Brand</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className={inputCls}
              placeholder="e.g., Lapua, Hornady, Federal"
              required
            />
          </div>

          {/* Caliber with autocomplete */}
          <div className="relative">
            <label className={labelCls}>Caliber</label>
            <input
              type="text"
              value={formData.caliber}
              onChange={(e) => {
                setFormData({ ...formData, caliber: e.target.value });
                handleCaliberSearch(e.target.value);
                setShowCaliberDrop(true);
              }}
              onFocus={() => setShowCaliberDrop(formData.caliber.length >= 1)}
              className={inputCls}
              placeholder="e.g., .308 Win, 6.5 Creedmoor"
              required
            />
            {showCaliberDrop && caliberResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                {caliberResults.map((c, i) => (
                  <button key={i} type="button"
                    onClick={() => { setFormData({ ...formData, caliber: c }); setShowCaliberDrop(false); setCaliberResults([]); }}
                    className="w-full text-left px-3 py-2 hover:bg-secondary text-sm border-b border-border last:border-0"
                  >{c}</button>
                ))}
              </div>
            )}
          </div>

          {/* Custom name (optional) */}
          <div>
            <label className={labelCls}>Name / Description (optional)</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputCls}
              placeholder="Leave blank to auto-generate from Brand + Caliber"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Quantity</label>
              <input
                type="number"
                value={formData.quantity_total}
                onChange={(e) => setFormData({ ...formData, quantity_total: e.target.value })}
                className={inputCls}
                placeholder="100"
                min="1"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Total Cost (£)</label>
              <input
                type="number"
                value={formData.price_total}
                onChange={(e) => setFormData({ ...formData, price_total: e.target.value })}
                className={inputCls}
                placeholder="0.00"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          {/* Used-brass specific fields */}
          {isUsed && (
            <div>
              <label className={labelCls}>Times Previously Fired</label>
              <input
                type="number"
                value={formData.times_fired}
                onChange={(e) => setFormData({ ...formData, times_fired: e.target.value })}
                className={inputCls}
                min="0"
                placeholder="0"
              />
            </div>
          )}

          {/* Reload limit */}
          <div>
            <label className={labelCls}>Max Reloads Limit (0 = no limit)</label>
            <input
              type="number"
              value={formData.max_reloads}
              onChange={(e) => setFormData({ ...formData, max_reloads: e.target.value })}
              className={inputCls}
              placeholder="e.g., 5"
              min="0"
            />
          </div>

          {/* Date */}
          <div>
            <label className={labelCls}>Date Acquired</label>
            <input
              type="date"
              value={formData.date_acquired}
              onChange={(e) => setFormData({ ...formData, date_acquired: e.target.value })}
              className={inputCls}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes (optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={inputCls}
              rows="2"
              placeholder="Any additional notes"
            />
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <button type="submit" className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90">
              Save {isUsed ? 'Used Brass' : 'New Brass'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-border rounded-lg font-semibold hover:bg-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}