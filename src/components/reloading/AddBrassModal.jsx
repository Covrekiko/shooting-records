import { useState } from 'react';
import { format } from 'date-fns';
import { searchCalibers } from '@/utils/caliberCatalog';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import NumberInput from '@/components/ui/NumberInput.jsx';

export default function AddBrassModal({ isOpen, onClose, onSave, defaultIsUsed = false }) {
  const autoNumber = `BRASS-${format(new Date(), 'yyyyMMdd-HHmm')}`;

  const [isUsed, setIsUsed] = useState(defaultIsUsed);
  const [caliberResults, setCaliberResults] = useState([]);
  const [showCaliberDrop, setShowCaliberDrop] = useState(false);

  const [formData, setFormData] = useState({
    batch_number: autoNumber,
    lot_number: '',
    name: '',
    brand: '',
    caliber: '',
    quantity_total: '',
    price_total: '',
    times_fired: '',
    max_reloads: '',
    date_acquired: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const inp = 'w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/40';
  const lbl = 'block text-xs font-bold text-muted-foreground uppercase mb-1.5';

  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    const qty = parseInt(formData.quantity_total) || 0;
    const price = parseFloat(formData.price_total) || 0;
    const name = formData.name || `${formData.brand} ${formData.caliber}`.trim();
    onSave({
      component_type: 'brass',
      is_used_brass: isUsed,
      batch_number: formData.batch_number,
      lot_number: formData.lot_number,
      name,
      brand: formData.brand,
      caliber: formData.caliber,
      quantity_total: qty,
      quantity_remaining: qty,
      total_owned: qty,
      available_new_unloaded: isUsed ? 0 : qty,
      available_used_recovered: isUsed ? qty : 0,
      available_to_reload: qty,
      first_use_cost_remaining_quantity: isUsed ? 0 : qty,
      cost_consumed_quantity: 0,
      currently_loaded: 0,
      currently_loaded_new: 0,
      currently_loaded_used: 0,
      fired_awaiting_cleaning_or_inspection: 0,
      fired_new_awaiting_cleaning_or_inspection: 0,
      fired_used_awaiting_cleaning_or_inspection: 0,
      retired_or_discarded: 0,
      unit: 'pieces',
      price_total: price,
      cost_per_unit: qty > 0 ? price / qty : 0,
      date_acquired: formData.date_acquired,
      times_fired: isUsed ? (parseInt(formData.times_fired) || 0) : 0,
      max_reloads: parseInt(formData.max_reloads) || 0,
      reload_limit: parseInt(formData.max_reloads) || 0,
      times_reloaded: 0,
      reload_cycle_count: 0,
      lifetime_reload_count: 0,
      anneal_count: 0,
      last_annealed_date: '',
      notes: formData.notes,
    });
    setFormData({
      batch_number: autoNumber,
      lot_number: '',
      name: '', brand: '', caliber: '',
      quantity_total: '', price_total: '',
      times_fired: '', max_reloads: '',
      date_acquired: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
  };

  return (
    <GlobalModal
      open={isOpen}
      onClose={onClose}
      title="Add Brass"
      onSubmit={handleSubmit}
      primaryAction={isUsed ? 'Save Used Brass' : 'Save New Brass'}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">

        {/* New / Used toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button type="button" onClick={() => setIsUsed(false)}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${!isUsed ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>
            New Brass
          </button>
          <button type="button" onClick={() => setIsUsed(true)}
            className={`flex-1 py-2 text-sm font-semibold transition-colors ${isUsed ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}`}>
            Used Brass
          </button>
        </div>

        {isUsed && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            Used brass tracks stock & deducts like new brass. Each batch gets its own number for full traceability.
          </div>
        )}

        <div>
          <label className={lbl}>Batch Number</label>
          <input type="text" value={formData.batch_number} onChange={(e) => set('batch_number', e.target.value)}
            className={inp} required />
        </div>

        <div>
          <label className={lbl}>Lot / Batch Number (optional)</label>
          <input type="text" value={formData.lot_number} onChange={(e) => set('lot_number', e.target.value)}
            className={inp} placeholder="e.g., LOT-12345" />
        </div>

        <div>
          <label className={lbl}>Brand</label>
          <input type="text" value={formData.brand} onChange={(e) => set('brand', e.target.value)}
            className={inp} placeholder="e.g., Lapua, Hornady, Federal" required />
        </div>

        {/* Caliber with autocomplete */}
        <div className="relative">
          <label className={lbl}>Caliber</label>
          <input type="text" value={formData.caliber}
            onChange={(e) => {
              set('caliber', e.target.value);
              setCaliberResults(e.target.value ? searchCalibers(e.target.value) : []);
              setShowCaliberDrop(true);
            }}
            onFocus={() => setShowCaliberDrop(formData.caliber.length >= 1)}
            className={inp} placeholder="e.g., .308 Win, 6.5 Creedmoor" required />
          {showCaliberDrop && caliberResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
              {caliberResults.map((c, i) => (
                <button key={i} type="button"
                  onClick={() => { set('caliber', c); setShowCaliberDrop(false); setCaliberResults([]); }}
                  className="w-full text-left px-3 py-2 hover:bg-secondary text-sm border-b border-border last:border-0">
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={lbl}>Name / Description (optional)</label>
          <input type="text" value={formData.name} onChange={(e) => set('name', e.target.value)}
            className={inp} placeholder="Leave blank to auto-generate from Brand + Caliber" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Quantity"
            value={formData.quantity_total}
            onChange={(v) => set('quantity_total', v)}
            placeholder="100"
            required
          />
          <NumberInput
            label="Total Cost"
            value={formData.price_total}
            onChange={(v) => set('price_total', v)}
            placeholder="0.00"
            unit="£"
            allowDecimal
            required
          />
        </div>

        {isUsed && (
          <NumberInput
            label="Times Previously Fired"
            value={formData.times_fired}
            onChange={(v) => set('times_fired', v)}
            placeholder="0"
          />
        )}

        <NumberInput
          label="Max Reloads Limit (0 = no limit)"
          value={formData.max_reloads}
          onChange={(v) => set('max_reloads', v)}
          placeholder="e.g., 5"
        />

        <div>
          <label className={lbl}>Date Acquired</label>
          <input type="date" value={formData.date_acquired} onChange={(e) => set('date_acquired', e.target.value)}
            className={inp} />
        </div>

        <div>
          <label className={lbl}>Notes (optional)</label>
          <textarea value={formData.notes} onChange={(e) => set('notes', e.target.value)}
            className={inp} rows="2" placeholder="Any additional notes" />
        </div>
      </div>
    </GlobalModal>
  );
}