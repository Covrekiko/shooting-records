import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { X, Plus } from 'lucide-react';
import { searchCalibers } from '@/utils/caliberCatalog';
import AddBrassModal from './AddBrassModal';

export default function ReloadBatchForm({ onSubmit, onClose }) {
  const [components, setComponents] = useState({});
  const [rifles, setRifles] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [showAddBrassModal, setShowAddBrassModal] = useState(false);
  const [caliberResults, setCaliberResults] = useState([]);
  const [validationError, setValidationError] = useState(null);
  const [showCaliberDropdown, setShowCaliberDropdown] = useState(false);
  const [stockWarnings, setStockWarnings] = useState({});

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    caliber: '',
    batch_number: format(new Date(), 'yyyyMMdd-HHmm'),
    rifle_id: '',
    cartridges_loaded: '',
    primer_id: '',
    powder_id: '',
    powder_charge: '',
    powder_unit: 'grains',
    brass_id: '',
    brass_is_used: false,
    bullet_id: '',
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



  const convertToGrams = (value, unit) => {
    // Convert any powder unit to grams
    const conversions = {
      'grams': 1,
      'kg': 1000,
      'oz': 28.3495,
      'lb': 453.592,
      'grains': 0.06479891,
    };
    return value * (conversions[unit] || 1);
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

    // Calculate powder cost using grams as base unit
    const chargeInGrams = convertToGrams(powderChargePerCartridge, formData.powder_unit);
    const powderStockInGrams = convertToGrams(powder.quantity_total, powder.unit);
    const costPerGram = powder.price_total / powderStockInGrams;
    const powderCostPerRound = chargeInGrams * costPerGram;
    const powderCost = powderCostPerRound * cartridgesLoaded;

    // DEBUG: powder cost
    console.log('💰 POWDER COST DEBUG:');
    console.log('Price total (£):', powder.price_total);
    console.log('Stock total (grams):', powderStockInGrams);
    console.log('Cost per gram (£):', costPerGram);
    console.log('Charge per round (grams):', chargeInGrams);
    console.log('Cost per round (£):', powderCostPerRound);
    console.log('Cost for batch (£):', powderCost);

    const primerCost = primer.cost_per_unit * cartridgesLoaded;
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
      costPerCartridge: parseFloat(costPerCartridge.toFixed(2)),
      powderUsed: parseFloat((chargeInGrams * cartridgesLoaded).toFixed(2)),
      powderDisplayed: parseFloat(powderChargePerCartridge.toFixed(2)),
    };
  };

  useEffect(() => {
    setCostBreakdown(calculateCosts());
  }, [formData.cartridges_loaded, formData.primer_id, formData.powder_id, formData.brass_id, formData.brass_is_used, formData.bullet_id, formData.powder_charge, formData.powder_unit, components]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError(null);

    // Validate stock before proceeding
    const validation = validateStock();
    if (!validation.valid) {
      setValidationError(validation.message);
      return;
    }

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

      // ===== POWDER DEDUCTION - ALL IN GRAMS =====
      const chargePerRoundInGrams = convertToGrams(parseFloat(formData.powder_charge), formData.powder_unit);
      const totalPowderUsedInGrams = chargePerRoundInGrams * cartridgesLoaded;

      // Convert stored stock to grams, perform deduction, convert back to stored unit
      const stockInGrams = convertToGrams(powder.quantity_total, powder.unit);
      let remainingInGrams = convertToGrams(powder.quantity_remaining, powder.unit) - totalPowderUsedInGrams;
      // Clamp to minimum 0
      remainingInGrams = Math.max(0, remainingInGrams);
      
      const unitConversions = {
        'grams': 1,
        'kg': 1000,
        'oz': 28.3495,
        'lb': 453.592,
        'grains': 0.06479891,
      };
      const powderUsed = totalPowderUsedInGrams / (unitConversions[powder.unit] || 1);
      const powderRemaining = remainingInGrams / (unitConversions[powder.unit] || 1);

      // DEBUG LOGS
      console.log('🔬 POWDER DEDUCTION DEBUG:');
      console.log('Stored unit:', powder.unit);
      console.log('Stored quantity_total:', powder.quantity_total);
      console.log('Stored quantity_remaining:', powder.quantity_remaining);
      console.log('Stock in grams:', stockInGrams);
      console.log('Remaining in grams:', remainingInGrams);
      console.log('Charge per round (grains):', formData.powder_charge);
      console.log('Charge per round (grams):', chargePerRoundInGrams);
      console.log('Total used (grams):', totalPowderUsedInGrams);
      console.log('Powder used (in stored unit):', powderUsed);
      console.log('Powder remaining (in stored unit):', powderRemaining);

      // Deduct from component stock (clamp to minimum 0)
      await Promise.all([
        base44.entities.ReloadingComponent.update(formData.primer_id, {
          quantity_remaining: Math.max(0, primer.quantity_remaining - cartridgesLoaded),
        }),
        base44.entities.ReloadingComponent.update(formData.powder_id, {
          quantity_remaining: powderRemaining,
        }),
        base44.entities.ReloadingComponent.update(formData.brass_id, {
          quantity_remaining: formData.brass_is_used ? brass.quantity_remaining : Math.max(0, brass.quantity_remaining - cartridgesLoaded),
        }),
        base44.entities.ReloadingComponent.update(formData.bullet_id, {
          quantity_remaining: Math.max(0, bullet.quantity_remaining - cartridgesLoaded),
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

      const createdSession = await base44.entities.ReloadingSession.create(reloadSession);

      // Find or create Ammunition entry for tracking
      const existingReloadedAmmo = await base44.entities.Ammunition.filter({
        created_by: user.email,
        brand: 'Reloaded',
        caliber: formData.caliber,
      });

      let ammoId;
      if (existingReloadedAmmo.length > 0) {
        ammoId = existingReloadedAmmo[0].id;
      } else {
        const newAmmo = await base44.entities.Ammunition.create({
          brand: 'Reloaded',
          caliber: formData.caliber,
          quantity_in_stock: cartridgesLoaded,
          units: 'rounds',
          cost_per_unit: costBreakdown.costPerCartridge,
          date_purchased: formData.date,
        });
        ammoId = newAmmo.id;
      }

      // Create AmmoSpending record to track this reloading session
      await base44.entities.AmmoSpending.create({
        ammunition_id: ammoId,
        brand: 'Reloaded',
        caliber: formData.caliber,
        quantity_used: cartridgesLoaded,
        cost_per_unit: costBreakdown.costPerCartridge,
        total_cost: costBreakdown.totalCost,
        date_used: formData.date,
        session_type: 'reloading',
        notes: `Reloaded batch ${formData.batch_number}`,
      });

      // Update ammunition inventory with loaded rounds
      await base44.entities.Ammunition.update(ammoId, {
        quantity_in_stock: (existingReloadedAmmo[0]?.quantity_in_stock || cartridgesLoaded) + cartridgesLoaded,
      });

      onSubmit();
    } catch (error) {
      console.error('Error creating reload batch:', error);
      alert('Error creating reload batch: ' + error.message);
    }
  };

  const handleAddBrassSaved = async (brassData) => {
    try {
      const newBrass = await base44.entities.ReloadingComponent.create(brassData);
      setComponents({
        ...components,
        brass: [...components.brass, newBrass],
      });
      setShowAddBrassModal(false);
      setFormData({ ...formData, brass_id: newBrass.id });
    } catch (error) {
      console.error('Error adding brass:', error);
    }
  };

  const handleCaliberSearch = (query) => {
    if (!query) {
      setCaliberResults([]);
      return;
    }
    const results = searchCalibers(query);
    setCaliberResults(results);
  };

  const checkStockWarnings = () => {
    const cartridgesLoaded = parseInt(formData.cartridges_loaded) || 0;
    const warnings = {};

    if (cartridgesLoaded <= 0) return warnings;

    const unitConversions = {
      'grams': 1,
      'kg': 1000,
      'oz': 28.3495,
      'lb': 453.592,
      'grains': 0.06479891,
    };

    // Check primer
    if (formData.primer_id) {
      const primer = components.primer.find(p => p.id === formData.primer_id);
      if (primer && primer.quantity_remaining < cartridgesLoaded) {
        warnings.primer = `Only ${primer.quantity_remaining} in stock`;
      }
    }

    // Check powder
    if (formData.powder_id && formData.powder_charge) {
      const powder = components.powder.find(p => p.id === formData.powder_id);
      if (powder) {
        const chargePerRoundInGrams = parseFloat(formData.powder_charge) * unitConversions[formData.powder_unit];
        const totalPowderNeededInGrams = chargePerRoundInGrams * cartridgesLoaded;
        const powderStockInGrams = powder.quantity_remaining * (unitConversions[powder.unit] || 1);

        if (powderStockInGrams < totalPowderNeededInGrams) {
          // Display remaining in original unit
          let displayRemaining = powder.quantity_remaining;
          let displayUnit = powder.unit;
          if (powder.unit === 'grams' && powder.quantity_remaining >= 1000) {
            displayRemaining = (powder.quantity_remaining / 1000).toFixed(2);
            displayUnit = 'kg';
          } else if (powder.unit === 'grams') {
            displayRemaining = powder.quantity_remaining.toFixed(2);
          }
          warnings.powder = `Only ${displayRemaining} ${displayUnit} in stock`;
        }
      }
    }

    // Check brass
    if (formData.brass_id && !formData.brass_is_used) {
      const brass = components.brass.find(b => b.id === formData.brass_id);
      if (brass && brass.quantity_remaining < cartridgesLoaded) {
        warnings.brass = `Only ${brass.quantity_remaining} in stock`;
      }
    }

    // Check bullet
    if (formData.bullet_id) {
      const bullet = components.bullet.find(b => b.id === formData.bullet_id);
      if (bullet && bullet.quantity_remaining < cartridgesLoaded) {
        warnings.bullet = `Only ${bullet.quantity_remaining} in stock`;
      }
    }

    return warnings;
  };

  useEffect(() => {
    setStockWarnings(checkStockWarnings());
  }, [formData.cartridges_loaded, formData.primer_id, formData.powder_id, formData.brass_id, formData.brass_is_used, formData.bullet_id, formData.powder_charge, formData.powder_unit, components]);

  const validateStock = () => {
    const cartridgesLoaded = parseInt(formData.cartridges_loaded) || 0;
    if (cartridgesLoaded <= 0) {
      return { valid: false, message: 'Enter cartridges to load' };
    }

    const primer = components.primer.find(p => p.id === formData.primer_id);
    const powder = components.powder.find(p => p.id === formData.powder_id);
    const brass = components.brass.find(b => b.id === formData.brass_id);
    const bullet = components.bullet.find(b => b.id === formData.bullet_id);

    // Primer validation
    if (!primer || primer.quantity_remaining < cartridgesLoaded) {
      return { valid: false, message: `Primer: only ${primer?.quantity_remaining || 0} in stock` };
    }

    // Powder validation
    if (!powder || powder.quantity_remaining <= 0) {
      return { valid: false, message: 'Powder: not in stock' };
    }

    const unitConversions = {
      'grams': 1,
      'kg': 1000,
      'oz': 28.3495,
      'lb': 453.592,
      'grains': 0.06479891,
    };
    const chargePerRoundInGrams = parseFloat(formData.powder_charge) * unitConversions[formData.powder_unit];
    const totalPowderNeededInGrams = chargePerRoundInGrams * cartridgesLoaded;
    const powderStockInGrams = powder.quantity_remaining * (unitConversions[powder.unit] || 1);

    if (powderStockInGrams < totalPowderNeededInGrams) {
      return { valid: false, message: 'Powder: not enough in stock' };
    }

    // Brass validation
    if (!brass || (brass.quantity_remaining < cartridgesLoaded && !formData.brass_is_used)) {
      return { valid: false, message: `Brass: only ${brass?.quantity_remaining || 0} in stock` };
    }

    // Bullet validation
    if (!bullet || bullet.quantity_remaining < cartridgesLoaded) {
      return { valid: false, message: `Bullet: only ${bullet?.quantity_remaining || 0} in stock` };
    }

    return { valid: true };
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
      {validationError && (
       <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm font-medium">
         {validationError}
       </div>
      )}
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
          <div className="relative">
            <label className={labelCls}>Caliber</label>
            <div className="relative">
              <input
                type="text"
                value={formData.caliber}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData({ ...formData, caliber: val });
                  handleCaliberSearch(val);
                  setShowCaliberDropdown(true);
                }}
                onFocus={() => setShowCaliberDropdown(formData.caliber.length >= 1)}
                placeholder=".308 Win"
                className={inputCls}
                required
              />
              {showCaliberDropdown && caliberResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                  {caliberResults.map((caliber, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, caliber });
                        setShowCaliberDropdown(false);
                        setCaliberResults([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-secondary border-b border-border last:border-b-0 text-sm"
                    >
                      {caliber}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
          <select value={formData.primer_id} onChange={(e) => setFormData({ ...formData, primer_id: e.target.value })} className={inputCls} required>
            <option value="">Select primer</option>
            {components.primer.map(p => <option key={p.id} value={p.id}>{p.name} - {p.quantity_remaining} in stock (£{p.cost_per_unit.toFixed(4)}/ea)</option>)}
          </select>
          {stockWarnings.primer && (
            <p className="text-xs text-destructive font-semibold mt-1.5">{stockWarnings.primer}</p>
          )}
        </div>

        <div>
          <label className={labelCls}>Powder</label>
          <select value={formData.powder_id} onChange={(e) => setFormData({ ...formData, powder_id: e.target.value })} className={inputCls} required>
            <option value="">Select powder</option>
            {components.powder.map(p => {
              // Display powder with normalized unit
              let displayUnit = p.unit;
              let displayRemaining = p.quantity_remaining;
              if (p.unit === 'grams' && p.quantity_remaining >= 1000) {
                displayUnit = 'kg';
                displayRemaining = (p.quantity_remaining / 1000).toFixed(2);
              } else if (p.unit === 'grams') {
                displayRemaining = p.quantity_remaining.toFixed(2);
              }
              return <option key={p.id} value={p.id}>{p.name} - {displayRemaining} {displayUnit} remaining (£{p.cost_per_unit.toFixed(4)}/g)</option>;
            })}
          </select>
          {stockWarnings.powder && (
            <p className="text-xs text-destructive font-semibold mt-1.5">{stockWarnings.powder}</p>
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
          <div className="flex gap-2">
            <select value={formData.brass_id} onChange={(e) => setFormData({ ...formData, brass_id: e.target.value })} className={`${inputCls} flex-1`} required>
              <option value="">Select brass</option>
              {components.brass.map(b => <option key={b.id} value={b.id}>{b.name} - {b.quantity_remaining} in stock (£{b.cost_per_unit.toFixed(4)}/ea)</option>)}
            </select>
            <button
              type="button"
              onClick={() => setShowAddBrassModal(true)}
              className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 flex items-center gap-1 font-medium text-sm whitespace-nowrap"
              title="Add new brass"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          {stockWarnings.brass && (
            <p className="text-xs text-destructive font-semibold mt-1.5">{stockWarnings.brass}</p>
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
          <select value={formData.bullet_id} onChange={(e) => setFormData({ ...formData, bullet_id: e.target.value })} className={inputCls} required>
            <option value="">Select bullet</option>
            {components.bullet.map(b => <option key={b.id} value={b.id}>{b.name} - {b.quantity_remaining} in stock (£{b.cost_per_unit.toFixed(4)}/ea)</option>)}
          </select>
          {stockWarnings.bullet && (
            <p className="text-xs text-destructive font-semibold mt-1.5">{stockWarnings.bullet}</p>
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
              <div className="text-xs text-muted-foreground">£{costBreakdown.costPerCartridge.toFixed(2)} per cartridge</div>
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

      {/* Add Brass Modal */}
      <AddBrassModal
        isOpen={showAddBrassModal}
        onClose={() => setShowAddBrassModal(false)}
        onSave={handleAddBrassSaved}
      />
    </div>
  );
}