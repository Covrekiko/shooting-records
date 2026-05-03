import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { RotateCcw, Edit2, Plus, AlertTriangle, CheckCircle2, Crosshair, Wrench, Archive } from 'lucide-react';
import { annealBrass, getBrassState, recoverFiredBrass, retireBrass, logBrassMovement, stateUpdate } from '@/lib/brassLifecycle';

export default function BrassLifecycleManager({ brass, onUpdated }) {
  const [editing, setEditing] = useState(null);
  const [maxReloads, setMaxReloads] = useState(brass.reload_limit ?? brass.max_reloads ?? '');
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [movementLogs, setMovementLogs] = useState([]);

  const state = getBrassState(brass);

  useEffect(() => {
    let mounted = true;
    base44.entities.BrassMovementLog.filter({ brass_id: brass.id })
      .then((logs) => {
        if (!mounted) return;
        setMovementLogs((logs || [])
          .sort((a, b) => new Date(b.movement_date || b.created_date) - new Date(a.movement_date || a.created_date))
          .slice(0, 10));
      })
      .catch(() => { if (mounted) setMovementLogs([]); });
    return () => { mounted = false; };
  }, [brass.id]);
  const atLimit = state.reload_limit > 0 && state.reload_cycle_count >= state.reload_limit;
  const nearLimit = state.reload_limit > 0 && state.reload_cycle_count >= state.reload_limit - 1 && !atLimit;

  const run = async (action) => {
    setSaving(true);
    try {
      await action();
      setEditing(null);
      setQuantity('');
      onUpdated();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLimit = () => run(async () => {
    const limit = parseInt(maxReloads) || 0;
    await base44.entities.ReloadingComponent.update(brass.id, { reload_limit: limit, max_reloads: limit });
  });

  const handleManualFired = () => run(async () => {
    const qty = Math.min(parseInt(quantity) || 0, state.currently_loaded);
    if (qty <= 0) return;
    const newState = {
      ...state,
      currently_loaded: state.currently_loaded - qty,
      fired_awaiting_cleaning_or_inspection: state.fired_awaiting_cleaning_or_inspection + qty,
    };
    await base44.entities.ReloadingComponent.update(brass.id, { ...stateUpdate(newState), times_fired: (brass.times_fired || 0) + qty });
    await logBrassMovement({ brassId: brass.id, quantity: qty, movementType: 'manual_fired_brass', previousState: state, newState });
  });

  const handleRecover = () => run(() => recoverFiredBrass(brass, quantity || state.fired_awaiting_cleaning_or_inspection));
  const handleAnneal = () => {
    const confirmed = confirm('Anneal this brass and reset the current reload cycle count? Lifetime reload history will be kept.');
    if (!confirmed) return;
    run(() => annealBrass(brass, true));
  };
  const handleRetire = () => run(() => retireBrass(brass, quantity));

  const ActionInput = ({ action, placeholder = 'qty', onConfirm }) => editing === action ? (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="w-20 px-2 py-1 text-xs border border-border rounded bg-background"
        placeholder={placeholder}
        min="1"
        autoFocus
      />
      <button onClick={onConfirm} disabled={saving} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded font-medium hover:opacity-90">Save</button>
      <button onClick={() => setEditing(null)} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">Cancel</button>
    </div>
  ) : null;

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <div><p className="text-muted-foreground">Total owned</p><p className="font-bold">{state.total_owned}</p></div>
        <div><p className="text-muted-foreground">Available</p><p className="font-bold text-green-700 dark:text-green-400">{state.available_to_reload}</p></div>
        <div><p className="text-muted-foreground">Loaded</p><p className="font-bold text-blue-700 dark:text-blue-400">{state.currently_loaded}</p></div>
        <div><p className="text-muted-foreground">Fired / cleaning</p><p className="font-bold text-amber-700 dark:text-amber-400">{state.fired_awaiting_cleaning_or_inspection}</p></div>
        <div><p className="text-muted-foreground">Retired</p><p className="font-bold text-destructive">{state.retired_or_discarded}</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {atLimit ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-bold"><AlertTriangle className="w-3 h-3" /> Reload limit reached</span>
        ) : nearLimit ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold"><AlertTriangle className="w-3 h-3" /> Near limit ({state.reload_cycle_count}/{state.reload_limit})</span>
        ) : state.reload_limit > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold"><CheckCircle2 className="w-3 h-3" /> {state.reload_cycle_count}/{state.reload_limit} reloads</span>
        ) : (
          <span className="text-xs text-muted-foreground">{state.reload_cycle_count} reloads • No limit set</span>
        )}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground"><Crosshair className="w-3 h-3" /> Lifetime loaded: {state.lifetime_reload_count}</span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground"><Wrench className="w-3 h-3" /> Annealed {state.anneal_count}x{state.last_annealed_date ? ` • ${state.last_annealed_date}` : ''}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {editing === 'limit' ? (
          <div className="flex items-center gap-1">
            <input type="number" value={maxReloads} onChange={(e) => setMaxReloads(e.target.value)} className="w-16 px-2 py-1 text-xs border border-border rounded bg-background" placeholder="5" min="0" autoFocus />
            <button onClick={handleSaveLimit} disabled={saving} className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded font-medium hover:opacity-90">Save</button>
            <button onClick={() => setEditing(null)} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">Cancel</button>
          </div>
        ) : (
          <button onClick={() => { setMaxReloads(state.reload_limit || ''); setEditing('limit'); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-secondary"><Edit2 className="w-3 h-3" /> {state.reload_limit > 0 ? `Limit: ${state.reload_limit}` : 'Set reload limit'}</button>
        )}

        <ActionInput action="manual-fired" onConfirm={handleManualFired} />
        {editing !== 'manual-fired' && state.currently_loaded > 0 && (
          <button onClick={() => { setQuantity(''); setEditing('manual-fired'); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-secondary"><Plus className="w-3 h-3" /> Log fired brass</button>
        )}

        <ActionInput action="recover" onConfirm={handleRecover} />
        {editing !== 'recover' && state.fired_awaiting_cleaning_or_inspection > 0 && (
          <button onClick={() => { setQuantity(String(state.fired_awaiting_cleaning_or_inspection)); setEditing('recover'); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-secondary text-green-700 dark:text-green-400"><RotateCcw className="w-3 h-3" /> Recover fired brass</button>
        )}

        <button onClick={handleAnneal} disabled={saving} className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-secondary text-amber-600 dark:text-amber-400"><Wrench className="w-3 h-3" /> Anneal brass</button>

        <ActionInput action="retire" onConfirm={handleRetire} />
        {editing !== 'retire' && (
          <button onClick={() => { setQuantity(''); setEditing('retire'); }} className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-secondary text-destructive"><Archive className="w-3 h-3" /> Retire brass</button>
        )}
      </div>

      <div className="pt-2 border-t border-border">
        <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Movement History</p>
        {movementLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No movements recorded yet</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {movementLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-border bg-background/60 px-2.5 py-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground break-words">{log.movement_type}</p>
                    <p className="text-muted-foreground">
                      Qty {log.quantity || 0}
                      {log.reload_batch_id ? ` • Batch ${log.reload_batch_id.slice(0, 8)}` : ''}
                      {log.record_id ? ` • Record ${log.record_id.slice(0, 8)}` : ''}
                    </p>
                    {log.notes && <p className="text-muted-foreground mt-0.5 break-words">{log.notes}</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {log.movement_date ? new Date(log.movement_date).toLocaleString() : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}