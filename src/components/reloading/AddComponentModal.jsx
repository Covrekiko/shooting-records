import { useState } from 'react';
import { format } from 'date-fns';
import { searchCalibers } from '@/utils/caliberCatalog';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import NumberInput from '@/components/ui/NumberInput.jsx';

const TITLES = { brass: 'Add Brass Cartridge', bullet: 'Add Bullet', powder: 'Add Powder', primer: 'Add Primer' };
const UNIT_OPTIONS = { powder: ['grains', 'grams', 'kg', 'oz', 'lb'], primer: ['pieces'], brass: ['pieces'], bullet: ['pieces'] };

export default function AddComponentModal({ isOpen, onClose, onSave, componentType = 'primer' }) {
  const [caliberResults, setCaliberResults] = useState([]);
  const [showCaliberDrop, setShowCaliberDrop] = useState(false);

  const [formData, setFormData] = useState({
    component_type: componentType,
    name: '',
    brand: '',
    caliber: '',
    bullet_name: '',
    weight: '',
    weight_unit: 'gr',
    quantity_total: '',
    unit: componentType === 'powder' ? 'grams' : 'pieces',
    price_total: '',
    lot_number: '',
    date_acquired: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const inp = 'w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/40';
  const lbl = 'block text-xs font-bold text-muted-foreground uppercase mb-1.5';

  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));

  const convertToGrams = (value, unit) => {
    const conversions = { grams: 1, kg: 1000, oz: 28.3495, lb: 453.592, grains: 0.06479891 };
    return value * (conversions[unit] || 1);
  };

  const handleSubmit = () => {
    const qty = parseFloat(formData.quantity_total) || 0;
    const price = parseFloat(formData.price_total) || 0;

    let quantityTotal = qty;
    let quantityRemaining = qty;
    let storageUnit = formData.unit;
    let displayName = formData.name;

    if (componentType === 'powder') {
      quantityTotal = convertToGrams(qty, formData.unit);
      quantityRemaining = quantityTotal;
      storageUnit = 'grams';
    }
    if (componentType === 'bullet') {
      displayName = `${formData.brand} ${formData.bullet_name} (${formData.caliber})`;
    }

    onSave({
      component_type: componentType,
      name: displayName,
      brand: formData.brand,
      caliber: formData.caliber,
      bullet_name: formData.bullet_name,
      weight: parseFloat(formData.weight) || null,
      weight_unit: formData.weight_unit,
      quantity_total: quantityTotal,
      quantity_remaining: quantityRemaining,
      unit: storageUnit,
      price_total: price,
      cost_per_unit: qty > 0 ? price / qty : 0,
      lot_number: formData.lot_number,
      date_acquired: formData.date_acquired,
      notes: formData.notes,
    });
  };

  const title = TITLES[componentType] || 'Add Component';
  const unitOptions = UNIT_OPTIONS[componentType] || ['pieces'];

  return (
    <GlobalModal
      open={isOpen}
      onClose={onClose}
      title={title}
      onSubmit={handleSubmit}
      primaryAction={`Save ${title.split(' ').slice(1).join(' ')}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">

        {/* Caliber (brass + bullet) */}
        {(componentType === 'brass' || componentType === 'bullet') && (
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
        )}

        {/* Brand */}
        {(componentType !== 'bullet') && (
          <div>
            <label className={lbl}>Brand</label>
            <input type="text" value={formData.brand}
              onChange={(e) => set('brand', e.target.value)}
              className={inp}
              placeholder={componentType === 'brass' ? 'e.g., Lapua, Hornady' : componentType === 'powder' ? 'e.g., Vihtavuori, Hodgdon' : 'e.g., CCI, Federal'}
              required />
          </div>
        )}

        {/* Bullet specific */}
        {componentType === 'bullet' && (
          <>
            <div>
              <label className={lbl}>Brand</label>
              <input type="text" value={formData.brand} onChange={(e) => set('brand', e.target.value)}
                className={inp} placeholder="e.g., Sako, Hornady, Sierra" required />
            </div>
            <div>
              <label className={lbl}>Bullet Name / Model</label>
              <input type="text" value={formData.bullet_name} onChange={(e) => set('bullet_name', e.target.value)}
                className={inp} placeholder="e.g., Gamehead, V-MAX, MatchKing" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Weight (optional)"
                value={formData.weight}
                onChange={(v) => set('weight', v)}
                placeholder="140"
                allowDecimal
              />
              <div>
                <label className={lbl}>Unit</label>
                <select value={formData.weight_unit} onChange={(e) => set('weight_unit', e.target.value)} className={inp}>
                  <option value="gr">gr (grains)</option>
                  <option value="g">g (grams)</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* Primer name */}
        {componentType === 'primer' && (
          <div>
            <label className={lbl}>Primer Name</label>
            <input type="text" value={formData.name} onChange={(e) => set('name', e.target.value)}
              className={inp} placeholder="e.g., CCI 200, Federal 210M" required />
          </div>
        )}

        {/* Powder name */}
        {componentType === 'powder' && (
          <div>
            <label className={lbl}>Powder Name</label>
            <input type="text" value={formData.name} onChange={(e) => set('name', e.target.value)}
              className={inp} placeholder="e.g., Vihtavuori N140, H4350" required />
          </div>
        )}

        {/* Quantity + Unit */}
        <div className="grid grid-cols-2 gap-3">
          <NumberInput
            label="Quantity"
            value={formData.quantity_total}
            onChange={(v) => set('quantity_total', v)}
            placeholder={componentType === 'powder' ? '1000' : '100'}
            allowDecimal={componentType === 'powder'}
            required
          />
          <div>
            <label className={lbl}>Unit</label>
            <select value={formData.unit} onChange={(e) => set('unit', e.target.value)} className={inp}>
              {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <NumberInput
          label="Total Price (£)"
          value={formData.price_total}
          onChange={(v) => set('price_total', v)}
          placeholder="0.00"
          allowDecimal
          required
        />

        <div>
          <label className={lbl}>Lot / Batch Number (optional)</label>
          <input type="text" value={formData.lot_number} onChange={(e) => set('lot_number', e.target.value)}
            className={inp} placeholder="e.g., LOT-12345" />
        </div>

        <div>
          <label className={lbl}>Date Acquired</label>
          <input type="date" value={formData.date_acquired}
            onChange={(e) => set('date_acquired', e.target.value)} className={inp} />
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