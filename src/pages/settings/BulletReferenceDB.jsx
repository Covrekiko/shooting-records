import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ChildScreenHeader from '@/components/ChildScreenHeader';
import { Plus, Trash2, Edit2, Database } from 'lucide-react';

const inp = 'w-full px-3 py-2 border border-border rounded-lg bg-background text-sm';
const lbl = 'block text-xs font-semibold text-muted-foreground uppercase mb-1';

const EMPTY = {
  manufacturer: '', bullet_name: '', caliber: '', diameter_inch: '', diameter_mm: '',
  weight_grains: '', weight_grams: '', bullet_type: 'Match/Target', bullet_construction: '',
  lead_free: false, ballistic_coefficient_g1: '', ballistic_coefficient_g7: '',
  sectional_density: '', bullet_length_mm: '', minimum_twist_rate: '', notes: '',
};

export default function BulletReferenceDB() {
  const [bullets, setBullets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.BulletReference.list('-updated_date', 500);
    setBullets(list);
    setLoading(false);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleEdit = (b) => {
    setEditing(b);
    setForm({ ...EMPTY, ...b });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      diameter_inch: parseFloat(form.diameter_inch) || null,
      diameter_mm: parseFloat(form.diameter_mm) || null,
      weight_grains: parseFloat(form.weight_grains) || null,
      weight_grams: parseFloat(form.weight_grams) || null,
      ballistic_coefficient_g1: parseFloat(form.ballistic_coefficient_g1) || null,
      ballistic_coefficient_g7: parseFloat(form.ballistic_coefficient_g7) || null,
      sectional_density: parseFloat(form.sectional_density) || null,
      bullet_length_mm: parseFloat(form.bullet_length_mm) || null,
    };
    if (editing?.id) {
      await base44.entities.BulletReference.update(editing.id, payload);
    } else {
      await base44.entities.BulletReference.create(payload);
    }
    setSaving(false);
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this bullet from the reference database?')) return;
    await base44.entities.BulletReference.delete(id);
    load();
  };

  const filtered = bullets.filter(b => {
    if (!query) return true;
    const q = query.toLowerCase();
    return [b.manufacturer, b.bullet_name, b.caliber, String(b.weight_grains || ''), b.bullet_type]
      .some(v => v?.toLowerCase().includes(q));
  });

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <ChildScreenHeader title="Bullet Reference Database" />
      <main className="max-w-3xl mx-auto px-4 py-6 mobile-page-padding">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <p className="text-sm text-muted-foreground">{bullets.length} bullets in database</p>
          </div>
          <button onClick={handleNew} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90">
            <Plus className="w-4 h-4" /> Add Bullet
          </button>
        </div>

        <input
          value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Search manufacturer, caliber, weight…"
          className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm mb-4"
        />

        {showForm && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-5">
            <h3 className="font-bold text-base mb-4">{editing ? 'Edit Bullet' : 'Add Bullet to Database'}</h3>
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Manufacturer *</label><input value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} className={inp} placeholder="e.g. Hornady" required /></div>
                <div><label className={lbl}>Bullet Name</label><input value={form.bullet_name} onChange={e => set('bullet_name', e.target.value)} className={inp} placeholder="e.g. ELD-M" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Caliber *</label><input value={form.caliber} onChange={e => set('caliber', e.target.value)} className={inp} placeholder="e.g. .308" required /></div>
                <div><label className={lbl}>Weight (grains) *</label><input type="number" step="0.1" value={form.weight_grains} onChange={e => set('weight_grains', e.target.value)} className={inp} placeholder="e.g. 168" required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Diameter (inch)</label><input type="number" step="0.001" value={form.diameter_inch} onChange={e => set('diameter_inch', e.target.value)} className={inp} placeholder="e.g. 0.308" /></div>
                <div><label className={lbl}>Diameter (mm)</label><input type="number" step="0.01" value={form.diameter_mm} onChange={e => set('diameter_mm', e.target.value)} className={inp} placeholder="e.g. 7.82" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Bullet Type</label>
                  <select value={form.bullet_type} onChange={e => set('bullet_type', e.target.value)} className={inp}>
                    {['Match/Target','Hunting','Varmint','Plinking','Lead-Free','Solid','Other'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Construction</label><input value={form.bullet_construction} onChange={e => set('bullet_construction', e.target.value)} className={inp} placeholder="e.g. BTHP" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>BC (G1)</label><input type="number" step="0.001" value={form.ballistic_coefficient_g1} onChange={e => set('ballistic_coefficient_g1', e.target.value)} className={inp} placeholder="e.g. 0.475" /></div>
                <div><label className={lbl}>BC (G7)</label><input type="number" step="0.001" value={form.ballistic_coefficient_g7} onChange={e => set('ballistic_coefficient_g7', e.target.value)} className={inp} placeholder="e.g. 0.243" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Sectional Density</label><input type="number" step="0.001" value={form.sectional_density} onChange={e => set('sectional_density', e.target.value)} className={inp} placeholder="e.g. 0.253" /></div>
                <div><label className={lbl}>Min. Twist Rate</label><input value={form.minimum_twist_rate} onChange={e => set('minimum_twist_rate', e.target.value)} className={inp} placeholder="e.g. 1:10" /></div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.lead_free} onChange={e => set('lead_free', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm">Lead-free bullet</span>
              </label>
              <div><label className={lbl}>Notes</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inp} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Bullet'}</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground text-sm">
            {bullets.length === 0 ? 'No bullets yet. Add your first bullet to the reference database.' : 'No results for your search.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(b => (
              <div key={b.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{b.manufacturer} {b.bullet_name || ''} — {b.weight_grains}gr {b.caliber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.bullet_type}{b.bullet_construction ? ` · ${b.bullet_construction}` : ''}{b.ballistic_coefficient_g1 ? ` · G1: ${b.ballistic_coefficient_g1}` : ''}{b.ballistic_coefficient_g7 ? ` · G7: ${b.ballistic_coefficient_g7}` : ''}{b.lead_free ? ' · Lead-free' : ''}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleEdit(b)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}