import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Save, Camera, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const DISTANCES = ['25', '50', '100', '200', '300', '400', '600'];
const POSITIONS = ['benchrest', 'prone', 'sticks', 'high_seat', 'standing', 'other'];
const WIND_DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'Calm'];

export default function NewTargetSession() {
  const navigate = useNavigate();
  const [rifles, setRifles] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [ammoList, setAmmoList] = useState([]);
  const [reloadingSessions, setReloadingSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    range_name: '',
    rifle_id: '',
    rifle_name: '',
    scope_id: '',
    scope_name: '',
    ammo_id: '',
    ammo_name: '',
    ammo_source: 'inventory',
    distance: '100',
    distance_unit: 'm',
    caliber: '',
    bullet_weight: '',
    shooting_position: 'benchrest',
    weather_notes: '',
    wind_direction: '',
    wind_speed: '',
    temperature: '',
    notes: '',
    photos: [],
  });

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me();
      const [r, s, a, rs] = await Promise.all([
        base44.entities.Rifle.filter({ created_by: user.email }),
        base44.entities.ScopeProfile.list(),
        base44.entities.Ammunition.filter({ created_by: user.email }),
        base44.entities.ReloadingSession.filter({ created_by: user.email }),
      ]);
      setRifles(r || []);
      setScopes(s || []);
      setAmmoList(a || []);
      setReloadingSessions(rs || []);
    };
    load();
  }, []);

  const filteredScopes = scopes.filter(s => s.rifle_id === form.rifle_id);

  const handleRifleChange = (id) => {
    const rifle = rifles.find(r => r.id === id);
    setForm(f => ({
      ...f,
      rifle_id: id,
      rifle_name: rifle ? `${rifle.make} ${rifle.model} (${rifle.caliber})` : '',
      caliber: rifle?.caliber || '',
      scope_id: '',
      scope_name: '',
    }));
  };

  const handleScopeChange = (id) => {
    const scope = scopes.find(s => s.id === id);
    setForm(f => ({
      ...f,
      scope_id: id,
      scope_name: scope ? `${scope.scope_brand} ${scope.scope_model || ''}`.trim() : '',
    }));
  };

  const handleAmmoChange = (id) => {
    if (id.startsWith('reload_')) {
      const rs = reloadingSessions.find(r => r.id === id.replace('reload_', ''));
      setForm(f => ({
        ...f,
        ammo_id: id,
        ammo_name: rs ? `Reloaded ${rs.caliber} (Batch ${rs.batch_number})` : '',
        ammo_source: 'reloading',
        caliber: rs?.caliber || f.caliber,
      }));
    } else {
      const ammo = ammoList.find(a => a.id === id);
      setForm(f => ({
        ...f,
        ammo_id: id,
        ammo_name: ammo ? `${ammo.brand} ${ammo.caliber} ${ammo.grain || ''}gr`.trim() : '',
        ammo_source: 'inventory',
        caliber: ammo?.caliber || f.caliber,
        bullet_weight: ammo?.grain || f.bullet_weight,
      }));
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, photos: [...f.photos, file_url] }));
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const session = await base44.entities.TargetSession.create(form);
    setSaving(false);
    navigate(`/target-analyzer/session/${session.id}`);
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="min-h-screen bg-background mobile-page-padding">
      <Navigation />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/target-analyzer')} className="p-2 rounded-xl bg-secondary">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">New Target Session</h1>
        </div>

        {/* Date & Range */}
        <div className="bg-card rounded-2xl p-4 space-y-3 border border-border">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Session Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div>
              <Label>Range / Club</Label>
              <Input placeholder="e.g. Bisley" value={form.range_name} onChange={e => set('range_name', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Rifle & Scope */}
        <div className="bg-card rounded-2xl p-4 space-y-3 border border-border">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Equipment</h2>
          <div>
            <Label>Rifle</Label>
            <Select value={form.rifle_id} onValueChange={handleRifleChange}>
              <SelectTrigger><SelectValue placeholder="Select rifle" /></SelectTrigger>
              <SelectContent>
                {rifles.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name || `${r.make} ${r.model}`} ({r.caliber})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filteredScopes.length > 0 && (
            <div>
              <Label>Scope</Label>
              <Select value={form.scope_id} onValueChange={handleScopeChange}>
                <SelectTrigger><SelectValue placeholder="Select scope" /></SelectTrigger>
                <SelectContent>
                  {filteredScopes.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.scope_brand} {s.scope_model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>Ammunition</Label>
            <Select value={form.ammo_id} onValueChange={handleAmmoChange}>
              <SelectTrigger><SelectValue placeholder="Select ammo" /></SelectTrigger>
              <SelectContent>
                {ammoList.length > 0 && <SelectItem value="_inv_header" disabled className="font-semibold text-xs">── Inventory ──</SelectItem>}
                {ammoList.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.brand} {a.caliber} {a.grain}gr</SelectItem>
                ))}
                {reloadingSessions.length > 0 && <SelectItem value="_rel_header" disabled className="font-semibold text-xs">── Reloads ──</SelectItem>}
                {reloadingSessions.map(r => (
                  <SelectItem key={r.id} value={`reload_${r.id}`}>Reloaded {r.caliber} (Batch {r.batch_number})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Calibre</Label>
              <Input placeholder="e.g. .308" value={form.caliber} onChange={e => set('caliber', e.target.value)} />
            </div>
            <div>
              <Label>Bullet Weight (gr)</Label>
              <Input placeholder="e.g. 168" value={form.bullet_weight} onChange={e => set('bullet_weight', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Distance & Position */}
        <div className="bg-card rounded-2xl p-4 space-y-3 border border-border">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Distance & Position</h2>
          <div>
            <Label>Distance</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {DISTANCES.map(d => (
                <button
                  key={d}
                  onClick={() => set('distance', d)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${form.distance === d ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border'}`}
                >
                  {d}{form.distance_unit}
                </button>
              ))}
              <button
                onClick={() => set('distance', '')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${!DISTANCES.includes(form.distance) ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border'}`}
              >
                Custom
              </button>
            </div>
            {!DISTANCES.includes(form.distance) && (
              <Input className="mt-2" placeholder="Custom distance" value={form.distance} onChange={e => set('distance', e.target.value)} />
            )}
            <div className="flex gap-2 mt-2">
              {['m', 'yards'].map(u => (
                <button key={u} onClick={() => set('distance_unit', u)}
                  className={`px-3 py-1 rounded-lg text-sm border ${form.distance_unit === u ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Shooting Position</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {POSITIONS.map(p => (
                <button key={p} onClick={() => set('shooting_position', p)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border capitalize transition-all ${form.shooting_position === p ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border'}`}>
                  {p.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Weather */}
        <div className="bg-card rounded-2xl p-4 space-y-3 border border-border">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Weather</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Temperature</Label>
              <Input placeholder="e.g. 15°C" value={form.temperature} onChange={e => set('temperature', e.target.value)} />
            </div>
            <div>
              <Label>Wind Speed</Label>
              <Input placeholder="e.g. 5 mph" value={form.wind_speed} onChange={e => set('wind_speed', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Wind Direction</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {WIND_DIRS.map(d => (
                <button key={d} onClick={() => set('wind_direction', d)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${form.wind_direction === d ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Weather Notes</Label>
            <Textarea placeholder="Conditions, light, humidity..." value={form.weather_notes} onChange={e => set('weather_notes', e.target.value)} rows={2} />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-card rounded-2xl p-4 space-y-3 border border-border">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Notes</h2>
          <Textarea placeholder="Session notes..." value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} />
        </div>

        {/* Photos */}
        <div className="bg-card rounded-2xl p-4 space-y-3 border border-border">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Photos</h2>
          <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary border border-dashed border-border cursor-pointer hover:bg-accent transition-colors">
            <Camera className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">{uploading ? 'Uploading...' : 'Add Photo'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
          {form.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {form.photos.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} className="w-full h-24 object-cover rounded-xl" />
                  <button onClick={() => setForm(f => ({ ...f, photos: f.photos.filter((_, j) => j !== i) }))}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 gap-3">
          <Button onClick={handleSave} disabled={saving || !form.rifle_id} className="py-6 text-lg rounded-2xl">
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Saving...' : 'Save Session'}
          </Button>
        </div>
      </div>
    </div>
  );
}