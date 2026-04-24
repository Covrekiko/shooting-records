import { useState, useCallback } from 'react';
import ShotByShotEditor from './ShotByShotEditor';

const inp = 'w-full px-3 py-3 border border-border rounded-xl bg-background text-sm';
const DISCIPLINES = ['Sporting', 'Skeet', 'Trap', 'DTL', 'Compak', 'Five Stand', 'Other'];

/**
 * StandFormWrapper: A wrapper that manages stand form state and conditionally renders
 * ShotByShotEditor. This avoids calling hooks conditionally.
 */
export default function StandFormWrapper({ stand, standNumber, onSave, onCancel, initialShots }) {
  const [form, setForm] = useState(stand ? { ...stand } : {
    stand_number: standNumber,
    discipline_type: 'Sporting',
    scoring_method: 'quick_total',
    clays_total: 0,
    shots_used: 0,
    hits: 0,
    misses: 0,
    no_birds: 0,
    valid_scored_clays: 0,
    notes: '',
  });
  const [error, setError] = useState('');
  const [totalShots, setTotalShots] = useState(() => {
    if (initialShots && initialShots.length > 0) {
      return initialShots.filter(s => s.result !== 'no_bird').length || 10;
    }
    return (stand?.valid_scored_clays || stand?.shots_used) || 10;
  });
  const [shotResults, setShotResults] = useState(() => {
    if (initialShots && initialShots.length > 0) {
      return initialShots.filter(s => s.result !== 'no_bird').map(s => s.result);
    }
    return Array(10).fill(null);
  });
  const [shotMeta, setShotMeta] = useState(() => {
    if (initialShots && initialShots.length > 0) {
      return initialShots.filter(s => s.result !== 'no_bird').map(s => ({
        input_method: s.input_method || 'manual',
        voice_confidence_score: s.voice_confidence_score,
        voice_timestamp: s.voice_timestamp,
      }));
    }
    return Array(10).fill({ input_method: 'manual' });
  });
  const [noBirds, setNoBirds] = useState(() => {
    if (initialShots && initialShots.length > 0) {
      return initialShots.filter(s => s.result === 'no_bird').length;
    }
    return stand?.no_birds || 0;
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleTotalShotsChange = (val) => {
    const n = Math.max(1, parseInt(val) || 1);
    setTotalShots(n);
    setShotResults(prev => {
      const arr = [...prev];
      while (arr.length < n) arr.push(null);
      return arr.slice(0, n);
    });
    setShotMeta(prev => {
      const arr = [...prev];
      while (arr.length < n) arr.push({ input_method: 'manual' });
      return arr.slice(0, n);
    });
  };

  const handleShotResultsChange = (updated) => {
    setShotResults(updated);
  };

  const handleUndoLast = () => {
    setShotResults(prev => {
      const arr = [...prev];
      for (let i = arr.length - 1; i >= 0; i--) {
        if (arr[i] !== null) { arr[i] = null; break; }
      }
      return arr;
    });
  };

  const handleResetAll = () => {
    setShotResults(Array(totalShots).fill(null));
    setShotMeta(Array(totalShots).fill({ input_method: 'manual' }));
  };

  const handleSubmit = () => {
    if (!form.stand_number || form.stand_number < 1) { setError('Stand number must be at least 1'); return; }
    if (form.scoring_method === 'shot_by_shot') {
      const hits = shotResults.filter(r => r === 'dead').length;
      const misses = shotResults.filter(r => r === 'lost').length;
      const valid = hits + misses;
      const hitPct = valid > 0 ? Math.round((hits / valid) * 100) : 0;
      const fullShots = [
        ...shotResults.map((r, i) => ({
          shot_number: i + 1,
          result: r || 'miss',
          input_method: shotMeta?.[i]?.input_method || 'manual',
          voice_timestamp: shotMeta?.[i]?.voice_timestamp || null,
          voice_confidence_score: shotMeta?.[i]?.voice_confidence_score || null,
        })),
        ...Array.from({ length: noBirds }, (_, i) => ({
          shot_number: shotResults.length + i + 1,
          result: 'no_bird',
          input_method: 'manual',
        })),
      ];
      onSave({
        ...form,
        hits,
        misses,
        no_birds: noBirds,
        valid_scored_clays: valid,
        clays_total: valid + noBirds,
        shots_used: valid,
        hit_percentage: hitPct,
        _shotResults: fullShots,
      });
    } else {
      const valid = (form.hits || 0) + (form.misses || 0);
      const hitPct = valid > 0 ? Math.round(((form.hits || 0) / valid) * 100) : 0;
      onSave({ ...form, valid_scored_clays: valid, clays_total: valid + (form.no_birds || 0), hit_percentage: hitPct });
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <h3 className="font-bold text-base">{stand ? 'Edit Stand' : 'Add Stand'}</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Stand Number</label>
          <input type="number" min="1" value={form.stand_number} onChange={e => set('stand_number', parseInt(e.target.value) || 1)} className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Discipline</label>
          <select value={form.discipline_type} onChange={e => set('discipline_type', e.target.value)} className={inp}>
            {DISCIPLINES.map(d => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Scoring Method</label>
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          <button type="button" onClick={() => set('scoring_method', 'quick_total')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${form.scoring_method === 'quick_total' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
            Quick Total Entry
          </button>
          <button type="button" onClick={() => set('scoring_method', 'shot_by_shot')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${form.scoring_method === 'shot_by_shot' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
            Shot-by-Shot
          </button>
        </div>
      </div>

      {form.scoring_method === 'quick_total' ? (
        <QuickTotalFormInline form={form} setForm={setForm} error={error} />
      ) : (
        <ShotByShotEditorSection
          totalShots={totalShots}
          onTotalShotsChange={handleTotalShotsChange}
          shotResults={shotResults}
          shotMeta={shotMeta}
          noBirds={noBirds}
          onShotResultsChange={handleShotResultsChange}
          onNoBirdsChange={setNoBirds}
          onShotMeta={setShotMeta}
          onUndoLast={handleUndoLast}
          onResetAll={handleResetAll}
          error={error}
        />
      )}

      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</label>
        <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows="2" className={inp} placeholder="Optional notes…" />
      </div>

      <div className="flex gap-2">
        <button onClick={handleSubmit} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm">Save Stand</button>
        <button onClick={onCancel} className="flex-1 py-3 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm">Cancel</button>
      </div>
    </div>
  );
}

/**
 * QuickTotalFormInline: Quick total form fields
 */
function QuickTotalFormInline({ form, setForm, error }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleChange = (field, val) => {
    const hits = field === 'hits' ? Math.max(0, parseInt(val) || 0) : (form.hits || 0);
    const misses = field === 'misses' ? Math.max(0, parseInt(val) || 0) : (form.misses || 0);
    const noBirds = field === 'no_birds' ? Math.max(0, parseInt(val) || 0) : (form.no_birds || 0);
    const validScored = hits + misses;
    const clays_total = validScored + noBirds;
    const hitPct = validScored > 0 ? Math.round((hits / validScored) * 100) : 0;
    setForm(f => ({ ...f, hits, misses, no_birds: noBirds, valid_scored_clays: validScored, clays_total, hit_percentage: hitPct }));
  };

  const inp = 'w-full px-3 py-3 border border-border rounded-xl bg-background text-sm';

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Hits</label>
          <input type="number" min="0" value={form.hits || 0} onChange={e => handleChange('hits', e.target.value)} className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Misses</label>
          <input type="number" min="0" value={form.misses || 0} onChange={e => handleChange('misses', e.target.value)} className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">No Birds</label>
          <input type="number" min="0" value={form.no_birds || 0} onChange={e => handleChange('no_birds', e.target.value)} className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Shots Used</label>
          <input type="number" min="0" value={form.shots_used || 0} onChange={e => set('shots_used', parseInt(e.target.value) || 0)} className={inp} />
        </div>
      </div>
      <div className="bg-secondary/60 rounded-xl px-3 py-2 text-xs text-muted-foreground">
        Valid scored: {(form.hits || 0) + (form.misses || 0)} clays · Total including no birds: {(form.hits || 0) + (form.misses || 0) + (form.no_birds || 0)}
      </div>
      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
    </>
  );
}

/**
 * ShotByShotEditorSection: Wrapper that only mounts ShotByShotEditor when needed
 */
function ShotByShotEditorSection({ totalShots, onTotalShotsChange, shotResults, shotMeta, noBirds, onShotResultsChange, onNoBirdsChange, onShotMeta, onUndoLast, onResetAll, error }) {
  const inp = 'w-full px-3 py-3 border border-border rounded-xl bg-background text-sm';
  
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Shots / Clays</label>
        <input type="number" min="1" max="50" value={totalShots} onChange={e => onTotalShotsChange(e.target.value)} className={inp} />
      </div>
      <ShotByShotEditor
        totalShots={totalShots}
        shots={shotResults}
        shotMeta={shotMeta}
        noBirds={noBirds}
        onChange={onShotResultsChange}
        onNoBirdsChange={onNoBirdsChange}
        onShotMeta={onShotMeta}
      />
      <div className="flex gap-2">
        <button type="button" onClick={onUndoLast}
          className="flex-1 py-2 bg-secondary text-secondary-foreground rounded-xl text-xs font-semibold">
          ↩ Undo Last
        </button>
        <button type="button" onClick={onResetAll}
          className="flex-1 py-2 bg-secondary text-secondary-foreground rounded-xl text-xs font-semibold">
          ✕ Reset All
        </button>
      </div>
      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
    </div>
  );
}