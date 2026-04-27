import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ChildScreenHeader from '@/components/ChildScreenHeader';
import { Plus, Trash2, Edit2, Database } from 'lucide-react';

const inp = 'w-full px-3 py-2 border border-border rounded-lg bg-background text-sm';
const lbl = 'block text-xs font-semibold text-muted-foreground uppercase mb-1';

const EMPTY = {
  manufacturer: '', model: '', magnification_min: '', magnification_max: '',
  objective_diameter_mm: '', tube_diameter_mm: '', focal_plane: 'FFP',
  reticle_name: '', turret_unit: 'MRAD', click_value: '0.1 MRAD',
  clicks_per_turn: '', elevation_travel_mrad: '', windage_travel_mrad: '',
  zero_stop: false, parallax_adjustable: true, weight_grams: '', notes: '',
};

export default function ScopeReferenceDB() {
  const [scopes, setScopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.ScopeReference.list('-updated_date', 500);
    setScopes(list);
    setLoading(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleEdit = (s) => { setEditing(s); setForm({ ...EMPTY, ...s }); setShowForm(true); };
  const handleNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      magnification_min: parseFloat(form.magnification_min) || null,
      magnification_max: parseFloat(form.magnification_max) || null,
      objective_diameter_mm: parseFloat(form.objective_diameter_mm) || null,
      tube_diameter_mm: parseFloat(form.tube_diameter_mm) || null,
      clicks_per_turn: parseFloat(form.clicks_per_turn) || null,
      elevation_travel_mrad: parseFloat(form.elevation_travel_mrad) || null,
      windage_travel_mrad: parseFloat(form.windage_travel_mrad) || null,
      weight_grams: parseFloat(form.weight_grams) || null,
    };
    if (editing?.id) {
      await base44.entities.ScopeReference.update(editing.id, payload);
    } else {
      await base44.entities.ScopeReference.create(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this scope from the reference database?')) return;
    await base44.entities.ScopeReference.delete(id);
    load();
  };

  const filtered = scopes.filter(s => {
    if (!query) return true;
    const q = query.toLowerCase();
    return [s.manufacturer, s.model, s.reticle_name, s.turret_unit, s.click_value]
      .some(v => v?.toLowerCase().includes(q));
  });

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <ChildScreenHeader title="Scope Reference Database" />
      <main className="max-w-3xl mx-auto px-4 py-6 mobile-page-padding">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <p className="text-sm text-muted-foreground">{scopes.length} scopes in database</p>
          </div>
          <button onClick={handleNew} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90">
            <Plus className="w-4 h-4" /> Add Scope
          </button>
        </div>

        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search manufacturer, model, reticle…"
          className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm mb-4"
        />

        {showForm && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-5">
            <h3 className="font-bold text-base mb-4">{editing ? 'Edit Scope' : 'Add Scope to Database'}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Manufacturer *</label><input value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} className={inp} placeholder="e.g. Zeiss" required /></div>
                <div><label className={lbl}>Model *</label><input value={form.model} onChange={e => set('model', e.target.value)} className={inp} placeholder="e.g. Victory V8" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Mag Min</label><input type="number" step="0.5" value={form.magnification_min} onChange={e => set('magnification_min', e.target.value)} className={inp} placeholder="e.g. 1" /></div>
                <div><label className={lbl}>Mag Max</label><input type="number" step="0.5" value={form.magnification_max} onChange={e => set('magnification_max', e.target.value)} className={inp} placeholder="e.g. 8" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Objective (mm)</label><input type="number" value={form.objective_diameter_mm} onChange={e => set('objective_diameter_mm', e.target.value)} className={inp} placeholder="e.g. 56" /></div>
                <div><label className={lbl}>Tube (mm)</label><input type="number" value={form.tube_diameter_mm} onChange={e => set('tube_diameter_mm', e.target.value)} className={inp} placeholder="e.g. 34" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Focal Plane</label>
                  <select value={form.focal_plane} onChange={e => set('focal_plane', e.target.value)} className={inp}>
                    <option value="FFP">FFP</option><option value="SFP">SFP</option>
                  </select>
                </div>
                <div><label className={lbl}>Reticle</label><input value={form.reticle_name} onChange={e => set('reticle_name', e.target.value)} className={inp} placeholder="e.g. MIL-DOT" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Turret Unit</label>
                  <select value={form.turret_unit} onChange={e => set('turret_unit', e.target.value)} className={inp}>
                    <option value="MOA">MOA</option><option value="MRAD">MRAD</option>
                  </select>
                </div>
                <div><label className={lbl}>Click Value</label><input value={form.click_value} onChange={e => set('click_value', e.target.value)} className={inp} placeholder="e.g. 0.1 MRAD" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Clicks/Turn</label><input type="number" value={form.clicks_per_turn} onChange={e => set('clicks_per_turn', e.target.value)} className={inp} placeholder="e.g. 100" /></div>
                <div><label className={lbl}>Weight (g)</label><input type="number" value={form.weight_grams} onChange={e => set('weight_grams', e.target.value)} className={inp} placeholder="e.g. 870" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Elev. Travel (MRAD)</label><input type="number" step="0.1" value={form.elevation_travel_mrad} onChange={e => set('elevation_travel_mrad', e.target.value)} className={inp} placeholder="e.g. 30" /></div>
                <div><label className={lbl}>Wind. Travel (MRAD)</label><input type="number" step="0.1" value={form.windage_travel_mrad} onChange={e => set('windage_travel_mrad', e.target.value)} className={inp} placeholder="e.g. 15" /></div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.zero_stop} onChange={e => set('zero_stop', e.target.checked)} className="w-4 h-4" /> Zero Stop</label>
                <label className="flex items-center gap-2 cursor-pointer text-sm"><input type="checkbox" checked={form.parallax_adjustable} onChange={e => set('parallax_adjustable', e.target.checked)} className="w-4 h-4" /> Parallax Adj.</label>
              </div>
              <div><label className={lbl}>Notes</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inp} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Scope'}</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground text-sm">
            {scopes.length === 0 ? 'No scopes yet. Add your first scope to the reference database.' : 'No results for your search.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{s.manufacturer} {s.model}{s.magnification_min && s.magnification_max ? ` ${s.magnification_min}-${s.magnification_max}x` : ''}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.turret_unit}{s.click_value ? ` · ${s.click_value}` : ''}{s.focal_plane ? ` · ${s.focal_plane}` : ''}{s.reticle_name ? ` · ${s.reticle_name}` : ''}{s.zero_stop ? ' · Zero Stop' : ''}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleEdit(s)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}