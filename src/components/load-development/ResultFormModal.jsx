import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Calculator, Camera, ImagePlus, Trash2, CloudSun } from 'lucide-react';
import { compressImage } from '@/lib/imageUtils';
import NumberInput from '@/components/ui/NumberInput.jsx';
import GlobalModal, { ModalSaveButton, ModalCancelButton } from '@/components/ui/GlobalModal.jsx';

const Field = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">{label}</label>
    {children}
  </div>
);

export default function ResultFormModal({ open, test, variant, result, onClose, onSaved }) {
  const [distanceUnit, setDistanceUnit] = useState('yards');

  const [form, setForm] = useState({
    tested: true,
    test_date: '',
    distance_yards: '',
    group_size_moa: '',
    group_size_mm: '',
    velocity_1: '',
    velocity_2: '',
    velocity_3: '',
    velocity_4: '',
    velocity_5: '',
    avg_velocity: '',
    es: '',
    sd: '',
    pressure_signs_notes: '',
    recoil_notes: '',
    accuracy_notes: '',
    feeding_notes: '',
    is_best: false,
    final_comments: '',
    photos: [],
    air_pressure_value: '',
    air_pressure_unit: 'hPa',
    temperature_value: '',
    temperature_unit: '°C',
    humidity: '',
  });
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (result) setForm(f => ({ ...f, ...result }));
  }, [result]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';
    setUploadingPhoto(true);
    try {
      const urls = [];
      for (const file of files) {
        const compressed = await compressImage(file);
        const res = await base44.integrations.Core.UploadFile({ file: compressed });
        urls.push(res.file_url);
      }
      setForm(f => ({ ...f, photos: [...(f.photos || []), ...urls] }));
    } catch (err) {
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (idx) => {
    setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
  };

  const applyWeatherData = (current) => {
    if (!current) return false;
    setForm(f => ({
      ...f,
      air_pressure_value: current.surface_pressure != null ? Math.round(current.surface_pressure) : f.air_pressure_value,
      air_pressure_unit: 'hPa',
      temperature_value: current.temperature_2m != null ? current.temperature_2m : f.temperature_value,
      temperature_unit: '°C',
      humidity: current.relative_humidity_2m != null ? current.relative_humidity_2m : f.humidity,
    }));
    return true;
  };

  const autoFillWeather = async () => {
    setFetchingWeather(true);
    try {
      const geoSuccess = await new Promise((resolve) => {
        if (!navigator.geolocation) { resolve(false); return; }
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,relative_humidity_2m,surface_pressure`
            );
            const data = await res.json();
            resolve(applyWeatherData(data?.current));
          },
          () => resolve(false),
          { timeout: 6000, maximumAge: 60000 }
        );
      });

      if (!geoSuccess) {
        const res = await fetch('https://wttr.in/?format=j1');
        const data = await res.json();
        const cur = data?.current_condition?.[0];
        if (cur) {
          setForm(f => ({
            ...f,
            temperature_value: parseFloat(cur.temp_C) || f.temperature_value,
            temperature_unit: '°C',
            humidity: parseFloat(cur.humidity) || f.humidity,
            air_pressure_value: parseFloat(cur.pressure) || f.air_pressure_value,
            air_pressure_unit: 'hPa',
          }));
        }
      }
    } catch (err) {
      console.error('Weather fetch failed:', err);
      alert('Could not fetch weather data. Please enter values manually.');
    } finally {
      setFetchingWeather(false);
    }
  };

  const calcVelocityStats = () => {
    const vels = [form.velocity_1, form.velocity_2, form.velocity_3, form.velocity_4, form.velocity_5]
      .map(v => parseFloat(v)).filter(v => !isNaN(v) && v > 0);
    if (vels.length === 0) return;
    const avg = vels.reduce((a, b) => a + b, 0) / vels.length;
    const es = Math.max(...vels) - Math.min(...vels);
    const variance = vels.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / vels.length;
    const sd = Math.sqrt(variance);
    setForm(f => ({
      ...f,
      avg_velocity: Math.round(avg),
      es: Math.round(es),
      sd: Math.round(sd * 10) / 10,
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        test_id: test.id,
        variant_id: variant.id,
        tested: form.tested,
        test_date: form.test_date,
        distance_yards: parseFloat(form.distance_yards) || null,
        group_size_moa: parseFloat(form.group_size_moa) || null,
        group_size_mm: parseFloat(form.group_size_mm) || null,
        velocity_1: parseFloat(form.velocity_1) || null,
        velocity_2: parseFloat(form.velocity_2) || null,
        velocity_3: parseFloat(form.velocity_3) || null,
        velocity_4: parseFloat(form.velocity_4) || null,
        velocity_5: parseFloat(form.velocity_5) || null,
        avg_velocity: parseFloat(form.avg_velocity) || null,
        es: parseFloat(form.es) || null,
        sd: parseFloat(form.sd) || null,
        pressure_signs_notes: form.pressure_signs_notes,
        recoil_notes: form.recoil_notes,
        accuracy_notes: form.accuracy_notes,
        feeding_notes: form.feeding_notes,
        is_best: form.is_best,
        final_comments: form.final_comments,
        photos: form.photos || [],
        air_pressure_value: parseFloat(form.air_pressure_value) || null,
        air_pressure_unit: form.air_pressure_unit,
        temperature_value: parseFloat(form.temperature_value) || null,
        temperature_unit: form.temperature_unit,
        humidity: parseFloat(form.humidity) || null,
      };

      if (result?.id) {
        await base44.entities.ReloadingTestResult.update(result.id, payload);
      } else {
        await base44.entities.ReloadingTestResult.create(payload);
      }
      onSaved();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!variant) return null;

  return (
    <GlobalModal
      open={open}
      onClose={onClose}
      title="Test Results"
      subtitle={variant.label}
      maxWidth="max-w-xl"
      footer={
        <>
          <ModalCancelButton onClick={onClose}>Cancel</ModalCancelButton>
          <ModalSaveButton onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Results'}
          </ModalSaveButton>
        </>
      }
    >
      <div className="space-y-4">
        {/* Date + Distance */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Test Date">
            <input
              value={form.test_date ?? ''}
              onChange={e => set('test_date', e.target.value)}
              type="date"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none"
            />
          </Field>
          <Field label={`Distance (${distanceUnit === 'yards' ? 'yd' : 'm'})`}>
            <div className="flex gap-1 min-w-0">
              <input
                type="text"
                inputMode="decimal"
                value={form.distance_yards ?? ''}
                onChange={e => {
                  const v = e.target.value;
                  if (distanceUnit === 'meters' && v) {
                    const num = parseFloat(v);
                    set('distance_yards', isNaN(num) ? v : String(Math.round(num * 1.09361)));
                  } else {
                    set('distance_yards', v);
                  }
                }}
                placeholder={distanceUnit === 'yards' ? '100' : '91'}
                className="flex-1 min-w-0 px-3 py-2 bg-background border border-border rounded-l-lg text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setDistanceUnit(u => u === 'yards' ? 'meters' : 'yards')}
                className="px-2 py-1 text-[10px] font-bold bg-secondary rounded-r-lg hover:bg-secondary/80 flex-shrink-0 border border-border border-l-0"
              >
                {distanceUnit === 'yards' ? 'yd' : 'm'}
              </button>
            </div>
          </Field>
        </div>

        {/* Group Size */}
        <div className="grid grid-cols-2 gap-3">
          <NumberInput label="Group Size (MOA)" value={form.group_size_moa ?? ''} onChange={v => set('group_size_moa', v)} placeholder="0.75" allowDecimal />
          <NumberInput label="Group Size (mm)" value={form.group_size_mm ?? ''} onChange={v => set('group_size_mm', v)} placeholder="21" allowDecimal />
        </div>

        {/* Velocity */}
        <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase">Chronograph Readings (fps)</p>
            <button onClick={calcVelocityStats} type="button"
              className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
              <Calculator className="w-3 h-3" />Calculate
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1,2,3,4,5].map(n => (
              <NumberInput key={n} label={`V${n} (fps)`} value={form[`velocity_${n}`] ?? ''} onChange={v => set(`velocity_${n}`, v)} placeholder="2650" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
            <NumberInput label="Avg (fps)" value={form.avg_velocity ?? ''} onChange={v => set('avg_velocity', v)} placeholder="auto" />
            <NumberInput label="ES (fps)" value={form.es ?? ''} onChange={v => set('es', v)} placeholder="auto" />
            <NumberInput label="SD" value={form.sd ?? ''} onChange={v => set('sd', v)} placeholder="auto" allowDecimal />
          </div>
        </div>

        {/* Environmental Conditions */}
        <div className="bg-secondary/30 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase">Environmental Conditions</p>
            <button type="button" onClick={autoFillWeather} disabled={fetchingWeather}
              className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline disabled:opacity-50">
              <CloudSun className="w-3 h-3" />
              {fetchingWeather ? 'Fetching…' : 'Auto-fill Weather'}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Air Pressure">
              <div className="flex gap-1 min-w-0">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.air_pressure_value ?? ''}
                  onChange={e => set('air_pressure_value', e.target.value)}
                  placeholder="1013"
                  className="flex-1 min-w-0 px-3 py-2 bg-background border border-border rounded-l-lg text-sm focus:outline-none"
                />
                <button type="button"
                  onClick={() => set('air_pressure_unit', form.air_pressure_unit === 'hPa' ? 'inHg' : 'hPa')}
                  className="px-2 py-1 text-[10px] font-bold bg-secondary rounded-r-lg hover:bg-secondary/80 flex-shrink-0 border border-border border-l-0 whitespace-nowrap">
                  {form.air_pressure_unit}
                </button>
              </div>
            </Field>
            <Field label="Temperature">
              <div className="flex gap-1 min-w-0">
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.temperature_value ?? ''}
                  onChange={e => set('temperature_value', e.target.value)}
                  placeholder="12"
                  className="flex-1 min-w-0 px-3 py-2 bg-background border border-border rounded-l-lg text-sm focus:outline-none"
                />
                <button type="button"
                  onClick={() => set('temperature_unit', form.temperature_unit === '°C' ? '°F' : '°C')}
                  className="px-2 py-1 text-[10px] font-bold bg-secondary rounded-r-lg hover:bg-secondary/80 flex-shrink-0 border border-border border-l-0 whitespace-nowrap">
                  {form.temperature_unit}
                </button>
              </div>
            </Field>
          </div>
          <NumberInput label="Humidity (%)" value={form.humidity ?? ''} onChange={v => set('humidity', v)} placeholder="65" allowDecimal />
        </div>

        {/* Notes */}
        <div className="space-y-3">
          {[
            ['pressure_signs_notes', 'Pressure Signs'],
            ['recoil_notes', 'Recoil Notes'],
            ['accuracy_notes', 'Accuracy Notes'],
            ['feeding_notes', 'Feeding / Chambering'],
            ['final_comments', 'Final Comments'],
          ].map(([k, label]) => (
            <Field key={k} label={label}>
              <textarea value={form[k] ?? ''} onChange={e => set(k, e.target.value)} rows={2}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none resize-none" />
            </Field>
          ))}
        </div>

        {/* Range Photos */}
        <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase">Range Photos</p>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
              className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline disabled:opacity-50">
              <ImagePlus className="w-3.5 h-3.5" />
              {uploadingPhoto ? 'Uploading…' : 'Add Photos'}
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handlePhotoUpload} />
          {form.photos && form.photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {form.photos.map((url, idx) => (
                <div key={idx} className="relative group aspect-square">
                  <img src={url} alt={`Target ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                  <button type="button" onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full py-6 border-2 border-dashed border-border rounded-xl flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
              <Camera className="w-6 h-6" />
              <span className="text-xs">Take a photo or upload from gallery</span>
            </button>
          )}
        </div>

        {/* Best Result */}
        <label className="flex items-center gap-2.5 cursor-pointer bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <input type="checkbox" checked={form.is_best} onChange={e => set('is_best', e.target.checked)} className="w-4 h-4" />
          <div>
            <p className="text-sm font-semibold">Mark as Best Result</p>
            <p className="text-xs text-muted-foreground">Highlights this variant as the recommended load</p>
          </div>
        </label>
      </div>
    </GlobalModal>
  );
}