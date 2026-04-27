import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/imageUtils';
import BulletReferencePicker from '@/components/reference/BulletReferencePicker';

const DISTANCES = [25, 50, 100, 200, 300, 400, 600];
const POSITIONS = [
  { value: 'benchrest', label: 'Benchrest' },
  { value: 'prone', label: 'Prone' },
  { value: 'sticks', label: 'Sticks' },
  { value: 'high_seat', label: 'High Seat' },
  { value: 'standing', label: 'Standing' },
  { value: 'other', label: 'Other' },
];

const inp = 'w-full px-3 py-3 border border-border rounded-xl bg-background text-sm';
const lbl = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1';

export default function NewSessionForm({ editSession, onSaved, onBack }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    range_name: '',
    rifle_id: '',
    rifle_name: '',
    scope_profile_id: '',
    scope_name: '',
    ammo_id: '',
    ammo_name: '',
    ammo_source: 'manual',
    caliber: '',
    bullet_weight: '',
    distance: 100,
    distance_unit: 'm',
    custom_distance: '',
    use_custom_distance: false,
    shooting_position: 'benchrest',
    weather_notes: '',
    wind_direction: '',
    wind_speed: '',
    temperature: '',
    notes: '',
    photos: [],
  });
  const [rifles, setRifles] = useState([]);
  const [scopeProfiles, setScopeProfiles] = useState([]);
  const [ammoList, setAmmoList] = useState([]);
  const [reloadingSessions, setReloadingSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    loadOptions();
    if (editSession) setForm({ ...form, ...editSession, use_custom_distance: !DISTANCES.includes(editSession.distance) });
  }, []);

  const loadOptions = async () => {
    const user = await base44.auth.me();
    const [r, s, a, rl] = await Promise.all([
      base44.entities.Rifle.filter({ created_by: user.email }),
      base44.entities.ScopeProfile.filter({ created_by: user.email }),
      base44.entities.Ammunition.filter({ created_by: user.email }),
      base44.entities.ReloadingSession.filter({ created_by: user.email }),
    ]);
    setRifles(r);
    setScopeProfiles(s);
    setAmmoList(a);
    setReloadingSessions(rl);
  };

  const handleRifleChange = (id) => {
    const rifle = rifles.find(r => r.id === id);
    set('rifle_id', id);
    set('rifle_name', rifle?.name || '');
    if (rifle?.caliber) set('caliber', rifle.caliber);
    // Auto-select scope if only one for this rifle
    const rifleScopes = scopeProfiles.filter(s => s.rifle_id === id);
    if (rifleScopes.length === 1) {
      set('scope_profile_id', rifleScopes[0].id);
      set('scope_name', `${rifleScopes[0].scope_brand} ${rifleScopes[0].scope_model || ''}`);
    } else {
      set('scope_profile_id', '');
      set('scope_name', '');
    }
  };

  const handleAmmoChange = (id, source) => {
    set('ammo_id', id);
    set('ammo_source', source);
    if (source === 'inventory') {
      const ammo = ammoList.find(a => a.id === id);
      if (ammo) {
        set('ammo_name', `${ammo.brand} ${ammo.caliber || ''} ${ammo.grain || ''}`.trim());
        if (ammo.caliber) set('caliber', ammo.caliber);
        if (ammo.grain) set('bullet_weight', ammo.grain);
      }
    } else if (source === 'reloading') {
      const rs = reloadingSessions.find(r => r.id === id);
      if (rs) {
        set('ammo_name', `Reloaded ${rs.caliber} — Batch ${rs.batch_number}`);
        if (rs.caliber) set('caliber', rs.caliber);
      }
    }
  };

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    setUploading(true);
    try {
      const urls = [...(form.photos || [])];
      for (const file of files) {
        const compressed = await compressImage(file);
        const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
        urls.push(file_url);
      }
      set('photos', urls);
    } catch (error) {
      console.error('Photo upload error:', error);
      alert('Upload failed: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rifle_id) { alert('Please select a rifle'); return; }
    setSaving(true);
    const finalDistance = form.use_custom_distance ? parseFloat(form.custom_distance) : form.distance;
    const payload = { ...form, distance: finalDistance };
    delete payload.use_custom_distance;
    delete payload.custom_distance;

    let session;
    if (editSession?.id) {
      session = await base44.entities.TargetSession.update(editSession.id, payload);
    } else {
      session = await base44.entities.TargetSession.create(payload);
    }
    setSaving(false);
    onSaved(session);
  };

  const rifleScopes = scopeProfiles.filter(s => s.rifle_id === form.rifle_id);

  return (
    <main className="max-w-2xl mx-auto px-4 pt-2 pb-8 mobile-page-padding">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} className="p-2 hover:bg-secondary rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold">{editSession ? 'Edit Session' : 'New Target Session'}</h2>
          <p className="text-xs text-muted-foreground">Fill in details then save</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Date & Range */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <p className="font-semibold text-sm">Session Info</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Date *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inp} required />
            </div>
            <div>
              <label className={lbl}>Club / Range</label>
              <input value={form.range_name} onChange={e => set('range_name', e.target.value)} placeholder="Range name" className={inp} />
            </div>
          </div>
        </div>

        {/* Rifle & Scope */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <p className="font-semibold text-sm">Equipment</p>
          <div>
            <label className={lbl}>Rifle *</label>
            <select value={form.rifle_id} onChange={e => handleRifleChange(e.target.value)} className={inp} required>
              <option value="">Select rifle…</option>
              {rifles.map(r => <option key={r.id} value={r.id}>{r.name} — {r.caliber}</option>)}
            </select>
          </div>
          {form.rifle_id && (
            <div>
              <label className={lbl}>Scope Profile</label>
              <select value={form.scope_profile_id} onChange={e => {
                const sp = scopeProfiles.find(s => s.id === e.target.value);
                set('scope_profile_id', e.target.value);
                set('scope_name', sp ? `${sp.scope_brand} ${sp.scope_model || ''}` : '');
              }} className={inp}>
                <option value="">No scope / unknown</option>
                {rifleScopes.map(s => <option key={s.id} value={s.id}>{s.scope_brand} {s.scope_model || ''}</option>)}
                {rifleScopes.length === 0 && <option disabled>No scopes for this rifle</option>}
              </select>
            </div>
          )}
          <div>
            <label className={lbl}>Bullet Reference Database <span className="normal-case font-normal text-muted-foreground">(optional autofill)</span></label>
            <BulletReferencePicker
              filterCaliber={form.caliber}
              onSelect={(b) => {
                if (b.caliber) set('caliber', b.caliber);
                if (b.weight_grains) set('bullet_weight', `${b.weight_grains}gr`);
              }}
              onClear={() => {}}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Calibre</label>
              <input value={form.caliber} onChange={e => set('caliber', e.target.value)} placeholder="e.g. .308" className={inp} />
            </div>
            <div>
              <label className={lbl}>Bullet Weight</label>
              <input value={form.bullet_weight} onChange={e => set('bullet_weight', e.target.value)} placeholder="e.g. 168gr" className={inp} />
            </div>
          </div>
        </div>

        {/* Ammo */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <p className="font-semibold text-sm">Ammunition</p>
          <div>
            <label className={lbl}>From Inventory</label>
            <select value={form.ammo_source === 'inventory' ? form.ammo_id : ''} onChange={e => handleAmmoChange(e.target.value, 'inventory')} className={inp}>
              <option value="">Select from inventory…</option>
              {ammoList.map(a => <option key={a.id} value={a.id}>{a.brand} {a.caliber} {a.grain || ''}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>From Reloading Records</label>
            <select value={form.ammo_source === 'reloading' ? form.ammo_id : ''} onChange={e => handleAmmoChange(e.target.value, 'reloading')} className={inp}>
              <option value="">Select reloaded batch…</option>
              {reloadingSessions.map(r => <option key={r.id} value={r.id}>Batch {r.batch_number} — {r.caliber} ({r.date})</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Or Enter Manually</label>
            <input value={form.ammo_source === 'manual' ? form.ammo_name : ''} onChange={e => { set('ammo_name', e.target.value); set('ammo_source', 'manual'); set('ammo_id', ''); }}
              placeholder="e.g. Sako Gamehead .243 90gr" className={inp} />
          </div>
        </div>

        {/* Distance & Position */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <p className="font-semibold text-sm">Range Details</p>
          <div>
            <label className={lbl}>Distance</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {DISTANCES.map(d => (
                <button key={d} type="button" onClick={() => { set('distance', d); set('use_custom_distance', false); }}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${!form.use_custom_distance && form.distance === d ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>
                  {d}m
                </button>
              ))}
              <button type="button" onClick={() => set('use_custom_distance', true)}
                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${form.use_custom_distance ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>
                Custom
              </button>
            </div>
            {form.use_custom_distance && (
              <div className="flex gap-2">
                <input type="number" value={form.custom_distance} onChange={e => set('custom_distance', e.target.value)}
                  placeholder="Distance" className={inp} />
                <select value={form.distance_unit} onChange={e => set('distance_unit', e.target.value)} className="px-3 py-3 border border-border rounded-xl bg-background text-sm w-24">
                  <option value="m">m</option>
                  <option value="yards">yards</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label className={lbl}>Shooting Position</label>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map(p => (
                <button key={p.value} type="button" onClick={() => set('shooting_position', p.value)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${form.shooting_position === p.value ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Weather */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <p className="font-semibold text-sm">Conditions</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Temperature</label>
              <input value={form.temperature} onChange={e => set('temperature', e.target.value)} placeholder="e.g. 12°C" className={inp} />
            </div>
            <div>
              <label className={lbl}>Wind Speed</label>
              <input value={form.wind_speed} onChange={e => set('wind_speed', e.target.value)} placeholder="e.g. 5mph" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Wind Direction</label>
            <input value={form.wind_direction} onChange={e => set('wind_direction', e.target.value)} placeholder="e.g. N, NW, crosswind left" className={inp} />
          </div>
          <div>
            <label className={lbl}>Weather Notes</label>
            <input value={form.weather_notes} onChange={e => set('weather_notes', e.target.value)} placeholder="e.g. Overcast, calm" className={inp} />
          </div>
        </div>

        {/* Notes & Photos */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <p className="font-semibold text-sm">Notes & Photos</p>
          <div>
            <label className={lbl}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows="3" placeholder="Session notes…" className={inp} />
          </div>
          <div>
            <label className={lbl}>Session Photos</label>
            <div className="flex gap-2 mb-2">
              <label className="flex-1 py-3 bg-secondary hover:bg-secondary/80 rounded-xl text-center cursor-pointer text-sm font-semibold transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : '📁 Choose Files'}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotos} />
                </label>
                <label className="flex-1 py-3 bg-secondary hover:bg-secondary/80 rounded-xl text-center cursor-pointer text-sm font-semibold transition-colors">
                 📷 Camera
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotos} />
              </label>
            </div>
            {form.photos?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.photos.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} className="w-20 h-20 object-cover rounded-xl border border-border" alt="" />
                    <button type="button" onClick={() => set('photos', form.photos.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving…' : (editSession ? 'Save Changes' : 'Save Session')}
        </button>
      </form>
    </main>
  );
}