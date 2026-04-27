import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const inp = 'w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';
const lbl = 'block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1';

export default function BulletForm({ item, onSaved, onClose }) {
  const [form, setForm] = useState(item || {
    manufacturer: '', bullet_name: '', bullet_family: '', caliber: '',
    diameter_inch: '', diameter_mm: '', weight_grains: '', weight_grams: '',
    bullet_type: '', bullet_construction: '', bullet_material: '', lead_free: false,
    hunting_or_match: '', recommended_use: '',
    ballistic_coefficient_g1: '', ballistic_coefficient_g7: '',
    bc_model: '', bc_velocity_band_notes: '', drag_model_notes: '',
    sectional_density: '', bullet_length_mm: '', minimum_twist_rate: '',
    boat_tail: false, flat_base: false, polymer_tip: false,
    hollow_point: false, soft_point: false, bonded: false,
    monolithic: false, tipped: false, cannelure: false,
    manufacturer_sku: '', official_product_url: '',
    source_name: '', source_date_checked: '', data_confidence: 'Medium', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.manufacturer || !form.caliber || !form.weight_grains) {
      alert('Manufacturer, caliber and weight are required');
      return;
    }
    setSaving(true);
    const payload = { ...form };
    // Convert numeric strings
    ['diameter_inch','diameter_mm','weight_grains','weight_grams','ballistic_coefficient_g1',
     'ballistic_coefficient_g7','sectional_density','bullet_length_mm'].forEach(k => {
      if (payload[k] !== '' && payload[k] !== null && payload[k] !== undefined) {
        payload[k] = parseFloat(payload[k]) || undefined;
      } else {
        delete payload[k];
      }
    });
    if (item?.id) {
      await base44.entities.BulletReference.update(item.id, payload);
    } else {
      await base44.entities.BulletReference.create(payload);
    }
    setSaving(false);
    onSaved();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60000] bg-black/60 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-card w-full md:max-w-2xl rounded-t-3xl md:rounded-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-bold text-lg">{item ? 'Edit Bullet' : 'Add Bullet Reference'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <Section title="Identity">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Manufacturer *"><input value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} className={inp} placeholder="e.g. Hornady" /></Field>
              <Field label="Bullet Name"><input value={form.bullet_name} onChange={e => set('bullet_name', e.target.value)} className={inp} placeholder="e.g. ELD-M" /></Field>
              <Field label="Bullet Family"><input value={form.bullet_family} onChange={e => set('bullet_family', e.target.value)} className={inp} placeholder="e.g. ELD" /></Field>
              <Field label="Caliber *"><input value={form.caliber} onChange={e => set('caliber', e.target.value)} className={inp} placeholder="e.g. .308, 6.5mm" /></Field>
            </div>
            <Field label="Cartridge Compatibility Notes"><input value={form.cartridge_compatibility_notes || ''} onChange={e => set('cartridge_compatibility_notes', e.target.value)} className={inp} placeholder="e.g. .308 Win, .30-06, .300 Win Mag" /></Field>
          </Section>

          <Section title="Dimensions">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Weight (grains) *"><input type="number" value={form.weight_grains} onChange={e => set('weight_grains', e.target.value)} className={inp} placeholder="168" step="0.1" /></Field>
              <Field label="Weight (grams)"><input type="number" value={form.weight_grams} onChange={e => set('weight_grams', e.target.value)} className={inp} placeholder="10.9" step="0.01" /></Field>
              <Field label="Length (mm)"><input type="number" value={form.bullet_length_mm} onChange={e => set('bullet_length_mm', e.target.value)} className={inp} placeholder="38.1" step="0.1" /></Field>
              <Field label="Diameter (inch)"><input type="number" value={form.diameter_inch} onChange={e => set('diameter_inch', e.target.value)} className={inp} placeholder="0.308" step="0.001" /></Field>
              <Field label="Diameter (mm)"><input type="number" value={form.diameter_mm} onChange={e => set('diameter_mm', e.target.value)} className={inp} placeholder="7.82" step="0.01" /></Field>
              <Field label="Min Twist Rate"><input value={form.minimum_twist_rate} onChange={e => set('minimum_twist_rate', e.target.value)} className={inp} placeholder="1:10" /></Field>
            </div>
          </Section>

          <Section title="Ballistics">
            <div className="grid grid-cols-3 gap-3">
              <Field label="BC G1"><input type="number" value={form.ballistic_coefficient_g1} onChange={e => set('ballistic_coefficient_g1', e.target.value)} className={inp} placeholder="0.475" step="0.001" /></Field>
              <Field label="BC G7"><input type="number" value={form.ballistic_coefficient_g7} onChange={e => set('ballistic_coefficient_g7', e.target.value)} className={inp} placeholder="0.243" step="0.001" /></Field>
              <Field label="Sectional Density"><input type="number" value={form.sectional_density} onChange={e => set('sectional_density', e.target.value)} className={inp} placeholder="0.253" step="0.001" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="BC Model">
                <select value={form.bc_model} onChange={e => set('bc_model', e.target.value)} className={inp}>
                  <option value="">— Unknown —</option>
                  {['G1','G7','G1+G7','Radar/CDM'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Recommended Use"><input value={form.recommended_use} onChange={e => set('recommended_use', e.target.value)} className={inp} placeholder="Long Range Match" /></Field>
            </div>
            <Field label="BC Velocity Band Notes"><input value={form.bc_velocity_band_notes} onChange={e => set('bc_velocity_band_notes', e.target.value)} className={inp} placeholder="e.g. G1: 0.505 @ >2600fps, 0.496 @ 1800-2600fps" /></Field>
            <Field label="Drag Model Notes"><input value={form.drag_model_notes} onChange={e => set('drag_model_notes', e.target.value)} className={inp} placeholder="Radar drag data / CDM notes" /></Field>
          </Section>

          <Section title="Construction">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bullet Type">
                <select value={form.bullet_type} onChange={e => set('bullet_type', e.target.value)} className={inp}>
                  <option value="">—</option>
                  {['Match/Target','Hunting','Varmint','Plinking','Lead-Free','Solid','Rimfire','Slug','Other'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Hunting or Match">
                <select value={form.hunting_or_match} onChange={e => set('hunting_or_match', e.target.value)} className={inp}>
                  <option value="">—</option>
                  {['Hunting','Match','Both','Varmint','Other'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Construction"><input value={form.bullet_construction} onChange={e => set('bullet_construction', e.target.value)} className={inp} placeholder="e.g. BTHP, FMJ, Polymer Tip" /></Field>
              <Field label="Material"><input value={form.bullet_material} onChange={e => set('bullet_material', e.target.value)} className={inp} placeholder="e.g. Jacketed Lead, Copper" /></Field>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-1">
              {[['lead_free','Lead-Free'],['boat_tail','Boat Tail'],['flat_base','Flat Base'],['polymer_tip','Polymer Tip'],['hollow_point','Hollow Point'],['soft_point','Soft Point'],['bonded','Bonded'],['monolithic','Monolithic'],['tipped','Tipped'],['cannelure','Cannelure']].map(([k,label]) => (
                <label key={k} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} className="w-3.5 h-3.5" />
                  {label}
                </label>
              ))}
            </div>
          </Section>

          <Section title="Source & Confidence">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source Name"><input value={form.source_name} onChange={e => set('source_name', e.target.value)} className={inp} placeholder="e.g. Hornady Official 2024" /></Field>
              <Field label="Data Confidence">
                <select value={form.data_confidence} onChange={e => set('data_confidence', e.target.value)} className={inp}>
                  {['High','Medium','Low','Unverified'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Date Checked"><input type="date" value={form.source_date_checked} onChange={e => set('source_date_checked', e.target.value)} className={inp} /></Field>
              <Field label="Manufacturer SKU"><input value={form.manufacturer_sku} onChange={e => set('manufacturer_sku', e.target.value)} className={inp} placeholder="e.g. 80753" /></Field>
            </div>
            <Field label="Official Product URL"><input value={form.official_product_url} onChange={e => set('official_product_url', e.target.value)} className={inp} placeholder="https://..." /></Field>
            <Field label="Notes"><textarea value={form.notes} onChange={e => set('notes', e.target.value)} className={inp} rows="2" /></Field>
          </Section>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60">
            <Save className="w-4 h-4" />{saving ? 'Saving…' : item ? 'Update' : 'Save Bullet'}
          </button>
          <button onClick={onClose} className="flex-1 py-3 border border-border rounded-xl font-semibold hover:bg-secondary">Cancel</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-secondary/30 rounded-xl p-4 space-y-3">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}