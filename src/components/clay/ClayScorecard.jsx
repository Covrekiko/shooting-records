import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { X, Plus, Target, Trash2, Pencil, Download, TableProperties, LayoutList, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportScorecardPDF } from '@/utils/clayScorecardPDF';

const DISCIPLINES = ['Sporting', 'Skeet', 'Trap', 'DTL', 'Compak', 'Five Stand', 'Other'];
const inp = 'w-full px-3 py-3 border border-border rounded-xl bg-background text-sm';

function calcStats(stands) {
  const totalStands = stands.length;
  const totalClays = stands.reduce((s, x) => s + (x.clays_total || 0), 0);
  const totalHits = stands.reduce((s, x) => s + (x.hits || 0), 0);
  const totalMisses = stands.reduce((s, x) => s + (x.misses || 0), 0);
  const totalCartridges = stands.reduce((s, x) => s + (x.shots_used || 0), 0);
  const hitPct = totalClays > 0 ? Math.round((totalHits / totalClays) * 100) : 0;
  const bestStand = stands.reduce((b, x) => (!b || (x.clays_total > 0 && (x.hits / x.clays_total) > (b.hits / b.clays_total))) ? x : b, null);
  const worstStand = stands.reduce((w, x) => (!w || (x.clays_total > 0 && (x.hits / x.clays_total) < (w.hits / w.clays_total))) ? x : w, null);
  return { totalStands, totalClays, totalHits, totalMisses, totalCartridges, hitPct, bestStand, worstStand };
}

// ─── Quick Total Form ─────────────────────────────────────────────
function QuickTotalForm({ form, setForm, error }) {
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleHitsChange = (val) => {
    const hits = Math.max(0, Math.min(parseInt(val) || 0, form.clays_total));
    set('hits', hits);
    set('misses', (form.clays_total || 0) - hits);
  };
  const handleClaysChange = (val) => {
    const clays = parseInt(val) || 0;
    const hits = Math.min(form.hits || 0, clays);
    setForm(f => ({ ...f, clays_total: clays, hits, misses: clays - hits, shots_used: Math.max(f.shots_used || 0, clays) }));
  };
  return (
    <>
      <div>
        <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Clays</label>
        <input type="number" min="1" value={form.clays_total} onChange={e => handleClaysChange(e.target.value)} className={inp} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Hits</label>
          <input type="number" min="0" max={form.clays_total} value={form.hits} onChange={e => handleHitsChange(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Misses</label>
          <input type="number" min="0" value={form.misses} readOnly className={`${inp} bg-muted`} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Shots Used</label>
          <input type="number" min={form.clays_total} value={form.shots_used} onChange={e => set('shots_used', parseInt(e.target.value) || 0)} className={inp} />
        </div>
      </div>
      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
    </>
  );
}

// ─── Add/Edit Stand Form ──────────────────────────────────────────
function StandForm({ stand, standNumber, onSave, onCancel }) {
  const [form, setForm] = useState(stand ? { ...stand } : {
    stand_number: standNumber,
    discipline_type: 'Sporting',
    scoring_method: 'quick_total',
    clays_total: 25,
    shots_used: 25,
    hits: 0,
    misses: 25,
    notes: '',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.stand_number || form.stand_number < 1) { setError('Stand number must be at least 1'); return; }
    if (form.scoring_method === 'quick_total') {
      if ((form.hits || 0) + (form.misses || 0) !== (form.clays_total || 0)) {
        setError('Hits + Misses must equal total clays'); return;
      }
    }
    const hitPct = form.clays_total > 0 ? Math.round((form.hits / form.clays_total) * 100) : 0;
    onSave({ ...form, hit_percentage: hitPct });
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

      {/* Scoring method selector */}
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
        <QuickTotalForm form={form} setForm={setForm} error={error} />
      ) : (
        <div className="bg-secondary/50 rounded-xl p-3 text-sm text-muted-foreground text-center">
          Shot-by-shot recording will be available on the stand card after saving.
        </div>
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

// ─── Shot-by-Shot Card ────────────────────────────────────────────
function ShotByShotCard({ stand, shots, onAddShot, onRemoveShot, onEdit, onDelete }) {
  const hits = shots.filter(s => s.result === 'hit').length;
  const misses = shots.filter(s => s.result === 'miss').length;
  const total = shots.length;
  const pct = total > 0 ? Math.round((hits / total) * 100) : 0;
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-base">Stand {stand.stand_number}</span>
          <span className="ml-2 text-xs bg-secondary px-2 py-0.5 rounded-full">{stand.discipline_type}</span>
          <span className="ml-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Shot-by-Shot</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setExpanded(e => !e)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button onClick={onEdit} className="p-2 hover:bg-secondary rounded-lg transition-colors"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
          <button onClick={onDelete} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-destructive/60" /></button>
        </div>
      </div>

      {/* Score summary */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2.5 text-center">
          <p className="text-xl font-black text-emerald-600">{hits}</p>
          <p className="text-xs text-muted-foreground">Hits</p>
        </div>
        <div className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-2.5 text-center">
          <p className="text-xl font-black text-red-500">{misses}</p>
          <p className="text-xs text-muted-foreground">Misses</p>
        </div>
        <div className="flex-1 bg-secondary rounded-xl p-2.5 text-center">
          <p className="text-xl font-black">{total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="flex-1 bg-primary/10 rounded-xl p-2.5 text-center">
          <p className="text-xl font-black text-primary">{pct}%</p>
          <p className="text-xs text-muted-foreground">Hit %</p>
        </div>
      </div>

      {expanded && (
        <>
          {/* Shot sequence display */}
          {shots.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {shots.map(shot => (
                <div key={shot.id}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 ${shot.result === 'hit' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-red-500 text-white border-red-600'}`}
                  title={`Shot ${shot.shot_number}: ${shot.result}`}>
                  {shot.shot_number}
                </div>
              ))}
            </div>
          )}

          {/* Record next shot */}
          <div className="grid grid-cols-3 gap-2">
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => onAddShot('hit')}
              className="py-3.5 bg-emerald-500 text-white rounded-xl font-bold text-sm">
              ✓ Hit
            </motion.button>
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => onAddShot('miss')}
              className="py-3.5 bg-red-500 text-white rounded-xl font-bold text-sm">
              ✗ Miss
            </motion.button>
            <motion.button whileTap={{ scale: 0.92 }} onClick={onRemoveShot}
              disabled={shots.length === 0}
              className="py-3.5 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm disabled:opacity-40">
              Undo
            </motion.button>
          </div>
        </>
      )}

      {stand.notes && <p className="text-xs text-muted-foreground mt-2 italic">{stand.notes}</p>}
    </div>
  );
}

// ─── Quick Total Stand Card ───────────────────────────────────────
function QuickStandCard({ stand, onHit, onMiss, onUndo, onEdit, onDelete }) {
  const pct = stand.clays_total > 0 ? Math.round((stand.hits / stand.clays_total) * 100) : 0;
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-base">Stand {stand.stand_number}</span>
          <span className="ml-2 text-xs bg-secondary px-2 py-0.5 rounded-full">{stand.discipline_type}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-2 hover:bg-secondary rounded-lg transition-colors"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
          <button onClick={onDelete} className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-destructive/60" /></button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-emerald-600">{stand.hits}</p>
          <p className="text-xs text-muted-foreground">Hits</p>
        </div>
        <div className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-red-500">{stand.misses}</p>
          <p className="text-xs text-muted-foreground">Misses</p>
        </div>
        <div className="flex-1 bg-secondary rounded-xl p-3 text-center">
          <p className="text-2xl font-black">{stand.clays_total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="flex-1 bg-primary/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-primary">{pct}%</p>
          <p className="text-xs text-muted-foreground">Hit %</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <motion.button whileTap={{ scale: 0.92 }} onClick={onHit}
          disabled={stand.hits >= stand.clays_total}
          className="py-3.5 bg-emerald-500 text-white rounded-xl font-bold text-sm disabled:opacity-40">
          ✓ Hit
        </motion.button>
        <motion.button whileTap={{ scale: 0.92 }} onClick={onMiss}
          disabled={stand.misses >= stand.clays_total}
          className="py-3.5 bg-red-500 text-white rounded-xl font-bold text-sm disabled:opacity-40">
          ✗ Miss
        </motion.button>
        <motion.button whileTap={{ scale: 0.92 }} onClick={onUndo}
          className="py-3.5 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm">
          Undo
        </motion.button>
      </div>
      {stand.shots_used > stand.clays_total && (
        <p className="text-xs text-muted-foreground mt-2">Shots used: {stand.shots_used}</p>
      )}
      {stand.notes && <p className="text-xs text-muted-foreground mt-1 italic">{stand.notes}</p>}
    </div>
  );
}

// ─── Scorecard Table View ─────────────────────────────────────────
function ScorecardTable({ stands, stats, onEdit }) {
  if (stands.length === 0) return <p className="text-center text-muted-foreground py-8 text-sm">No stands recorded yet.</p>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary text-left">
            <th className="px-3 py-2.5 font-bold text-xs uppercase tracking-wide text-muted-foreground">#</th>
            <th className="px-3 py-2.5 font-bold text-xs uppercase tracking-wide text-muted-foreground">Disc.</th>
            <th className="px-3 py-2.5 font-bold text-xs uppercase tracking-wide text-muted-foreground">Method</th>
            <th className="px-3 py-2.5 font-bold text-xs uppercase tracking-wide text-muted-foreground text-center">Clays</th>
            <th className="px-3 py-2.5 font-bold text-xs uppercase tracking-wide text-emerald-600 text-center">Hits</th>
            <th className="px-3 py-2.5 font-bold text-xs uppercase tracking-wide text-red-500 text-center">Miss</th>
            <th className="px-3 py-2.5 font-bold text-xs uppercase tracking-wide text-muted-foreground text-center">%</th>
            <th className="px-2 py-2.5 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {stands.map((stand, i) => {
            const pct = stand.clays_total > 0 ? Math.round((stand.hits / stand.clays_total) * 100) : 0;
            const isBest = stats.bestStand?.id === stand.id && stands.length > 1;
            const isWorst = stats.worstStand?.id === stand.id && stands.length > 1 && stats.worstStand?.id !== stats.bestStand?.id;
            return (
              <tr key={stand.id} className={`border-t border-border ${isBest ? 'bg-emerald-50 dark:bg-emerald-900/10' : isWorst ? 'bg-red-50 dark:bg-red-900/10' : i % 2 === 0 ? 'bg-background' : 'bg-secondary/30'}`}>
                <td className="px-3 py-2.5 font-bold">
                  {stand.stand_number}{isBest && ' 🏆'}{isWorst && ' ↓'}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{stand.discipline_type}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {stand.scoring_method === 'shot_by_shot' ? '🎯 S-by-S' : '📋 Quick'}
                </td>
                <td className="px-3 py-2.5 text-center font-semibold">{stand.clays_total}</td>
                <td className="px-3 py-2.5 text-center font-bold text-emerald-600">{stand.hits}</td>
                <td className="px-3 py-2.5 text-center font-bold text-red-500">{stand.misses}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${pct >= 75 ? 'bg-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                    {pct}%
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  <button onClick={() => onEdit(stand)} className="p-1 hover:bg-secondary rounded-lg"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </td>
              </tr>
            );
          })}
          <tr className="border-t-2 border-border bg-primary/5 font-bold">
            <td className="px-3 py-2.5 text-xs uppercase tracking-wide text-muted-foreground" colSpan={3}>Total</td>
            <td className="px-3 py-2.5 text-center">{stats.totalClays}</td>
            <td className="px-3 py-2.5 text-center text-emerald-600">{stats.totalHits}</td>
            <td className="px-3 py-2.5 text-center text-red-500">{stats.totalMisses}</td>
            <td className="px-3 py-2.5 text-center">
              <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${stats.hitPct >= 75 ? 'bg-emerald-100 text-emerald-700' : stats.hitPct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                {stats.hitPct}%
              </span>
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Scorecard Modal ─────────────────────────────────────────
export default function ClayScorecard({ session, shotguns, ammunition, onClose }) {
  const [scorecard, setScorecard] = useState(null);
  const [stands, setStands] = useState([]);
  // shots keyed by stand id
  const [shotsMap, setShotsMap] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStand, setEditingStand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('tap');
  const [lastActions, setLastActions] = useState({});

  useEffect(() => { loadScorecard(); }, [session.id]);

  const loadScorecard = async () => {
    setLoading(true);
    const existing = await base44.entities.ClayScorecard.filter({ clay_session_id: session.id });
    let sc = existing[0];
    if (!sc) sc = await base44.entities.ClayScorecard.create({ clay_session_id: session.id });
    setScorecard(sc);
    const standsData = await base44.entities.ClayStand.filter({ clay_scorecard_id: sc.id });
    const sorted = standsData.sort((a, b) => a.stand_number - b.stand_number);
    setStands(sorted);
    // load shots for shot-by-shot stands
    const sbsStands = sorted.filter(s => s.scoring_method === 'shot_by_shot');
    const map = {};
    await Promise.all(sbsStands.map(async stand => {
      const shots = await base44.entities.ClayShot.filter({ clay_stand_id: stand.id });
      map[stand.id] = shots.sort((a, b) => a.shot_number - b.shot_number);
    }));
    setShotsMap(map);
    setLoading(false);
  };

  const saveScorecard = async (newStands, sc = scorecard) => {
    const stats = calcStats(newStands);
    await base44.entities.ClayScorecard.update(sc.id, {
      total_stands: stats.totalStands,
      total_clays: stats.totalClays,
      total_hits: stats.totalHits,
      total_misses: stats.totalMisses,
      total_cartridges_used: stats.totalCartridges,
      hit_percentage: stats.hitPct,
    });
  };

  const handleAddStand = async (formData) => {
    const hitPct = formData.clays_total > 0 ? Math.round((formData.hits / formData.clays_total) * 100) : 0;
    const newStand = await base44.entities.ClayStand.create({ ...formData, hit_percentage: hitPct, clay_scorecard_id: scorecard.id });
    if (newStand.scoring_method === 'shot_by_shot') {
      setShotsMap(prev => ({ ...prev, [newStand.id]: [] }));
    }
    const newStands = [...stands, newStand].sort((a, b) => a.stand_number - b.stand_number);
    setStands(newStands);
    await saveScorecard(newStands);
    setShowAddForm(false);
  };

  const handleEditStand = async (formData) => {
    await base44.entities.ClayStand.update(editingStand.id, formData);
    const updated = { ...editingStand, ...formData };
    const newStands = stands.map(s => s.id === editingStand.id ? updated : s).sort((a, b) => a.stand_number - b.stand_number);
    setStands(newStands);
    await saveScorecard(newStands);
    setEditingStand(null);
  };

  const handleDeleteStand = async (standId) => {
    if (!confirm('Delete this stand?')) return;
    await base44.entities.ClayStand.delete(standId);
    const newStands = stands.filter(s => s.id !== standId);
    setStands(newStands);
    setShotsMap(prev => { const m = { ...prev }; delete m[standId]; return m; });
    await saveScorecard(newStands);
  };

  // ── Shot-by-Shot handlers ──
  const handleAddShot = async (stand, result) => {
    const existingShots = shotsMap[stand.id] || [];
    const shotNumber = existingShots.length + 1;
    const newShot = await base44.entities.ClayShot.create({ clay_stand_id: stand.id, shot_number: shotNumber, result });
    const newShots = [...existingShots, newShot];
    const hits = newShots.filter(s => s.result === 'hit').length;
    const misses = newShots.filter(s => s.result === 'miss').length;
    const clays_total = newShots.length;
    const hit_percentage = Math.round((hits / clays_total) * 100);
    await base44.entities.ClayStand.update(stand.id, { hits, misses, clays_total, shots_used: clays_total, hit_percentage });
    setShotsMap(prev => ({ ...prev, [stand.id]: newShots }));
    const newStands = stands.map(s => s.id === stand.id ? { ...s, hits, misses, clays_total, shots_used: clays_total, hit_percentage } : s);
    setStands(newStands);
    await saveScorecard(newStands);
  };

  const handleRemoveShot = async (stand) => {
    const existingShots = shotsMap[stand.id] || [];
    if (existingShots.length === 0) return;
    const lastShot = existingShots[existingShots.length - 1];
    await base44.entities.ClayShot.delete(lastShot.id);
    const newShots = existingShots.slice(0, -1);
    const hits = newShots.filter(s => s.result === 'hit').length;
    const misses = newShots.filter(s => s.result === 'miss').length;
    const clays_total = newShots.length;
    const hit_percentage = clays_total > 0 ? Math.round((hits / clays_total) * 100) : 0;
    await base44.entities.ClayStand.update(stand.id, { hits, misses, clays_total, shots_used: clays_total, hit_percentage });
    setShotsMap(prev => ({ ...prev, [stand.id]: newShots }));
    const newStands = stands.map(s => s.id === stand.id ? { ...s, hits, misses, clays_total, shots_used: clays_total, hit_percentage } : s);
    setStands(newStands);
    await saveScorecard(newStands);
  };

  // ── Quick Total tap handlers ──
  const handleHit = async (stand) => {
    if (stand.hits >= stand.clays_total) return;
    const updated = { ...stand, hits: stand.hits + 1, misses: stand.misses - 1, hit_percentage: Math.round(((stand.hits + 1) / stand.clays_total) * 100) };
    setLastActions(prev => ({ ...prev, [stand.id]: 'hit' }));
    await base44.entities.ClayStand.update(stand.id, { hits: updated.hits, misses: updated.misses, hit_percentage: updated.hit_percentage });
    const newStands = stands.map(s => s.id === stand.id ? updated : s);
    setStands(newStands);
    await saveScorecard(newStands);
  };

  const handleMiss = async (stand) => {
    if (stand.misses >= stand.clays_total) return;
    const updated = { ...stand, misses: stand.misses + 1, hits: stand.hits - 1, hit_percentage: Math.round(((stand.hits - 1) / stand.clays_total) * 100) };
    setLastActions(prev => ({ ...prev, [stand.id]: 'miss' }));
    await base44.entities.ClayStand.update(stand.id, { hits: updated.hits, misses: updated.misses, hit_percentage: updated.hit_percentage });
    const newStands = stands.map(s => s.id === stand.id ? updated : s);
    setStands(newStands);
    await saveScorecard(newStands);
  };

  const handleUndo = async (stand) => {
    const lastAction = lastActions[stand.id];
    if (!lastAction) return;
    const updated = lastAction === 'hit'
      ? { ...stand, hits: stand.hits - 1, misses: stand.misses + 1, hit_percentage: Math.round(((stand.hits - 1) / stand.clays_total) * 100) }
      : { ...stand, misses: stand.misses - 1, hits: stand.hits + 1, hit_percentage: Math.round(((stand.hits + 1) / stand.clays_total) * 100) };
    setLastActions(prev => ({ ...prev, [stand.id]: null }));
    await base44.entities.ClayStand.update(stand.id, { hits: updated.hits, misses: updated.misses, hit_percentage: updated.hit_percentage });
    const newStands = stands.map(s => s.id === stand.id ? updated : s);
    setStands(newStands);
    await saveScorecard(newStands);
  };

  const stats = calcStats(stands);
  const shotgun = shotguns?.find(s => s.id === session.shotgun_id);
  const ammo = ammunition?.find(a => a.id === session.ammunition_id);
  const nextStandNumber = stands.length > 0 ? Math.max(...stands.map(s => s.stand_number)) + 1 : 1;

  return createPortal(
    <div className="fixed inset-0 z-[60000] bg-black/60 flex flex-col">
      <div className="flex-1 bg-background overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> Clay Scorecard</h2>
              <p className="text-xs text-muted-foreground">{session.location_name} · {session.date}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => exportScorecardPDF(session, stands, stats, shotgun, ammo, shotsMap)}
                className="p-2 hover:bg-secondary rounded-xl transition-colors" title="Download PDF">
                <Download className="w-5 h-5" />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex gap-1 mt-2 bg-secondary rounded-xl p-1">
            <button onClick={() => setView('tap')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${view === 'tap' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
              <LayoutList className="w-3.5 h-3.5" /> Tap to Score
            </button>
            <button onClick={() => setView('table')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${view === 'table' ? 'bg-background shadow text-foreground' : 'text-muted-foreground'}`}>
              <TableProperties className="w-3.5 h-3.5" /> Scorecard
            </button>
          </div>
        </div>

        <div className="px-4 py-4 pb-8 space-y-4 max-w-xl mx-auto">
          {(shotgun || ammo || session.ammunition_used) && (
            <div className="bg-card border border-border rounded-2xl p-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {shotgun && <span><span className="text-muted-foreground">Shotgun:</span> {shotgun.name}</span>}
              {(ammo || session.ammunition_used) && <span><span className="text-muted-foreground">Cartridge:</span> {ammo ? `${ammo.brand}${ammo.caliber ? ` (${ammo.caliber})` : ''}` : session.ammunition_used}</span>}
            </div>
          )}

          {/* Total score banner */}
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-primary uppercase tracking-wide">Total Score</p>
              <span className="text-3xl font-black">{stats.totalHits} / {stats.totalClays}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div><p className="font-bold text-base">{stats.hitPct}%</p><p className="text-muted-foreground">Hit Rate</p></div>
              <div><p className="font-bold text-base">{stats.totalStands}</p><p className="text-muted-foreground">Stands</p></div>
              <div><p className="font-bold text-base text-red-500">{stats.totalMisses}</p><p className="text-muted-foreground">Misses</p></div>
              <div><p className="font-bold text-base">{stats.totalCartridges}</p><p className="text-muted-foreground">Shells</p></div>
            </div>
            {stats.bestStand && stands.length > 1 && (
              <div className="mt-2 flex gap-3 text-xs flex-wrap">
                <span className="text-emerald-600 font-medium">🏆 Best: Stand {stats.bestStand.stand_number} ({stats.bestStand.hits}/{stats.bestStand.clays_total})</span>
                {stats.worstStand?.id !== stats.bestStand?.id && (
                  <span className="text-red-500 font-medium">↓ Worst: Stand {stats.worstStand.stand_number} ({stats.worstStand.hits}/{stats.worstStand.clays_total})</span>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : view === 'table' ? (
            <>
              <ScorecardTable stands={stands} stats={stats} onEdit={(s) => { setEditingStand(s); setView('tap'); }} />
              {editingStand && (
                <StandForm stand={editingStand} standNumber={editingStand.stand_number} onSave={handleEditStand} onCancel={() => setEditingStand(null)} />
              )}
            </>
          ) : (
            <>
              <AnimatePresence>
                {stands.map(stand => (
                  editingStand?.id === stand.id ? (
                    <StandForm key={stand.id} stand={stand} standNumber={stand.stand_number} onSave={handleEditStand} onCancel={() => setEditingStand(null)} />
                  ) : stand.scoring_method === 'shot_by_shot' ? (
                    <motion.div key={stand.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <ShotByShotCard
                        stand={stand}
                        shots={shotsMap[stand.id] || []}
                        onAddShot={(result) => handleAddShot(stand, result)}
                        onRemoveShot={() => handleRemoveShot(stand)}
                        onEdit={() => setEditingStand(stand)}
                        onDelete={() => handleDeleteStand(stand.id)}
                      />
                    </motion.div>
                  ) : (
                    <motion.div key={stand.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <QuickStandCard
                        stand={stand}
                        onHit={() => handleHit(stand)}
                        onMiss={() => handleMiss(stand)}
                        onUndo={() => handleUndo(stand)}
                        onEdit={() => setEditingStand(stand)}
                        onDelete={() => handleDeleteStand(stand.id)}
                      />
                    </motion.div>
                  )
                ))}
              </AnimatePresence>

              {showAddForm ? (
                <StandForm standNumber={nextStandNumber} onSave={handleAddStand} onCancel={() => setShowAddForm(false)} />
              ) : (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowAddForm(true)}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base flex items-center justify-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Stand
                </motion.button>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}