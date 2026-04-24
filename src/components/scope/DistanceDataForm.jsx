import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function DistanceDataForm({ row, turretType, onSave, onClose }) {
  const [form, setForm] = useState({
    distance: '',
    distance_unit: 'm',
    elevation_clicks: '',
    elevation_unit_value: '',
    windage_clicks: '',
    windage_unit_value: '',
    data_type: 'confirmed',
    ammunition_used: '',
    temperature: '',
    weather_notes: '',
    confirmed_at_range: true,
    date_confirmed: new Date().toISOString().split('T')[0],
    notes: '',
    photos: [],
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (row) setForm({ ...form, ...row });
  }, [row]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
    if (!form.distance) { alert('Distance is required'); return; }
    if (form.elevation_clicks === '') { alert('Elevation clicks are required'); return; }
    const data = {
      ...form,
      distance: parseInt(form.distance),
      elevation_clicks: parseFloat(form.elevation_clicks),
      windage_clicks: form.windage_clicks !== '' ? parseFloat(form.windage_clicks) : null,
    };
    onSave(data);
  };

  const inp = 'w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm';
  const lbl = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1';

  return (
    <div className="flex flex-col" style={{ maxHeight: '90dvh' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-bold">{row ? 'Edit Distance Entry' : 'Add Distance Entry'}</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg"><X className="w-5 h-5" /></button>
      </div>

      <form id="dist-form" onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 space-y-4 flex-1">

        {/* Data Type — most important toggle */}
        <div className="flex gap-2">
          {['calculated', 'confirmed'].map(type => (
            <button
              key={type}
              type="button"
              onClick={() => set('data_type', type)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
                form.data_type === type
                  ? type === 'confirmed'
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-blue-500 text-white border-blue-500'
                  : 'border-border hover:bg-secondary'
              }`}
            >
              {type === 'confirmed' ? '✓ Confirmed' : '⟳ Calculated'}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          {form.data_type === 'confirmed'
            ? 'Real-world data — confirmed at the range'
            : 'Ballistic calculator data — not yet range-verified'}
        </p>

        {/* Distance */}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <label className={lbl}>Distance *</label>
            <input type="number" value={form.distance} onChange={e => set('distance', e.target.value)}
              placeholder="e.g. 300" className={inp} required />
          </div>
          <div>
            <label className={lbl}>Unit</label>
            <select value={form.distance_unit} onChange={e => set('distance_unit', e.target.value)} className={inp}>
              <option value="m">Metres</option>
              <option value="yards">Yards</option>
            </select>
          </div>
        </div>

        {/* Elevation */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-primary uppercase tracking-wide">Elevation Adjustment</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Clicks *</label>
              <input type="number" step="0.5" value={form.elevation_clicks}
                onChange={e => set('elevation_clicks', e.target.value)}
                placeholder="e.g. 8" className={inp} required />
            </div>
            <div>
              <label className={lbl}>{turretType} Value</label>
              <input value={form.elevation_unit_value}
                onChange={e => set('elevation_unit_value', e.target.value)}
                placeholder={turretType === 'MOA' ? 'e.g. +2 MOA' : 'e.g. +0.6 MRAD'}
                className={inp} />
            </div>
          </div>
        </div>

        {/* Windage */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Windage Clicks</label>
            <input type="number" step="0.5" value={form.windage_clicks}
              onChange={e => set('windage_clicks', e.target.value)}
              placeholder="Optional" className={inp} />
          </div>
          <div>
            <label className={lbl}>{turretType} Value</label>
            <input value={form.windage_unit_value}
              onChange={e => set('windage_unit_value', e.target.value)}
              placeholder="Optional" className={inp} />
          </div>
        </div>

        {/* Ammo + Date */}
        <div>
          <label className={lbl}>Ammunition Used</label>
          <input value={form.ammunition_used} onChange={e => set('ammunition_used', e.target.value)}
            placeholder="e.g. Federal Gold Medal 168gr" className={inp} />
        </div>

        {form.data_type === 'confirmed' && (
          <>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="confirmed_range"
                checked={form.confirmed_at_range}
                onChange={e => set('confirmed_at_range', e.target.checked)}
                className="w-4 h-4 rounded accent-primary" />
              <label htmlFor="confirmed_range" className="text-sm font-medium">Confirmed at range</label>
            </div>
            <div>
              <label className={lbl}>Date Confirmed</label>
              <input type="date" value={form.date_confirmed} onChange={e => set('date_confirmed', e.target.value)} className={inp} />
            </div>
          </>
        )}

        {/* Temperature / Weather */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={lbl}>Temperature</label>
            <input value={form.temperature} onChange={e => set('temperature', e.target.value)}
              placeholder="e.g. 15°C" className={inp} />
          </div>
          <div>
            <label className={lbl}>Weather</label>
            <input value={form.weather_notes} onChange={e => set('weather_notes', e.target.value)}
              placeholder="e.g. Calm, sunny" className={inp} />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className={lbl}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
            rows="2" placeholder="e.g. 10 mph wind from right" className={inp} />
        </div>

        {/* Photos */}
        <div>
          <label className={lbl}>Photos (range card, target, conditions)</label>
          <div className="flex gap-2 mb-2">
            <label className="flex-1 py-2.5 bg-secondary hover:bg-secondary/80 rounded-xl text-center cursor-pointer text-xs font-semibold">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : '📁 Choose'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotos(e.target.files)} />
            </label>
            <label className="flex-1 py-2.5 bg-secondary hover:bg-secondary/80 rounded-xl text-center cursor-pointer text-xs font-semibold">
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
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-white w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>

      <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0">
        <button form="dist-form" type="submit" className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90">
          {row ? 'Save Changes' : 'Add Entry'}
        </button>
        <button onClick={onClose} className="flex-1 py-3 border border-border rounded-xl font-bold text-sm hover:bg-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}