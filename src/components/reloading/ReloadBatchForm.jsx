import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
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
    used_brass_id: '',
    override_brass_limit: false,
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
    const brassLookupId = formData.brass_is_used ? formData.used_brass_id : formData.brass_id;
    const brass = components.brass.find(c => c.id === brassLookupId);
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
  }, [formData.cartridges_loaded, formData.primer_id, formData.powder_id, formData.brass_id, formData.brass_is_used, formData.used_brass_id, formData.bullet_id, formData.powder_charge, formData.powder_unit, components]);

  const handleOpenAddBrassModal = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAddBrassModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const submitter = e.nativeEvent?.submitter;
    if (!submitter || submitter.dataset.action !== 'create-reload-batch') {
      return;
    }

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
      const brassLookupId = formData.brass_is_used ? formData.used_brass_id : formData.brass_id;
      const brass = components.brass.find(c => c.id === brassLookupId);
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
      // Used brass: deduct stock AND increment times_reloaded (same as new brass for stock)
      const brassUpdate = formData.brass_is_used
        ? {
            quantity_remaining: Math.max(0, (brass.quantity_remaining ?? brass.quantity_total) - cartridgesLoaded),
            times_reloaded: (brass.times_reloaded || 0) + 1,
          }
        : { quantity_remaining: Math.max(0, brass.quantity_remaining - cartridgesLoaded) };

      await Promise.all([
        base44.entities.ReloadingComponent.update(formData.primer_id, {
          quantity_remaining: Math.max(0, primer.quantity_remaining - cartridgesLoaded),
        }),
        base44.entities.ReloadingComponent.update(formData.powder_id, {
          quantity_remaining: powderRemaining,
        }),
        base44.entities.ReloadingComponent.update(brassLookupId, brassUpdate),
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
          { type: 'primer', component_id: formData.primer_id, name: primer.name, quantity_used: cartridgesLoaded, cost: costBreakdown.primerCost },
          { type: 'powder', component_id: formData.powder_id, name: powder.name, quantity_used: powderUsed, unit: powder.unit, cost: costBreakdown.powderCost },
          { type: 'brass', component_id: brassLookupId, name: brass.name, quantity_used: cartridgesLoaded, cost: costBreakdown.brassCost, is_used_brass: formData.brass_is_used },
          { type: 'bullet', component_id: formData.bullet_id, name: bullet.name, quantity_used: cartridgesLoaded, cost: costBreakdown.bulletCost },
        ],
        notes: formData.notes,
      };

      const createdSession = await base44.entities.ReloadingSession.create(reloadSession);

      // Create a unique Ammunition entry per reload batch — tagged with reload_batch:<id> for reliable reversal
      const bulletComp = components.bullet.find(c => c.id === formData.bullet_id);
      const bulletLabel = bulletComp ? (bulletComp.bullet_name || bulletComp.name) : '';
      const batchBrand = 'Reloaded';
      const batchBulletType = bulletLabel || 'Custom';
      const batchNotes = `reload_batch:${createdSession.id} | Batch ${formData.batch_number}${bulletLabel ? ` | ${bulletLabel}` : ''}`;

      // Check if an entry for this exact batch already exists (idempotency guard)
      const existingBatchAmmo = await base44.entities.Ammunition.filter({ created_by: user.email });
      const batchEntry = existingBatchAmmo.find(a => a.notes && a.notes.includes(`reload_batch:${createdSession.id}`));

      console.log(`[RELOAD DEBUG] batch created = ${formData.batch_number}`);
      console.log(`[RELOAD DEBUG] caliber = ${formData.caliber}`);
      console.log(`[RELOAD DEBUG] quantity produced = ${cartridgesLoaded}`);
      console.log(`[RELOAD DEBUG] global ammo stock item created = ${batchEntry ? 'existing (duplicate guard)' : 'new'}`);

      if (batchEntry) {
        // Duplicate submit guard — top up
        await base44.entities.Ammunition.update(batchEntry.id, {
          quantity_in_stock: (batchEntry.quantity_in_stock || 0) + cartridgesLoaded,
          cost_per_unit: costBreakdown.costPerCartridge,
        });
        console.log(`[RELOAD DEBUG] ammoStockItemId = ${batchEntry.id}`);
        console.log(`[RELOAD DEBUG] stock quantity added = ${cartridgesLoaded} (topped up)`);
      } else {
        // New entry for this batch — with stable linking fields (FIX 4)
        const newAmmo = await base44.entities.Ammunition.create({
          brand: batchBrand,
          caliber: formData.caliber,
          bullet_type: batchBulletType,
          grain: bulletComp?.weight ? String(bulletComp.weight) : '',
          quantity_in_stock: cartridgesLoaded,
          units: 'rounds',
          cost_per_unit: costBreakdown.costPerCartridge,
          date_purchased: formData.date,
          low_stock_threshold: 10,
          notes: batchNotes,
          // FIX 4: Stable fields for reliable linking
          ammo_type: 'reloaded',
          source_type: 'reload_batch',
          source_id: createdSession.id,
          reload_session_id: createdSession.id,
          batch_number: formData.batch_number,
        });
        console.log(`[RELOAD DEBUG] ammoStockItemId = ${newAmmo.id}`);
        console.log(`[RELOAD DEBUG] stock quantity added = ${cartridgesLoaded}`);
        console.log(`[RELOAD DEBUG] appears in ammo selector query = true (brand=Reloaded, caliber=${formData.caliber})`);
      }

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

    // Check brass (new)
    if (!formData.brass_is_used && formData.brass_id) {
      const brass = components.brass.find(b => b.id === formData.brass_id);
      if (brass && brass.quantity_remaining < cartridgesLoaded) {
        warnings.brass = `Only ${brass.quantity_remaining} in stock`;
      }
    }
    // Check used brass stock
    if (formData.brass_is_used && formData.used_brass_id) {
      const brass = components.brass.find(b => b.id === formData.used_brass_id);
      if (brass) {
        const remaining = brass.quantity_remaining ?? brass.quantity_total;
        if (remaining < cartridgesLoaded) {
          warnings.brass = `Only ${remaining} used brass in stock`;
        }
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
  }, [formData.cartridges_loaded, formData.primer_id, formData.powder_id, formData.brass_id, formData.brass_is_used, formData.used_brass_id, formData.bullet_id, formData.powder_charge, formData.powder_unit, components]);

  const validateStock = () => {
    const cartridgesLoaded = parseInt(formData.cartridges_loaded) || 0;
    if (cartridgesLoaded <= 0) {
      return { valid: false, message: 'Enter cartridges to load' };
    }

    const primer = components.primer.find(p => p.id === formData.primer_id);
    const powder = components.powder.find(p => p.id === formData.powder_id);
    const brassValidationId = formData.brass_is_used ? formData.used_brass_id : formData.brass_id;
    const brass = components.brass.find(b => b.id === brassValidationId);
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
    if (formData.brass_is_used) {
      if (!brass) return { valid: false, message: 'Please select your used brass' };
      const remaining = brass.quantity_remaining ?? brass.quantity_total;
      if (remaining < cartridgesLoaded) {
        return { valid: false, message: `Used brass: only ${remaining} in stock` };
      }
      const maxLimit = brass.max_reloads || 0;
      if (maxLimit > 0 && (brass.times_reloaded || 0) >= maxLimit && !formData.override_brass_limit) {
        return { valid: false, message: `This brass has reached its reload limit (${brass.times_reloaded}/${maxLimit}). Tick "Use anyway" to override.` };
      }
    } else {
      if (!brass || brass.quantity_remaining < cartridgesLoaded) {
        return { valid: false, message: `Brass: only ${brass?.quantity_remaining || 0} in stock` };
      }
    }

    // Bullet validation
    if (!bullet || bullet.quantity_remaining < cartridgesLoaded) {
      return { valid: false, message: `Bullet: only ${bullet?.quantity_remaining || 0} in stock` };
    }

    return { valid: true };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full min-w-0">
      {validationError && (
       <div className="border border-destructive rounded-lg p-3 text-sm font-medium bg-destructive/10 text-destructive">
         {validationError}
       </div>
      )}
      <form id="reload-batch-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3.5 py-3 border border-input bg-background text-foreground rounded-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
              required
            />
          </div>
          <div className="relative">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">Caliber</label>
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
                className="w-full px-3.5 py-3 border border-input bg-background text-foreground rounded-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
                required
              />
              {showCaliberDropdown && caliberResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto bg-card border border-border">
                  {caliberResults.map((caliber, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, caliber });
                        setShowCaliberDropdown(false);
                        setCaliberResults([]);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors border-b border-border last:border-b-0 text-sm text-foreground"
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
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">Batch Number</label>
          <input type="text" value={formData.batch_number} onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })} className="w-full px-3.5 py-3 border border-input bg-background text-foreground rounded-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none" required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">Rifle (optional)</label>
            <select value={formData.rifle_id} onChange={(e) => setFormData({ ...formData, rifle_id: e.target.value })} className="w-full px-3.5 py-3 border border-input bg-background text-foreground rounded-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none">
              <option value="">None</option>
              {rifles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">Cartridges to Load</label>
            <input
              type="number"
              inputMode="numeric"
              value={formData.cartridges_loaded}
              onChange={(e) => setFormData({ ...formData, cartridges_loaded: e.target.value })}
              className="w-full px-3.5 py-3 border border-input bg-background text-foreground rounded-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
              placeholder="100"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">Primer</label>
          <select value={formData.primer_id} onChange={(e) => setFormData({ ...formData, primer_id: e.target.value })} className="w-full px-3.5 py-3 border border-input bg-background text-foreground rounded-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none" required>
            <option value="">Select primer</option>
            {components.primer.map(p => <option key={p.id} value={p.id}>{p.name} - {p.quantity_remaining} in stock (£{p.cost_per_unit.toFixed(4)}/ea)</option>)}
          </select>
          {stockWarnings.primer && (
            <p className="text-xs font-semibold mt-2.5 text-destructive">{stockWarnings.primer}</p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">Powder</label>
          <select value={formData.powder_id} onChange={(e) => setFormData({ ...formData, powder_id: e.target.value })} className="w-full px-3.5 py-3 border border-input bg-background text-foreground rounded-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none" required>
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
             <p className="text-xs font-semibold mt-2.5 text-destructive">{stockWarnings.powder}</p>
           )}
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">Powder Charge & Unit</label>
          <div className="flex gap-2">
            <input
               type="number"
               inputMode="decimal"
               value={formData.powder_charge}
               onChange={(e) => setFormData({ ...formData, powder_charge: e.target.value })}
               className="flex-1 min-w-0 px-3.5 py-3 border border-input bg-background text-foreground rounded-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
               placeholder="40.0"
               step="0.1"
               required
             />
             <select
               value={formData.powder_unit}
               onChange={(e) => setFormData({ ...formData, powder_unit: e.target.value })}
               className="flex-shrink-0 w-28 px-3 py-3 border border-input bg-background text-foreground rounded-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none font-medium"
             >
              <option value="grains">grains</option>
              <option value="grams">grams</option>
            </select>
          </div>
        </div>

        {/* Brass section: two separate selects for new vs used */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">New Brass</label>
            <div className="flex gap-2">
              <select
                value={formData.brass_is_used ? '' : formData.brass_id}
                onChange={(e) => setFormData({ ...formData, brass_id: e.target.value, brass_is_used: false, used_brass_id: '' })}
                className="w-full px-3.5 py-3 border border-input bg-background text-foreground rounded-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none flex-1"
              >
                <option value="">— Select new brass —</option>
                {components.brass.filter(b => !b.is_used_brass).map(b => (
                  <option key={b.id} value={b.id}>{b.name}{b.caliber ? ` (${b.caliber})` : ''} — {b.quantity_remaining} in stock (£{b.cost_per_unit.toFixed(4)}/ea)</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleOpenAddBrassModal}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-85 flex items-center gap-1.5 font-medium text-sm whitespace-nowrap transition-opacity"
                title="Add new brass"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            {!formData.brass_is_used && stockWarnings.brass && (
               <p className="text-xs font-semibold mt-2.5 text-destructive">{stockWarnings.brass}</p>
             )}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
             <div className="flex-1 border-t border-border" />
             <span>or</span>
             <div className="flex-1 border-t border-border" />
           </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">Used Brass (previously fired)</label>
            <select
              value={formData.brass_is_used ? formData.used_brass_id : ''}
              onChange={(e) => setFormData({ ...formData, used_brass_id: e.target.value, brass_is_used: !!e.target.value, brass_id: '', override_brass_limit: false })}
              className="w-full px-3.5 py-3 border border-input bg-background text-foreground rounded-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
            >
              <option value="">— Select used brass —</option>
              {components.brass.filter(b => b.is_used_brass).map(b => (
                <option key={b.id} value={b.id}>
                  {b.name}{b.caliber ? ` (${b.caliber})` : ''}{b.batch_number ? ` #${b.batch_number}` : ''} — {b.quantity_remaining ?? b.quantity_total} in stock, reloaded {b.times_reloaded || 0}x
                </option>
              ))}
            </select>
            {formData.brass_is_used && stockWarnings.brass && (
               <p className="text-xs font-semibold mt-2.5 text-destructive">{stockWarnings.brass}</p>
             )}
              {formData.used_brass_id && (() => {
                const selectedBrass = components.brass.find(b => b.id === formData.used_brass_id);
                if (!selectedBrass) return null;
                const reloaded = selectedBrass.times_reloaded || 0;
                const maxLimit = selectedBrass.max_reloads || 0;
                const willBe = reloaded + 1;
                const atLimit = maxLimit > 0 && reloaded >= maxLimit;
                const willHitLimit = maxLimit > 0 && willBe >= maxLimit;

                return (
                   <div className="mt-3 space-y-2.5">
                     {atLimit ? (
                       <div className="border border-destructive rounded-lg p-3.5 text-xs font-semibold flex items-start gap-2.5 bg-destructive/10 text-destructive">
                         <span className="text-base leading-none mt-0.5">⚠️</span>
                         <div className="flex-1">
                           <p>This brass has reached its reload limit ({reloaded}/{maxLimit}).</p>
                           <p className="font-normal mt-1">Consider retiring or trimming it first, then reset the counter in Manage Components.</p>
                           <label className="flex items-center gap-2 mt-2.5 cursor-pointer font-normal hover:opacity-80 transition-opacity">
                             <input
                               type="checkbox"
                               checked={formData.override_brass_limit}
                               onChange={(e) => setFormData({ ...formData, override_brass_limit: e.target.checked })}
                               className="w-3.5 h-3.5 rounded"
                             />
                             Use anyway (I know what I'm doing)
                           </label>
                         </div>
                       </div>
                     ) : willHitLimit ? (
                       <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                         ⚠️ This batch will bring brass to its limit ({willBe}/{maxLimit}). Consider trimming after this reload.
                       </p>
                     ) : (
                       <p className="text-xs text-muted-foreground">
                         Reloaded <span className="font-bold text-foreground">{reloaded}</span>x
                         {maxLimit > 0 ? ` / limit ${maxLimit}` : ''} → will be <span className="font-bold text-foreground">{willBe}</span> after this batch.
                       </p>
                     )}
                   </div>
                 );
              })()}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">Bullet</label>
          <select value={formData.bullet_id} onChange={(e) => setFormData({ ...formData, bullet_id: e.target.value })} className="w-full px-3.5 py-3 border border-input bg-background text-foreground rounded-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none" required>
            <option value="">Select bullet</option>
            {components.bullet.map(b => <option key={b.id} value={b.id}>{b.name} - {b.quantity_remaining} in stock (£{b.cost_per_unit.toFixed(4)}/ea)</option>)}
          </select>
          {stockWarnings.bullet && (
             <p className="text-xs font-semibold mt-2.5 text-destructive">{stockWarnings.bullet}</p>
           )}
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5 block">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3.5 py-3 border border-input bg-background text-foreground rounded-lg transition-all focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none"
            placeholder="Batch notes"
            rows="2"
          />
        </div>

        {/* Cost Breakdown */}
         {costBreakdown && (
           <div className="rounded-lg p-5 space-y-3.5 bg-muted border border-border">
             <h4 className="font-bold text-sm text-foreground">Cost Breakdown</h4>
             <div className="grid grid-cols-2 gap-3 text-sm">
               <div><span className="text-muted-foreground">Primers:</span> <span className="font-semibold ml-2 text-foreground">£{costBreakdown.primerCost.toFixed(2)}</span></div>
               <div><span className="text-muted-foreground">Powder:</span> <span className="font-semibold ml-2 text-foreground">£{costBreakdown.powderCost.toFixed(2)}</span></div>
               <div><span className="text-muted-foreground">Brass:</span> <span className="font-semibold ml-2 text-foreground">£{costBreakdown.brassCost.toFixed(2)}</span></div>
               <div><span className="text-muted-foreground">Bullets:</span> <span className="font-semibold ml-2 text-foreground">£{costBreakdown.bulletCost.toFixed(2)}</span></div>
             </div>
             <div className="border-t border-border pt-3.5 mt-3.5">
               <div className="text-lg font-bold text-primary">Total: £{costBreakdown.totalCost.toFixed(2)}</div>
               <div className="text-xs mt-1.5 text-muted-foreground">£{costBreakdown.costPerCartridge.toFixed(2)} per cartridge</div>
             </div>
           </div>
         )}
        <div className="pt-2 flex gap-3">
          <button
            form="reload-batch-form"
            type="submit"
            data-action="create-reload-batch"
            className="flex-1 h-11 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all"
          >
            Create Batch
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl font-semibold text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>
      </form>

      <AddBrassModal
        isOpen={showAddBrassModal}
        onClose={() => setShowAddBrassModal(false)}
        onSave={handleAddBrassSaved}
      />
    </div>
  );
}