import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { RotateCcw, Edit2, Plus, AlertTriangle, CheckCircle2, Crosshair } from 'lucide-react';

/**
 * Inline brass lifecycle panel shown inside a brass card in ComponentManager.
 * Props: brass (component object), onUpdated (callback to reload components)
 */
export default function BrassLifecycleManager({ brass, onUpdated }) {
  const [editing, setEditing] = useState(null); // 'limit' | 'fired' | null
  const [maxReloads, setMaxReloads] = useState(brass.max_reloads || '');
  const [firedCount, setFiredCount] = useState('');
  const [saving, setSaving] = useState(false);

  const timesReloaded = brass.times_reloaded || 0;
  const maxLimit = brass.max_reloads || 0;
  const atLimit = maxLimit > 0 && timesReloaded >= maxLimit;
  const nearLimit = maxLimit > 0 && timesReloaded >= maxLimit - 1 && !atLimit;

  const handleSaveLimit = async () => {
    setSaving(true);
    try {
      await base44.entities.ReloadingComponent.update(brass.id, {
        max_reloads: parseInt(maxReloads) || 0,
      });
      setEditing(null);
      onUpdated();
    } catch (e) {
      alert('Error saving: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetCounter = async () => {
    if (!confirm('Reset the reload counter to 0? Do this after trimming/annealing the brass.')) return;
    setSaving(true);
    try {
      await base44.entities.ReloadingComponent.update(brass.id, {
        times_reloaded: 0,
      });
      onUpdated();
    } catch (e) {
      alert('Error resetting: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogFired = async () => {
    const count = parseInt(firedCount);
    if (!count || count <= 0) return;
    setSaving(true);
    try {
      await base44.entities.ReloadingComponent.update(brass.id, {
        times_fired: (brass.times_fired || 0) + count,
      });
      setEditing(null);
      setFiredCount('');
      onUpdated();
    } catch (e) {
      alert('Error logging: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  // For used brass, show only reload count, hide limit and log fired controls
  const isUsedBrass = brass.is_used_brass;

  return (
    <div className="mt-2 pt-2 border-t border-border space-y-2">
      {/* Status badge */}
      <div className="flex flex-wrap items-center gap-2">
        {isUsedBrass ? (
          <span className="text-xs text-muted-foreground">
            {timesReloaded} reload{timesReloaded !== 1 ? 's' : ''}
          </span>
        ) : atLimit ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-bold">
            <AlertTriangle className="w-3 h-3" /> Reload limit reached — retire or trim
          </span>
        ) : nearLimit ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold">
            <AlertTriangle className="w-3 h-3" /> Near limit ({timesReloaded}/{maxLimit})
          </span>
        ) : maxLimit > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold">
            <CheckCircle2 className="w-3 h-3" /> {timesReloaded}/{maxLimit} reloads
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{timesReloaded} reload{timesReloaded !== 1 ? 's' : ''} • No limit set</span>
        )}
        {!isUsedBrass && brass.times_fired > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-xs text-muted-foreground">
            <Crosshair className="w-3 h-3" /> {brass.times_fired} rounds fired
          </span>
        )}
      </div>

      {/* Actions row — hidden for used brass */}
      {!isUsedBrass && (
      <div className="flex flex-wrap gap-2">
        {/* Set limit */}
        {editing === 'limit' ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={maxReloads}
              onChange={(e) => setMaxReloads(e.target.value)}
              className="w-16 px-2 py-1 text-xs border border-border rounded bg-background"
              placeholder="e.g. 5"
              min="0"
              autoFocus
            />
            <button
              onClick={handleSaveLimit}
              disabled={saving}
              className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded font-medium hover:opacity-90"
            >
              Save
            </button>
            <button onClick={() => setEditing(null)} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setMaxReloads(brass.max_reloads || ''); setEditing('limit'); }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-secondary"
          >
            <Edit2 className="w-3 h-3" />
            {maxLimit > 0 ? `Limit: ${maxLimit}` : 'Set reload limit'}
          </button>
        )}

        {/* Reset counter (after trimming) */}
        {timesReloaded > 0 && (
          <button
            onClick={handleResetCounter}
            disabled={saving}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-secondary text-amber-600 dark:text-amber-400"
          >
            <RotateCcw className="w-3 h-3" />
            Reset after trim
          </button>
        )}

        {/* Log fired rounds */}
        {editing === 'fired' ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">+</span>
            <input
              type="number"
              value={firedCount}
              onChange={(e) => setFiredCount(e.target.value)}
              className="w-16 px-2 py-1 text-xs border border-border rounded bg-background"
              placeholder="rounds"
              min="1"
              autoFocus
            />
            <button
              onClick={handleLogFired}
              disabled={saving}
              className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded font-medium hover:opacity-90"
            >
              Log
            </button>
            <button onClick={() => setEditing(null)} className="px-2 py-1 text-xs border border-border rounded hover:bg-secondary">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setFiredCount(''); setEditing('fired'); }}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-secondary"
          >
            <Plus className="w-3 h-3" />
            Log fired rounds
          </button>
        )}
      </div>
      )}
    </div>
  );
}