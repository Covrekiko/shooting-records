import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const inp = 'w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

export default function ScopeForm({ item, onSaved, onClose }) {
  const [form, setForm] = useState(item || {
    manufacturer: '', model: '', model_family: '',
    magnification_min: '', magnification_max: '', objective_diameter_mm: '',
    tube_diameter_mm: '', focal_plane: '', reticle_name: '', reticle_type: '',
    turret_unit: '', click_value: '', clicks_per_turn: '',
    total_elevation_travel_mrad: '', total_windage_travel_mrad: '',
    total_elevation_travel_moa: '', total_windage_travel_moa: '',
    zero_stop: false, locking_turrets: false, capped_turrets: false,
    illumination: false, parallax_adjustable: true,
    length_mm: '', weight_grams: '', battery_type: '',
    waterproof_rating: '', manufacturer_sku: '',
    official_product_url: '', official_pdf_url: '',
    source_name: '', source_date_checked: '', data_confidence: 'Medium', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const numericFields = ['magnification_min','magnification_max','objective_diameter_mm','tube_diameter_mm',
    'clicks_per_turn','total_elevation_travel_mrad','total_windage_travel_mrad',
    'total_elevation_travel_moa','total_windage_travel_moa','length_mm','weight_grams',
    'parallax_min_distance_m','eye_relief_mm'];

  const handleSave = async () => {
    if (!form.manufacturer || !form.model) { alert('Manufacturer and model are required'); return; }
    setSaving(true);
    const payload = { ...form };
    numericFields.forEach(k => {
      if (payload[k] !== '' && payload[k] !== null && payload[k] !== undefined) {
        payload[k] = parseFloat(payload[k]) || undefined;
      } else { delete payload[k]; }
    });
    // Keep elevation_travel_mrad in sync with total field
    if (payload.total_elevation_travel_mrad) payload.elevation_travel_mrad = payload.total_elevation_travel_mrad;
    if (payload.total_windage_travel_mrad) payload.windage_travel_mrad = payload.total_windage_travel_mrad;
    if (item?.id) {
      await base44.entities.ScopeReference.update(item.id, payload);
    } else {
      await base44.entities.ScopeReference.create(payload);
    }
    setSaving(false);
    onSaved();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60000] bg-black/60 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="bg-card w-full md:max-w-2xl rounded-t-3xl md:rounded-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-bold text-lg">{item ? 'Edit Scope' : 'Add Scope Reference'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <Section title="Identity">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Manufacturer *"><input value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} className={inp} placeholder="e.g. Zeiss" /></Field>
              <Field label="Model *"><input value={form.model} onChange={e => set('model', e.target.value)} className={inp} placeholder="e.g. Victory V8" /></Field>
              <Field label="Model Family"><input value={form.model_family} onChange={e => set('model_family', e.target.value)} className={inp} placeholder="e.g. V8" /></Field>
              <Field label="Manufacturer SKU"><input value={form.manufacturer_sku} onChange={e => set('manufacturer_sku', e.target.value)} className={inp} /></Field>
            </div>
          </Section>

          <Section title="Optics">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Mag Min"><input type="number" value={form.magnification_min} onChange={e => set('magnification_min', e.target.value)} className={inp} placeholder="1" /></Field>
              <Field label="Mag Max"><input type="number" value={form.magnification_max} onChange={e => set('magnification_max', e.target.value)} className={inp} placeholder="8" /></Field>
              <Field label="Objective (mm)"><input type="number" value={form.objective_diameter_mm} onChange={e => set('objective_diameter_mm', e.target.value)} className={inp} placeholder="56" /></Field>
              <Field label="Tube Diameter (mm)"><input type="number" value={form.tube_diameter_mm} onChange={e => set('tube_diameter_mm', e.target.value)} className={inp} placeholder="34" /></Field>
              <Field label="Length (mm)"><input type="number" value={form.length_mm} onChange={e => set('length_mm', e.target.value)} className={inp} placeholder="350" /></Field>
              <Field label="Weight (g)"><input type="number" value={form.weight_grams} onChange={e => set('weight_grams', e.target.value)} className={inp} placeholder="620" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Focal Plane">
                <select value={form.focal_plane} onChange={e => set('focal_plane', e.target.value)} className={inp}>
                  <option value="">—</option>
                  <option value="FFP">FFP — First Focal Plane</option>
                  <option value="SFP">SFP — Second Focal Plane</option>
                </select>
              </Field>
              <Field label="Reticle Name"><input value={form.reticle_name} onChange={e => set('reticle_name', e.target.value)} className={inp} placeholder="e.g. MIL-DOT, MRAD Grid" /></Field>
            </div>
          </Section>

          <Section title="Turrets & Adjustment">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Turret Unit">
                <select value={form.turret_unit} onChange={e => set('turret_unit', e.target.value)} className={inp}>
                  <option value="">—</option>
                  <option value="MOA">MOA</option>
                  <option value="MRAD">MRAD</option>
                </select>
              </Field>
              <Field label="Click Value"><input value={form.click_value} onChange={e => set('click_value', e.target.value)} className={inp} placeholder="0.1 MRAD" /></Field>
              <Field label="Clicks/Turn"><input type="number" value={form.clicks_per_turn} onChange={e => set('clicks_per_turn', e.target.value)} className={inp} placeholder="100" /></Field>
              <Field label="Total Elevation (MRAD)"><input type="number" value={form.total_elevation_travel_mrad} onChange={e => set('total_elevation_travel_mrad', e.target.value)} className={inp} placeholder="31.4" step="0.1" /></Field>
              <Field label="Total Windage (MRAD)"><input type="number" value={form.total_windage_travel_mrad} onChange={e => set('total_windage_travel_mrad', e.target.value)} className={inp} placeholder="20.9" step="0.1" /></Field>
              <Field label="Total Elevation (MOA)"><input type="number" value={form.total_elevation_travel_moa} onChange={e => set('total_elevation_travel_moa', e.target.value)} className={inp} placeholder="105" step="0.5" /></Field>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-1">
              {[['zero_stop','Zero Stop'],['locking_turrets','Locking'],['capped_turrets','Capped'],['illumination','Illuminated'],['parallax_adjustable','AO/Parallax']].map(([k,label]) => (
                <label key={k} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} className="w-3.5 h-3.5" />
                  {label}
                </label>
              ))}
            </div>
          </Section>

          <Section title="Source & Confidence">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Source Name"><input value={form.source_name} onChange={e => set('source_name', e.target.value)} className={inp} placeholder="e.g. Zeiss Official 2024" /></Field>
              <Field label="Data Confidence">
                <select value={form.data_confidence} onChange={e => set('data_confidence', e.target.value)} className={inp}>
                  {['High','Medium','Low','Unverified'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Date Checked"><input type="date" value={form.source_date_checked} onChange={e => set('source_date_checked', e.target.value)} className={inp} /></Field>
              <Field label="Waterproof"><input value={form.waterproof_rating} onChange={e => set('waterproof_rating', e.target.value)} className={inp} placeholder="IPX7" /></Field>
            </div>
            <Field label="Official Product URL"><input value={form.official_product_url} onChange={e => set('official_product_url', e.target.value)} className={inp} placeholder="https://..." /></Field>
            <Field label="Notes"><textarea value={form.notes} onChange={e => set('notes', e.target.value)} className={inp} rows="2" /></Field>
          </Section>
        </div>
        <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60">
            <Save className="w-4 h-4" />{saving ? 'Saving…' : item ? 'Update' : 'Save Scope'}
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