import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import CatalogComponentSelector from './CatalogComponentSelector';
import BottomSheet from '@/components/BottomSheet';

export default function ReloadBatchForm({ onSubmit, onClose }) {
  const [components, setComponents] = useState({});
  const [rifles, setRifles] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [currentSelectorType, setCurrentSelectorType] = useState(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    caliber: '',
    batch_number: format(new Date(), 'yyyyMMdd-HHmm'),
    rifle_id: '',
    cartridges_loaded: '',
    primer_id: '',
    primer_data: null,
    powder_id: '',
    powder_data: null,
    powder_charge: '',
    powder_unit: 'grains',
    brass_id: '',
    brass_data: null,
    brass_is_used: false,
    bullet_id: '',
    bullet_data: null,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const [componentsList, riflesList] = await Promise.all([
        base44.entities.ReloadingComponent.filter({ created_by: currentUser.email }),
        base44.entities.Rifle.filter({ created_by: currentUser.email }),
      ]);

      const grouped = {
        primer: componentsList.filter(c => c.component_type === 'primer'),
        powder: componentsList.filter(c => c.component_type === 'powder'),
        brass: componentsList.filter(c => c.component_type === 'brass'),
        bullet: componentsList.filter(c => c.component_type === 'bullet'),
      };

      setComponents(grouped);
      setRifles(riflesList);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCatalogSelector = (type) => {
    setCurrentSelectorType(type);
    setSelectorOpen(true);
  };

  const handleCatalogSelect = (item) => {
    if (currentSelectorType === 'primer') {
      setFormData({ ...formData, primer_id: item.id, primer_data: item });
    } else if (currentSelectorType === 'powder') {
      setFormData({ ...formData, powder_id: item.id, powder_data: item });
    } else if (currentSelectorType === 'bullet') {
      setFormData({ ...formData, bullet_id: item.id, bullet_data: item });
    } else if (currentSelectorType === 'brass') {
      setFormData({ ...formData, brass_id: item.id, brass_data: item });
    }
    setSelectorOpen(false);
  };

  const convertPowderCharge = (charge, fromUnit, toUnit) => {
    if (fromUnit === toUnit) return charge;
    // 1 grain = 0.06479891 grams
    if (fromUnit === 'grains' && toUnit === 'grams') {
      return charge * 0.06479891;
    } else if (fromUnit === 'grams' && toUnit === 'grains') {
      return charge / 0.06479891;
    }
    return charge;
  };

  const calculateCosts = () => {
    if (!formData.cartridges_loaded || !formData.primer_id || !formData.powder_id || !formData.brass_id || !formData.bullet_id || !formData.powder_charge) {
      return null;
    }

    const primer = components.primer.find(c => c.id === formData.primer_id);
    const powder = components.powder.find(c => c.id === formData.powder_id);
    const brass = components.brass.find(c => c.id === formData.brass_id);
    const bullet = components.bullet.find(c => c.id === formData.bullet_id);

    const cartridgesLoaded = parseInt(formData.cartridges_loaded);
    const powderChargePerCartridge = parseFloat(formData.powder_charge);

    // Convert powder charge to the stored unit (stored unit is powder.unit)
    let powderChargeInStoredUnit = powderChargePerCartridge;
    if (formData.powder_unit !== powder.unit) {
      powderChargeInStoredUnit = convertPowderCharge(powderChargePerCartridge, formData.powder_unit, powder.unit);
    }

    const primerCost = primer.cost_per_unit * cartridgesLoaded;
    const powderUsed = powderChargeInStoredUnit * cartridgesLoaded;
    const powderCost = powder.cost_per_unit * powderUsed;
    const brassCost = formData.brass_is_used ? 0 : brass.cost_per_unit * cartridgesLoaded;
    const bulletCost = bullet.cost_per_unit * cartridgesLoaded;
    const totalCost = primerCost + powderCost + brassCost + bulletCost;
    const costPerCartridge = totalCost / cartridgesLoaded;

    return {
      primerCost: parseFloat(primerCost.toFixed(2)),
      powderCost: parseFloat(powderCost.toFixed(2)),
      brassCost: parseFloat(brassCost.toFixed(2)),
      bulletCost: parseFloat(bulletCost.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      costPerCartridge: parseFloat(costPerCartridge.toFixed(4)),
      powderUsed: parseFloat(powderUsed.toFixed(2)),
      powderDisplayed: parseFloat(powderChargePerCartridge.toFixed(2)),
    };
  };

  useEffect(() => {
    setCostBreakdown(calculateCosts());
  }, [formData.cartridges_loaded, formData.primer_id, formData.powder_id, formData.brass_id, formData.brass_is_used, formData.bullet_id, formData.powder_charge, formData.powder_unit, components]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!costBreakdown) {
        alert('Please select all components and enter required quantities');
        return;
      }

      const primer = components.primer.find(c => c.id === formData.primer_id);
      const powder = components.powder.find(c => c.id === formData.powder_id);
      const brass = components.brass.find(c => c.id === formData.brass_id);
      const bullet = components.bullet.find(c => c.id === formData.bullet_id);

      const cartridgesLoaded = parseInt(formData.cartridges_loaded);
      const powderUsed = parseFloat(formData.powder_charge) * cartridgesLoaded;

      // Deduct from component stock
      await Promise.all([
        base44.entities.ReloadingComponent.update(formData.primer_id, {
          quantity_remaining: primer.quantity_remaining - cartridgesLoaded,
        }),
        base44.entities.ReloadingComponent.update(formData.powder_id, {
          quantity_remaining: powder.quantity_remaining - powderUsed,
        }),
        base44.entities.ReloadingComponent.update(formData.brass_id, {
          quantity_remaining: brass.quantity_remaining - cartridgesLoaded,
        }),
        base44.entities.ReloadingComponent.update(formData.bullet_id, {
          quantity_remaining: bullet.quantity_remaining - cartridgesLoaded,
        }),
      ]);

      // Create reload session
      const reloadSession = {
        date: formData.date,
        caliber: formData.caliber,
        batch_number: formData.batch_number,
        firearm_id: formData.rifle_id || null,
        rounds_loaded: cartridgesLoaded,
        total_cost: costBreakdown.totalCost,
        cost_per_round: costBreakdown.costPerCartridge,
        components: [
          { type: 'primer', name: primer.name, quantity_used: cartridgesLoaded, cost: costBreakdown.primerCost },
          { type: 'powder', name: powder.name, quantity_used: powderUsed, unit: powder.unit, cost: costBreakdown.powderCost },
          { type: 'brass', name: brass.name, quantity_used: cartridgesLoaded, cost: costBreakdown.brassCost },
          { type: 'bullet', name: bullet.name, quantity_used: cartridgesLoaded, cost: costBreakdown.bulletCost },
        ],
        notes: formData.notes,
      };

      await base44.entities.ReloadingSession.create(reloadSession);

      // Add to ammunition inventory
      const ammoList = await base44.entities.Ammunition.filter({
        created_by: user.email,
        caliber: formData.caliber,
      });

      if (ammoList.length > 0) {
        const ammo = ammoList[0];
        await base44.entities.Ammunition.update(ammo.id, {
          quantity_in_stock: (ammo.quantity_in_stock || 0) + cartridgesLoaded,
        });
      } else {
        await base44.entities.Ammunition.create({
          brand: 'Reloaded',
          caliber: formData.caliber,
          quantity_in_stock: cartridgesLoaded,
          units: 'rounds',
          cost_per_unit: costBreakdown.costPerCartridge,
          date_purchased: formData.date,
        });
      }

      onSubmit();
    } catch (error) {
      console.error('Error creating reload batch:', error);
      alert('Error creating reload batch: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-4"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
  }

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm";
  const labelCls = "text-xs font-bold text-muted-foreground uppercase mb-2 block";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-bold">New Reload Batch</h2>
        <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-5 pb-24 space-y-4">
      <form id="reload-batch-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-12">
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Caliber</label>
            <input
              type="text"
              value={formData.caliber}
              onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
              placeholder=".308 Win"
              className={inputCls}
              required
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Batch Number</label>
          <input type="text" value={formData.batch_number} onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })} className={inputCls} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Rifle (optional)</label>
            <select value={formData.rifle_id} onChange={(e) => setFormData({ ...formData, rifle_id: e.target.value })} className={inputCls}>
              <option value="">None</option>
              {rifles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Cartridges to Load</label>
            <input
              type="number"
              value={formData.cartridges_loaded}
              onChange={(e) => setFormData({ ...formData, cartridges_loaded: e.target.value })}
              className={inputCls}
              placeholder="100"
              required
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Primer</label>
          <button
            type="button"
            onClick={() => openCatalogSelector('primer')}
            className={`${inputCls} text-left flex items-center justify-between hover:bg-secondary/50`}
          >
            <span>{formData.primer_data?.product_name || formData.primer_data?.name || 'Select primer...'}</span>
            <span className="text-xs opacity-60">Browse</span>
          </button>
          {formData.primer_data && (
            <p className="text-xs text-muted-foreground mt-1">{formData.primer_data.brand || ''} • {formData.primer_data.primer_size || ''}</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Powder</label>
          <button
            type="button"
            onClick={() => openCatalogSelector('powder')}
            className={`${inputCls} text-left flex items-center justify-between hover:bg-secondary/50`}
          >
            <span>{formData.powder_data?.product_name || formData.powder_data?.name || 'Select powder...'}</span>
            <span className="text-xs opacity-60">Browse</span>
          </button>
          {formData.powder_data && (
            <p className="text-xs text-muted-foreground mt-1">{formData.powder_data.brand || ''} • {formData.powder_data.powder_type || ''}</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Powder Charge & Unit</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={formData.powder_charge}
              onChange={(e) => setFormData({ ...formData, powder_charge: e.target.value })}
              className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              placeholder="40"
              step="0.1"
              required
            />
            <select
              value={formData.powder_unit}
              onChange={(e) => setFormData({ ...formData, powder_unit: e.target.value })}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground font-medium min-w-max"
            >
              <option value="grains">grains</option>
              <option value="grams">grams</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Brass / Cartridge</label>
          <button
            type="button"
            onClick={() => openCatalogSelector('brass')}
            className={`${inputCls} text-left flex items-center justify-between hover:bg-secondary/50`}
          >
            <span>{formData.brass_data?.product_name || formData.brass_data?.name || 'Select brass...'}</span>
            <span className="text-xs opacity-60">Browse</span>
          </button>
          {formData.brass_data && (
            <p className="text-xs text-muted-foreground mt-1">{formData.brass_data.brand || ''} • {formData.brass_data.cartridge_caliber || ''}</p>
          )}
        </div>

        <div className="flex items-center gap-3 bg-secondary/30 p-3 rounded-lg">
          <input
            type="checkbox"
            id="brass_used"
            checked={formData.brass_is_used}
            onChange={(e) => setFormData({ ...formData, brass_is_used: e.target.checked })}
            className="w-4 h-4"
          />
          <label htmlFor="brass_used" className="text-sm font-medium cursor-pointer">
            Using previously fired/used brass (no cost)
          </label>
        </div>

        <div>
          <label className={labelCls}>Bullet</label>
          <button
            type="button"
            onClick={() => openCatalogSelector('bullet')}
            className={`${inputCls} text-left flex items-center justify-between hover:bg-secondary/50`}
          >
            <span>{formData.bullet_data?.product_name || formData.bullet_data?.name || 'Select bullet...'}</span>
            <span className="text-xs opacity-60">Browse</span>
          </button>
          {formData.bullet_data && (
            <p className="text-xs text-muted-foreground mt-1">{formData.bullet_data.brand || ''} • {formData.bullet_data.caliber || ''} • {formData.bullet_data.weight_grains || ''}gr</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className={inputCls}
            placeholder="Batch notes"
            rows="2"
          />
        </div>

        {/* Cost Breakdown */}
        {costBreakdown && (
          <div className="bg-secondary/30 rounded-lg p-4 space-y-2 border border-border">
            <h4 className="font-bold mb-3">Cost Breakdown</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Primers:</span> <span className="font-semibold">£{costBreakdown.primerCost.toFixed(2)}</span></div>
              <div><span className="text-muted-foreground">Powder:</span> <span className="font-semibold">£{costBreakdown.powderCost.toFixed(2)}</span></div>
              <div><span className="text-muted-foreground">Brass:</span> <span className="font-semibold">£{costBreakdown.brassCost.toFixed(2)}</span></div>
              <div><span className="text-muted-foreground">Bullets:</span> <span className="font-semibold">£{costBreakdown.bulletCost.toFixed(2)}</span></div>
            </div>
            <div className="border-t border-border pt-2 mt-2">
              <div className="text-lg font-bold">Total: £{costBreakdown.totalCost.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">£{costBreakdown.costPerCartridge.toFixed(4)} per cartridge</div>
            </div>
          </div>
        )}
      </form>
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-5 border-t border-border flex-shrink-0">
        <button
          form="reload-batch-form"
          type="submit"
          className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90"
        >
          Create Batch
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 border border-border rounded-lg font-semibold hover:bg-secondary"
        >
          Cancel
        </button>
      </div>

      {/* Catalog Selector Modal */}
      <BottomSheet isOpen={selectorOpen} onClose={() => setSelectorOpen(false)}>
        {selectorOpen && (
          <CatalogComponentSelector
            componentType={currentSelectorType}
            onSelect={handleCatalogSelect}
            onClose={() => setSelectorOpen(false)}
            selected={
              currentSelectorType === 'primer' ? formData.primer_data :
              currentSelectorType === 'powder' ? formData.powder_data :
              currentSelectorType === 'bullet' ? formData.bullet_data :
              currentSelectorType === 'brass' ? formData.brass_data : null
            }
          />
        )}
      </BottomSheet>
    </div>
  );
}