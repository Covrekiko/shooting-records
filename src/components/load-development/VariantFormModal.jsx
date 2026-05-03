import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import GlobalModal, { ModalSaveButton, ModalCancelButton } from '@/components/ui/GlobalModal.jsx';
import BulletDetailsCard from '@/components/reloading/BulletDetailsCard';
import PrimerDetailsCard from '@/components/reloading/PrimerDetailsCard';

export default function VariantFormModal({ open, test, variant, variantCount, onClose, onSaved }) {
  const [components, setComponents] = useState({ powder: [], bullet: [], brass: [], primer: [] });
  const [form, setForm] = useState({
    label: '',
    round_count: '',
    powder_name: '',
    powder_component_id: '',
    powder_charge_grains: '',
    bullet_brand: test.bullet_brand || '',
    bullet_name: '',
    bullet_grains: '',
    bullet_component_id: '',
    bullet_entry_mode: '',
    bullet_quantity_used: '',
    brass_brand: test.brass_brand || '',
    brass_component_id: '',
    brass_quantity_used: '',
    primer_brand: test.primer_brand || '',
    primer_component_id: '',
    primer_quantity_used: '',
    seating_depth: '',
    coal_oal: '',
    cbto: '',
    bullet_jump: '',
    neck_tension: '',
    crimp: '',
    case_trim_length: '',
    case_prep_notes: '',
    annealed: false,
    notes: '',
    deduct_stock: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (variant) setForm({ ...form, ...variant, deduct_stock: false });
    loadComponents();
  }, []);

  const loadComponents = async () => {
    const user = await base44.auth.me();
    const comps = await base44.entities.ReloadingComponent.filter({ created_by: user.email });
    setComponents({
      powder: comps.filter(c => c.component_type === 'powder'),
      bullet: comps.filter(c => c.component_type === 'bullet'),
      brass: comps.filter(c => c.component_type === 'brass'),
      primer: comps.filter(c => c.component_type === 'primer'),
    });
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleComponentSelect = (type, id) => {
    const comp = components[type].find(c => c.id === id);
    set(`${type}_component_id`, id);
    if (comp) {
      if (type === 'powder') set('powder_name', comp.name);
      if (type === 'bullet') set('bullet_brand', [comp.brand, comp.name].filter(Boolean).join(' ') || comp.name);
      if (type === 'brass') set('brass_brand', comp.brand || comp.name);
      if (type === 'primer') set('primer_brand', comp.brand || comp.name);
    }
  };

  const handleBulletSelect = (value) => {
    if (!value) {
      setForm(f => ({ ...f, bullet_entry_mode: '', bullet_component_id: '' }));
      return;
    }
    if (value === 'manual') {
      setForm(f => ({ ...f, bullet_entry_mode: 'manual', bullet_component_id: '' }));
      return;
    }
    const comp = components.bullet.find(c => c.id === value);
    setForm(f => ({
      ...f,
      bullet_entry_mode: 'stock',
      bullet_component_id: value,
      bullet_brand: comp ? [comp.brand, comp.name].filter(Boolean).join(' ') || comp.name : f.bullet_brand,
    }));
  };

  const autoLabel = () => {
    const parts = [];
    if (form.powder_name) parts.push(form.powder_name);
    if (form.powder_charge_grains) parts.push(`${form.powder_charge_grains}gr`);
    if (parts.length === 0) parts.push(`Variant ${variantCount + 1}`);
    set('label', parts.join(' – '));
  };

  const handleSubmit = async () => {
    if (!form.label.trim()) return alert('Label is required.');
    setSaving(true);
    try {
      const user = await base44.auth.me();
      const payload = {
        test_id: test.id,
        label: form.label,
        round_count: parseInt(form.round_count) || 0,
        powder_name: form.powder_name,
        powder_component_id: form.powder_component_id,
        powder_charge_grains: parseFloat(form.powder_charge_grains) || 0,
        bullet_brand: form.bullet_entry_mode === 'manual'
          ? [form.bullet_brand, form.bullet_name, form.bullet_grains ? `${form.bullet_grains}gr` : ''].filter(Boolean).join(' ')
          : form.bullet_brand,
        bullet_component_id: form.bullet_component_id,
        bullet_quantity_used: parseInt(form.bullet_quantity_used) || 0,
        brass_brand: form.brass_brand,
        brass_component_id: form.brass_component_id,
        brass_quantity_used: parseInt(form.brass_quantity_used) || 0,
        primer_brand: form.primer_brand,
        primer_component_id: form.primer_component_id,
        primer_quantity_used: parseInt(form.primer_quantity_used) || 0,
        seating_depth: form.seating_depth,
        coal_oal: form.coal_oal,
        cbto: form.cbto,
        bullet_jump: form.bullet_jump,
        neck_tension: form.neck_tension,
        crimp: form.crimp,
        case_trim_length: form.case_trim_length,
        case_prep_notes: form.case_prep_notes,
        annealed: form.annealed,
        notes: form.notes,
        stock_deducted: variant?.stock_deducted || false,
      };

      // Deduct stock if requested and not already done
      if (form.deduct_stock && !variant?.stock_deducted) {
        const gramsPerGrain = 0.06479891;
        const roundCount = parseInt(form.round_count) || 0;

        const deductComp = async (componentId, qty, isPowder, chargeGrains) => {
          if (!componentId || qty <= 0) return;
          const comp = await base44.entities.ReloadingComponent.filter({ created_by: user.email })
            .then(list => list.find(c => c.id === componentId));
          if (!comp) return;
          if (isPowder) {
            const usedGrams = chargeGrains * qty * gramsPerGrain;
            await base44.entities.ReloadingComponent.update(componentId, {
              quantity_remaining: Math.max(0, comp.quantity_remaining - usedGrams),
            });
          } else {
            await base44.entities.ReloadingComponent.update(componentId, {
              quantity_remaining: Math.max(0, comp.quantity_remaining - qty),
            });
          }
        };

        await Promise.all([
          deductComp(form.powder_component_id, roundCount, true, parseFloat(form.powder_charge_grains) || 0),
          deductComp(form.bullet_component_id, parseInt(form.bullet_quantity_used) || roundCount, false),
          deductComp(form.primer_component_id, parseInt(form.primer_quantity_used) || roundCount, false),
          deductComp(form.brass_component_id, parseInt(form.brass_quantity_used) || 0, false),
        ]);

        payload.stock_deducted = true;
      }

      if (variant) {
        await base44.entities.ReloadingTestVariant.update(variant.id, payload);
      } else {
        await base44.entities.ReloadingTestVariant.create(payload);
        // Increment variant count on parent test
        const currentTest = await base44.entities.ReloadingTest.filter({ id: test.id }).then(r => r[0]).catch(() => null);
        await base44.entities.ReloadingTest.update(test.id, {
          variant_count: (currentTest?.variant_count || 0) + 1,
        });
      }
      onSaved();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlobalModal
      open={open}
      onClose={onClose}
      title={variant ? 'Edit Variant' : 'Add Variant'}
      maxWidth="max-w-xl"
      footer={
        <>
          <ModalCancelButton onClick={onClose}>Cancel</ModalCancelButton>
          <ModalSaveButton onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : variant ? 'Save Changes' : 'Add Variant'}
          </ModalSaveButton>
        </>
      }
    >
      <div className="space-y-4">
        {/* Label */}
        <div>
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Variant Label *</label>
          <div className="flex gap-2">
            <input value={form.label} onChange={e => set('label', e.target.value)} placeholder="e.g. N160 – 41.0gr"
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
            <button onClick={autoLabel} className="px-3 py-2 text-xs bg-secondary rounded-lg font-medium hover:bg-secondary/80">Auto</button>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Round Count</label>
          <input
            value={form.round_count ?? ''}
            onChange={e => {
              const val = e.target.value;
              setForm(f => ({
                ...f,
                round_count: val,
                bullet_quantity_used: val,
                primer_quantity_used: val,
                brass_quantity_used: val,
              }));
            }}
            type="number" placeholder="20"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none"
          />
          {form.round_count && <p className="text-[10px] text-muted-foreground mt-1">Bullet, primer and brass quantities auto-set to {form.round_count}</p>}
        </div>

        {/* Powder */}
        <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase">Powder</p>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Select Powder from Stock</label>
            <select value={form.powder_component_id} onChange={e => handleComponentSelect('powder', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
              <option value="">— Select —</option>
              {components.powder.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.quantity_remaining?.toFixed(1)} {c.unit} remaining)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Powder Name (or type manually)</label>
            <input value={form.powder_name ?? ''} onChange={e => set('powder_name', e.target.value)} placeholder="e.g. Vihtavuori N160"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Charge (grains)</label>
            <input value={form.powder_charge_grains ?? ''} onChange={e => set('powder_charge_grains', e.target.value)} type="number" step="0.1" placeholder="41.0"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
          </div>
        </div>

        {/* Bullet */}
        <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase">Bullet</p>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Select Bullet</label>
            <select value={form.bullet_entry_mode === 'manual' ? 'manual' : form.bullet_component_id} onChange={e => handleBulletSelect(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
              <option value="">Select bullet…</option>
              <option value="manual">Manual Entry</option>
              {components.bullet.filter(c => (c.quantity_remaining || 0) > 0).map(c => (
                <option key={c.id} value={c.id}>{[c.brand, c.name].filter(Boolean).join(' ') || 'Bullet'} ({c.quantity_remaining} remaining)</option>
              ))}
            </select>
          </div>
          <BulletDetailsCard bullet={components.bullet.find(b => b.id === form.bullet_component_id)} />
          {form.bullet_entry_mode === 'manual' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Bullet Brand</label>
                <input value={form.bullet_brand ?? ''} onChange={e => set('bullet_brand', e.target.value)} placeholder="e.g. Berger"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Bullet Name</label>
                <input value={form.bullet_name ?? ''} onChange={e => set('bullet_name', e.target.value)} placeholder="e.g. VLD"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Grains</label>
                <input value={form.bullet_grains ?? ''} onChange={e => set('bullet_grains', e.target.value)} type="number" placeholder="175"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Quantity Used</label>
            <input value={form.bullet_quantity_used ?? ''} onChange={e => set('bullet_quantity_used', e.target.value)} type="number" placeholder="20"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
          </div>
        </div>

        {/* Primer */}
        <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase">Primer</p>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Select Primer from Stock</label>
            <select value={form.primer_component_id} onChange={e => handleComponentSelect('primer', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
              <option value="">— Select —</option>
              {components.primer.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.quantity_remaining} remaining)</option>
              ))}
            </select>
          </div>
          <PrimerDetailsCard primer={components.primer.find(p => p.id === form.primer_component_id)} />
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Primer Brand / Model</label>
            <input value={form.primer_brand ?? ''} onChange={e => set('primer_brand', e.target.value)} placeholder="e.g. CCI BR2"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Quantity Used</label>
            <input value={form.primer_quantity_used ?? ''} onChange={e => set('primer_quantity_used', e.target.value)} type="number" placeholder="20"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
          </div>
        </div>

        {/* Brass */}
        <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase">Brass</p>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Select Brass from Stock</label>
            <select value={form.brass_component_id} onChange={e => handleComponentSelect('brass', e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none">
              <option value="">— Select —</option>
              {components.brass.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.quantity_remaining} remaining)</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Brass Brand</label>
            <input value={form.brass_brand ?? ''} onChange={e => set('brass_brand', e.target.value)} placeholder="e.g. Lapua"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Quantity Used</label>
            <input value={form.brass_quantity_used ?? ''} onChange={e => set('brass_quantity_used', e.target.value)} type="number" placeholder="20"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
          </div>
        </div>

        {/* Load Data */}
        <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase">Load / Seating Data</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['OAL / COAL', 'coal_oal', '2.800"'],
              ['CBTO', 'cbto', '1.910"'],
              ['Seating Depth', 'seating_depth', '0.010"'],
              ['Bullet Jump', 'bullet_jump', '0.020"'],
              ['Neck Tension', 'neck_tension', '0.002"'],
              ['Case Trim Length', 'case_trim_length', '2.005"'],
            ].map(([label, field, placeholder]) => (
              <div key={field}>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">{label}</label>
                <input value={form[field] ?? ''} onChange={e => set(field, e.target.value)} placeholder={placeholder}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Case Prep Notes</label>
            <input value={form.case_prep_notes ?? ''} onChange={e => set('case_prep_notes', e.target.value)} placeholder="Full prep, deburred..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.annealed} onChange={e => set('annealed', e.target.checked)}
              className="w-4 h-4 rounded" />
            <span className="text-sm">Annealed</span>
          </label>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">Notes</label>
          <textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={2}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none resize-none" />
        </div>

        {/* Stock Deduction */}
        {!variant?.stock_deducted && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={form.deduct_stock} onChange={e => set('deduct_stock', e.target.checked)}
                className="w-4 h-4 rounded mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Deduct stock from inventory</p>
                <p className="text-xs text-muted-foreground mt-0.5">Removes components from your ReloadingComponent stock. Can be restored by deleting the variant.</p>
              </div>
            </label>
          </div>
        )}
        {variant?.stock_deducted && (
          <p className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/20 rounded-lg px-3 py-2">Stock already deducted for this variant.</p>
        )}

      </div>
    </GlobalModal>
  );
}