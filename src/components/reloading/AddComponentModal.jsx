import { useState } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { searchCalibers } from '@/utils/caliberCatalog';

export default function AddComponentModal({ isOpen, onClose, onSave, componentType = 'primer' }) {
  const [caliberResults, setCaliberResults] = useState([]);
  const [showCaliberDrop, setShowCaliberDrop] = useState(false);
  const [catalogResults, setCatalogResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
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
    date_acquired: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  const handleCaliberSearch = (q) => {
    setCaliberResults(q ? searchCalibers(q) : []);
  };

  const convertToGrams = (value, unit) => {
    const conversions = {
      'grams': 1,
      'kg': 1000,
      'oz': 28.3495,
      'lb': 453.592,
      'grains': 0.06479891,
    };
    return value * (conversions[unit] || 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const qty = parseFloat(formData.quantity_total) || 0;
    const price = parseFloat(formData.price_total) || 0;
    
    let quantityTotal = qty;
    let quantityRemaining = qty;
    let storageUnit = formData.unit;
    let displayName = formData.name;

    // For powder, convert to grams for storage
    if (componentType === 'powder') {
      quantityTotal = convertToGrams(qty, formData.unit);
      quantityRemaining = quantityTotal;
      storageUnit = 'grams';
    }

    // For bullets, create a unique identifier
    if (componentType === 'bullet') {
      displayName = `${formData.brand} ${formData.bullet_name} (${formData.caliber})`;
    }

    onSave({
      component_type: componentType,
      name: displayName,
      brand: formData.brand,
      caliber: formData.caliber,
      bullet_name: formData.bullet_name,
      weight: formData.weight,
      weight_unit: formData.weight_unit,
      quantity_total: quantityTotal,
      quantity_remaining: quantityRemaining,
      unit: storageUnit,
      price_total: price,
      cost_per_unit: qty > 0 ? price / qty : 0,
      date_acquired: formData.date_acquired,
      notes: formData.notes,
    });
  };

  if (!isOpen) return null;

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm";
  const labelCls = "block text-xs font-bold text-muted-foreground uppercase mb-1.5";

  const getTitle = () => {
    const titles = {
      'brass': 'Add Brass Cartridge',
      'bullet': 'Add Bullet',
      'powder': 'Add Powder',
      'primer': 'Add Primer',
    };
    return titles[componentType] || 'Add Component';
  };

  const getUnitOptions = () => {
    const units = {
      'powder': ['grains', 'grams', 'kg', 'oz', 'lb'],
      'primer': ['pieces'],
      'brass': ['pieces'],
      'bullet': ['pieces'],
    };
    return units[componentType] || ['pieces'];
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 z-[50000] flex items-center justify-center p-4">
      <div className="bg-card rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-bold">{getTitle()}</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Brass: Caliber */}
          {componentType === 'brass' && (
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
          )}

          {/* Brass / Primer / Powder: Brand */}
          {(componentType === 'brass' || componentType === 'primer' || componentType === 'powder') && (
            <div>
              <label className={labelCls}>Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className={inputCls}
                placeholder={componentType === 'brass' ? 'e.g., Lapua, Hornady' : componentType === 'powder' ? 'e.g., Vihtavuori, Hodgdon' : 'e.g., CCI, Federal, Winchester'}
                required
              />
            </div>
          )}

          {/* Bullet: Brand */}
          {componentType === 'bullet' && (
            <div>
              <label className={labelCls}>Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className={inputCls}
                placeholder="e.g., Sako, Hornady, Sierra"
                required
              />
            </div>
          )}

          {/* Bullet: Name / Model */}
          {componentType === 'bullet' && (
            <div>
              <label className={labelCls}>Bullet Name / Model</label>
              <input
                type="text"
                value={formData.bullet_name}
                onChange={(e) => setFormData({ ...formData, bullet_name: e.target.value })}
                className={inputCls}
                placeholder="e.g., Gamehead, V-MAX, MatchKing"
                required
              />
            </div>
          )}

          {/* Bullet: Caliber */}
          {componentType === 'bullet' && (
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
          )}

          {/* Bullet: Weight */}
          {componentType === 'bullet' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Weight (optional)</label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  className={inputCls}
                  placeholder="e.g., 140"
                  step="0.1"
                />
              </div>
              <div>
                <label className={labelCls}>Unit</label>
                <select
                  value={formData.weight_unit}
                  onChange={(e) => setFormData({ ...formData, weight_unit: e.target.value })}
                  className={inputCls}
                >
                  <option value="gr">gr (grains)</option>
                  <option value="g">g (grams)</option>
                </select>
              </div>
            </div>
          )}

          {/* Powder: Name / Type */}
          {componentType === 'powder' && (
            <div>
              <label className={labelCls}>Powder Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputCls}
                placeholder="e.g., Vihtavuori N140, H4350"
                required
              />
            </div>
          )}

          {/* Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Quantity</label>
              <input
                type="number"
                value={formData.quantity_total}
                onChange={(e) => setFormData({ ...formData, quantity_total: e.target.value })}
                className={inputCls}
                placeholder={componentType === 'powder' ? '1000' : '100'}
                min="1"
                step={componentType === 'powder' ? '0.1' : '1'}
                required
              />
            </div>
            <div>
              <label className={labelCls}>Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className={inputCls}
              >
                {getUnitOptions().map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Total Price */}
          <div>
            <label className={labelCls}>Total Price (£)</label>
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
              Save {getTitle().split(' ').slice(1).join(' ')}
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