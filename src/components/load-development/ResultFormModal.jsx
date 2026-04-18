import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Calculator } from 'lucide-react';

export default function ResultFormModal({ test, variant, result, onClose, onSaved }) {
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
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (result) setForm({ ...form, ...result });
  }, [result]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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

  const Field = ({ label, children }) => (
    <div>
      <label className="block text-[10px] font-semibold text-muted-foreground uppercase mb-1">{label}</label>
      {children}
    </div>
  );

  const Input = ({ field, ...props }) => (
    <input value={form[field] ?? ''} onChange={e => set(field, e.target.value)}
      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none" {...props} />
  );

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold">Test Results</h2>
          <p className="text-sm text-muted-foreground">{variant.label}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg"><X className="w-4 h-4" /></button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Test Date"><Input field="test_date" type="date" /></Field>
          <Field label="Distance (yards)"><Input field="distance_yards" type="number" placeholder="100" /></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Group Size (MOA)"><Input field="group_size_moa" type="number" step="0.01" placeholder="0.75" /></Field>
          <Field label="Group Size (mm)"><Input field="group_size_mm" type="number" step="0.1" placeholder="21" /></Field>
        </div>

        {/* Velocity */}
        <div className="bg-secondary/30 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground uppercase">Chronograph Readings (fps)</p>
            <button onClick={calcVelocityStats}
              className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
              <Calculator className="w-3 h-3" />Calculate
            </button>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[1,2,3,4,5].map(n => (
              <Field key={n} label={`V${n}`}><Input field={`velocity_${n}`} type="number" placeholder="2650" /></Field>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border">
            <Field label="Avg Velocity"><Input field="avg_velocity" type="number" placeholder="auto" /></Field>
            <Field label="ES"><Input field="es" type="number" placeholder="auto" /></Field>
            <Field label="SD"><Input field="sd" type="number" step="0.1" placeholder="auto" /></Field>
          </div>
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

        <label className="flex items-center gap-2.5 cursor-pointer bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <input type="checkbox" checked={form.is_best} onChange={e => set('is_best', e.target.checked)} className="w-4 h-4" />
          <div>
            <p className="text-sm font-semibold">Mark as Best Result</p>
            <p className="text-xs text-muted-foreground">Highlights this variant as the recommended load</p>
          </div>
        </label>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Results'}
          </button>
        </div>
      </div>
    </div>
  );
}