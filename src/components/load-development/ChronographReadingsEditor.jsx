import { useState } from 'react';
import { Plus, Minus, ClipboardPaste } from 'lucide-react';
import { parsePastedVelocities } from '@/utils/loadDevelopmentStatistics';

const isValidEntry = (v) => {
  const n = parseFloat(v);
  return !isNaN(n) && isFinite(n) && n > 0;
};

export default function ChronographReadingsEditor({ readings, onChange, expectedShots }) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const parsed = parsePastedVelocities(pasteText);
  const recorded = readings.filter(r => isValidEntry(r.velocity)).length;
  const hasInvalid = readings.some(r => String(r.velocity ?? '').trim() !== '' && !isValidEntry(r.velocity));

  const setReading = (i, patch) =>
    onChange(readings.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const applyPaste = () => {
    onChange(parsed.values.map((v, i) => ({ shot_number: i + 1, velocity: String(v), included: true })));
    setPasteOpen(false);
    setPasteText('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Expected rounds: <span className="font-semibold text-foreground">{expectedShots}</span>
          {' · '}Recorded readings: <span className="font-semibold text-foreground">{recorded}</span>
        </span>
        <button type="button" onClick={() => setPasteOpen(o => !o)}
          className="flex items-center gap-1 text-primary font-semibold hover:underline">
          <ClipboardPaste className="w-3 h-3" />Paste Readings
        </button>
      </div>

      {pasteOpen && (
        <div className="border border-border rounded-lg p-2 space-y-2 bg-background">
          <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={3}
            placeholder={'2648\n2654\n2651  (or comma / space separated)'}
            className="w-full px-2 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none resize-none" />
          {pasteText.trim() && (
            <div className="text-xs space-y-1">
              <p>Preview: {parsed.values.length} reading{parsed.values.length !== 1 ? 's' : ''}
                {parsed.values.length > 0 && ` — ${parsed.values.join(', ')}`}</p>
              {parsed.invalid.length > 0 && (
                <p className="text-destructive">Not valid velocities (will be ignored): {parsed.invalid.join(', ')}</p>
              )}
              <p className="text-muted-foreground">Applying will replace the current readings.</p>
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" disabled={parsed.values.length === 0} onClick={applyPaste}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold disabled:opacity-50">
              Apply{parsed.values.length > 0 ? ` (${parsed.values.length})` : ''}
            </button>
            <button type="button" onClick={() => { setPasteOpen(false); setPasteText(''); }}
              className="px-3 py-1.5 bg-secondary rounded-lg text-xs font-semibold">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {readings.map((r, i) => {
          const invalid = String(r.velocity ?? '').trim() !== '' && !isValidEntry(r.velocity);
          const excluded = r.included === false;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Shot {i + 1}</span>
              <input type="text" inputMode="decimal" value={r.velocity ?? ''} placeholder="2650"
                onChange={e => setReading(i, { velocity: e.target.value })}
                className={`flex-1 min-w-0 px-3 py-1.5 bg-background border rounded-lg text-sm focus:outline-none ${invalid ? 'border-destructive' : 'border-border'} ${excluded ? 'opacity-50 line-through' : ''}`} />
              <button type="button" onClick={() => setReading(i, { included: excluded })}
                className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${excluded
                  ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                {excluded ? 'Excluded' : 'Included'}
              </button>
            </div>
          );
        })}
      </div>

      {hasInvalid && (
        <p className="text-xs text-destructive">Invalid readings are highlighted — they will not be saved or used in calculations.</p>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button"
          onClick={() => onChange([...readings, { shot_number: readings.length + 1, velocity: '', included: true }])}
          className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
          <Plus className="w-3 h-3" />Add Reading
        </button>
        {readings.length > 0 && (
          <button type="button" onClick={() => onChange(readings.slice(0, -1))}
            className="flex items-center gap-1 text-xs text-muted-foreground font-semibold hover:underline">
            <Minus className="w-3 h-3" />Remove last reading
          </button>
        )}
      </div>
    </div>
  );
}