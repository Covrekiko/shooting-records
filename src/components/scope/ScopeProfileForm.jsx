import { useState, useEffect } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BulletReferencePicker from '@/components/reference/BulletReferencePicker';
import ScopeReferencePicker from '@/components/reference/ScopeReferencePicker';

const CLICK_VALUES = ['1/4 MOA', '1/8 MOA', '1/2 MOA', '1 MOA', '0.1 MRAD', '0.05 MRAD'];
const SETUP_TYPES = [
  { value: 'standard', label: 'Standard' },
  { value: 'main_hunting', label: '🟢 Main Hunting Setup' },
  { value: 'target_shooting', label: '🎯 Target Shooting Setup' },
];

export default function ScopeProfileForm({ profile, rifles, onSave, onClose }) {
  const [form, setForm] = useState({
    rifle_id: '', rifle_name: '', caliber: '', scope_brand: '', scope_model: '',
    reticle_type: '', turret_type: 'MOA', click_value: '1/4 MOA',
    zero_distance: '', zero_ammo: '', bullet_brand: '', bullet_weight: '',
    setup_type: 'standard', notes: '', photos: [], active: true,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) setForm({ ...form, ...profile });
  }, [profile]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleRifleChange = (id) => {
    const rifle = rifles.find(r => r.id === id);
    set('rifle_id', id);
    set('rifle_name', rifle?.name || '');
    if (rifle?.caliber) set('caliber', rifle.caliber);
  };

  const handlePhotos = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    const urls = [...(form.photos || [])];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    set('photos', urls);
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.rifle_id) { alert('Please select a rifle'); return; }
    if (!form.scope_brand) { alert('Scope brand is required'); return; }
    onSave(form);
  };

  const inp = 'w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm';
  const lbl = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1';

  return (
    <div className="flex flex-col" style={{ maxHeight: '95dvh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-bold">{profile ? 'Edit Scope Profile' : 'New Scope Profile'}</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg"><X className="w-5 h-5" /></button>
      </div>

      {/* Body */}
      <form id="scope-form" onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 space-y-4 flex-1">

        {/* Rifle */}
        <div>
          <label className={lbl}>Rifle *</label>
          <select value={form.rifle_id} onChange={e => handleRifleChange(e.target.value)} className={inp} required>
            <option value="">Select rifle…</option>
            {rifles.map(r => <option key={r.id} value={r.id}>{r.name} — {r.caliber}</option>)}
          </select>
        </div>

        {/* Calibre */}
        <div>
          <label className={lbl}>Calibre</label>
          <input value={form.caliber} onChange={e => set('caliber', e.target.value)} placeholder="e.g. .308 Win" className={inp} />
        </div>

        {/* Scope Reference Picker */}
        <div>
          <label className={lbl}>Scope Reference Database <span className="normal-case font-normal text-muted-foreground">(optional autofill)</span></label>
          <ScopeReferencePicker
            onSelect={(s) => {
              set('scope_brand', s.manufacturer);
              set('scope_model', s.model);
              if (s.reticle_name) set('reticle_type', s.reticle_name);
              if (s.turret_unit) set('turret_type', s.turret_unit);
              if (s.click_value) set('click_value', s.click_value);
            }}
            onClear={() => {}}
          />
        </div>

        {/* Scope */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Scope Brand *</label>
            <input value={form.scope_brand} onChange={e => set('scope_brand', e.target.value)} placeholder="e.g. Zeiss" className={inp} required />
          </div>
          <div>
            <label className={lbl}>Scope Model</label>
            <input value={form.scope_model} onChange={e => set('scope_model', e.target.value)} placeholder="e.g. Victory V8" className={inp} />
          </div>
        </div>

        <div>
          <label className={lbl}>Reticle Type</label>
          <input value={form.reticle_type} onChange={e => set('reticle_type', e.target.value)} placeholder="e.g. Duplex, MIL-DOT, BDC" className={inp} />
        </div>

        {/* Turret */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Turret Type *</label>
            <select value={form.turret_type} onChange={e => set('turret_type', e.target.value)} className={inp}>
              <option value="MOA">MOA</option>
              <option value="MRAD">MRAD</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Click Value</label>
            <select value={form.click_value} onChange={e => set('click_value', e.target.value)} className={inp}>
              {CLICK_VALUES.map(v => <option key={v} value={v}>{v}</option>)}
              <option value="custom">Custom…</option>
            </select>
          </div>
        </div>
        {form.click_value === 'custom' && (
          <input value={form.click_value_custom || ''} onChange={e => set('click_value', e.target.value)}
            placeholder="Enter custom click value" className={inp} />
        )}

        {/* Zero */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Zero Distance</label>
            <input value={form.zero_distance} onChange={e => set('zero_distance', e.target.value)} placeholder="e.g. 100m" className={inp} />
          </div>
          <div>
            <label className={lbl}>Zero Ammo</label>
            <input value={form.zero_ammo} onChange={e => set('zero_ammo', e.target.value)} placeholder="e.g. Federal 168gr" className={inp} />
          </div>
        </div>

        {/* Bullet Reference Picker */}
        <div>
          <label className={lbl}>Bullet Reference Database <span className="normal-case font-normal text-muted-foreground">(optional autofill)</span></label>
          <BulletReferencePicker
            filterCaliber={form.caliber}
            onSelect={(b) => {
              set('bullet_brand', b.manufacturer);
              set('bullet_weight', b.weight_grains ? `${b.weight_grains}gr` : '');
            }}
            onClear={() => {}}
          />
        </div>

        {/* Bullet */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Bullet Brand</label>
            <input value={form.bullet_brand} onChange={e => set('bullet_brand', e.target.value)} placeholder="e.g. Hornady" className={inp} />
          </div>
          <div>
            <label className={lbl}>Bullet Weight / Grains</label>
            <input value={form.bullet_weight} onChange={e => set('bullet_weight', e.target.value)} placeholder="e.g. 168gr" className={inp} />
          </div>
        </div>

        {/* Setup type */}
        <div>
          <label className={lbl}>Setup Type</label>
          <select value={form.setup_type} onChange={e => set('setup_type', e.target.value)} className={inp}>
            {SETUP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className={lbl}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows="3" placeholder="Setup notes, conditions, etc." className={inp} />
        </div>

        {/* Photos */}
        <div>
          <label className={lbl}>Photos (rifle, scope, turret, zero target)</label>
          <div className="flex gap-2 mb-2">
            <label className="flex-1 py-2.5 bg-secondary hover:bg-secondary/80 rounded-xl text-center cursor-pointer text-xs font-semibold transition-colors">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : '📁 Choose Files'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotos(e.target.files)} />
            </label>
            <label className="flex-1 py-2.5 bg-secondary hover:bg-secondary/80 rounded-xl text-center cursor-pointer text-xs font-semibold transition-colors">
              📷 Camera
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotos(e.target.files)} />
            </label>
          </div>
          {form.photos?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {form.photos.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} className="w-16 h-16 object-cover rounded-lg border border-border" alt="" />
                  <button type="button" onClick={() => set('photos', form.photos.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0">
        <button form="scope-form" type="submit" className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90">
          {profile ? 'Save Changes' : 'Create Profile'}
        </button>
        <button onClick={onClose} className="flex-1 py-3 border border-border rounded-xl font-bold text-sm hover:bg-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}