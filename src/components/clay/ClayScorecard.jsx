import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { X, Plus, Target, Trash2, Pencil, Download, TableProperties, LayoutList, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportScorecardPDF } from '@/utils/clayScorecardPDF';
import StandFormWrapper from './StandFormWrapper';

const DISCIPLINES = ['Sporting', 'Skeet', 'Trap', 'DTL', 'Compak', 'Five Stand', 'Other'];
const inp = 'w-full px-3 py-3 border border-border rounded-xl bg-background text-sm';

// ─── Stats calculation (no birds excluded from hit % calc) ────────
function calcStats(stands) {
  const totalStands = stands.length;
  const totalHits = stands.reduce((s, x) => s + (x.hits || 0), 0);
  const totalMisses = stands.reduce((s, x) => s + (x.misses || 0), 0);
  const totalNoBirds = stands.reduce((s, x) => s + (x.no_birds || 0), 0);
  const totalValidScored = stands.reduce((s, x) => s + (x.valid_scored_clays || (x.hits || 0) + (x.misses || 0)), 0);
  const totalClays = stands.reduce((s, x) => s + (x.clays_total || 0), 0);
  const totalCartridges = stands.reduce((s, x) => s + (x.shots_used || 0), 0);
  const hitPct = totalValidScored > 0 ? Math.round((totalHits / totalValidScored) * 100) : 0;
  const bestStand = stands.reduce((b, x) => {
    const xValid = (x.hits || 0) + (x.misses || 0);
    const bValid = b ? (b.hits || 0) + (b.misses || 0) : 0;
    return (!b || (xValid > 0 && (x.hits / xValid) > (b.hits / bValid))) ? x : b;
  }, null);
  const worstStand = stands.reduce((w, x) => {
    const xValid = (x.hits || 0) + (x.misses || 0);
    const wValid = w ? (w.hits || 0) + (w.misses || 0) : 0;
    return (!w || (xValid > 0 && (x.hits / xValid) < (w.hits / wValid))) ? x : w;
  }, null);
  return { totalStands, totalHits, totalMisses, totalNoBirds, totalValidScored, totalClays, totalCartridges, hitPct, bestStand, worstStand };
}

function standHitPct(stand) {
  const valid = (stand.hits || 0) + (stand.misses || 0);
  return valid > 0 ? Math.round(((stand.hits || 0) / valid) * 100) : 0;
}

// ─── Quick Total Form ─────────────────────────────────────────────
function QuickTotalForm({ form, setForm, error }) {
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





// ─── Shot-by-Shot Card (Read-Only) ────────────────────────────
function ShotByShotCardReadOnly({ stand, shots, onEdit }) {
  const hits = shots.filter(s => s.result === 'dead').length;
  const misses = shots.filter(s => s.result === 'lost').length;
  const noBirds = shots.filter(s => s.result === 'no_bird').length;
  const validScored = hits + misses;
  const pct = validScored > 0 ? Math.round((hits / validScored) * 100) : 0;

  const shotColor = (result) => {
    if (result === 'dead') return 'bg-emerald-500 text-white';
    if (result === 'lost') return 'bg-red-500 text-white';
    return 'bg-amber-400 text-white';
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-base">Stand {stand.stand_number}</span>
          <span className="ml-2 text-xs bg-secondary px-2 py-0.5 rounded-full">{stand.discipline_type}</span>
        </div>
        <button onClick={onEdit} className="p-2 hover:bg-secondary rounded-lg"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2.5 text-center">
          <p className="text-xl font-black text-emerald-600">{hits}</p>
          <p className="text-xs text-muted-foreground">Dead</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-2.5 text-center">
          <p className="text-xl font-black text-red-500">{misses}</p>
          <p className="text-xs text-muted-foreground">Lost</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-center">
          <p className="text-xl font-black text-amber-600">{noBirds}</p>
          <p className="text-xs text-muted-foreground">No Bird</p>
        </div>
        <div className="bg-primary/10 rounded-xl p-2.5 text-center">
          <p className="text-xl font-black text-primary">{pct}%</p>
          <p className="text-xs text-muted-foreground">Score</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Score: {hits}/{validScored} valid</p>

      {shots.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {shots.map(shot => (
            <div key={shot.id}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${shotColor(shot.result)}`}
              title={`Shot ${shot.shot_number}: ${shot.result}`}>
              {shot.shot_number}
            </div>
          ))}
        </div>
      )}

      {stand.notes && <p className="text-xs text-muted-foreground mt-2 italic">{stand.notes}</p>}
    </div>
  );
}

// ─── Shot-by-Shot Card (Editing) ──────────────────────────────
function ShotByShotCard({ stand, shots, onAddShot, onRemoveShot, onEdit, onDelete }) {
  const hits = shots.filter(s => s.result === 'dead').length;
  const misses = shots.filter(s => s.result === 'lost').length;
  const noBirds = shots.filter(s => s.result === 'no_bird').length;
  const validScored = hits + misses;
  const pct = validScored > 0 ? Math.round((hits / validScored) * 100) : 0;
  const [expanded, setExpanded] = useState(true);

  const shotColor = (result) => {
    if (result === 'dead') return 'bg-emerald-500 text-white border-emerald-600';
    if (result === 'lost') return 'bg-red-500 text-white border-red-600';
    return 'bg-amber-400 text-white border-amber-500';
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-base">Stand {stand.stand_number}</span>
          <span className="ml-2 text-xs bg-secondary px-2 py-0.5 rounded-full">{stand.discipline_type}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setExpanded(e => !e)} className="p-2 hover:bg-secondary rounded-lg">
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4 text-destructive/60" /></button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-2.5 text-center">
          <p className="text-xl font-black text-emerald-600">{hits}</p>
          <p className="text-xs text-muted-foreground">Dead</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-2.5 text-center">
          <p className="text-xl font-black text-red-500">{misses}</p>
          <p className="text-xs text-muted-foreground">Lost</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-center">
          <p className="text-xl font-black text-amber-600">{noBirds}</p>
          <p className="text-xs text-muted-foreground">No Bird</p>
        </div>
        <div className="bg-primary/10 rounded-xl p-2.5 text-center">
          <p className="text-xl font-black text-primary">{pct}%</p>
          <p className="text-xs text-muted-foreground">Score</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Score: {hits}/{validScored} valid</p>

      {expanded && (
        <>
          {shots.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {shots.map(shot => (
                <div key={shot.id}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 ${shotColor(shot.result)}`}
                  title={`Shot ${shot.shot_number}: ${shot.result}`}>
                  {shot.shot_number}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-4 gap-2">
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => onAddShot('dead')}
              className="py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm col-span-1">
              ✓ Dead
            </motion.button>
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => onAddShot('lost')}
              className="py-3 bg-red-500 text-white rounded-xl font-bold text-sm col-span-1">
              ✗ Lost
            </motion.button>
            <motion.button whileTap={{ scale: 0.92 }} onClick={() => onAddShot('no_bird')}
              className="py-3 bg-amber-400 text-white rounded-xl font-bold text-xs col-span-1">
              No Bird
            </motion.button>
            <motion.button whileTap={{ scale: 0.92 }} onClick={onRemoveShot}
              disabled={shots.length === 0}
              className="py-3 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm col-span-1 disabled:opacity-40">
              Undo
            </motion.button>
          </div>
        </>
      )}

      {stand.notes && <p className="text-xs text-muted-foreground mt-2 italic">{stand.notes}</p>}
    </div>
  );
}

// ─── Quick Total Stand Card (Read-Only) ───────────────────────
function QuickStandCardReadOnly({ stand, onEdit }) {
  const valid = (stand.hits || 0) + (stand.misses || 0);
  const pct = valid > 0 ? Math.round(((stand.hits || 0) / valid) * 100) : 0;
  const noBirds = stand.no_birds || 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-base">Stand {stand.stand_number}</span>
          <span className="ml-2 text-xs bg-secondary px-2 py-0.5 rounded-full">{stand.discipline_type}</span>
        </div>
        <button onClick={onEdit} className="p-2 hover:bg-secondary rounded-lg"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-2">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-emerald-600">{stand.hits || 0}</p>
          <p className="text-xs text-muted-foreground">Dead</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-red-500">{stand.misses || 0}</p>
          <p className="text-xs text-muted-foreground">Lost</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-amber-600">{noBirds}</p>
          <p className="text-xs text-muted-foreground">No Bird</p>
        </div>
        <div className="bg-primary/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-primary">{pct}%</p>
          <p className="text-xs text-muted-foreground">Score</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Score: {stand.hits || 0}/{valid} valid</p>

      {stand.shots_used > 0 && stand.shots_used !== valid && (
        <p className="text-xs text-muted-foreground">Cartridges used: {stand.shots_used}</p>
      )}
      {stand.notes && <p className="text-xs text-muted-foreground mt-1 italic">{stand.notes}</p>}
    </div>
  );
}

// ─── Quick Total Stand Card (Editing) ──────────────────────────
function QuickStandCard({ stand, onHit, onMiss, onNoBird, onUndo, onEdit, onDelete }) {
  const valid = (stand.hits || 0) + (stand.misses || 0);
  const pct = valid > 0 ? Math.round(((stand.hits || 0) / valid) * 100) : 0;
  const noBirds = stand.no_birds || 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-base">Stand {stand.stand_number}</span>
          <span className="ml-2 text-xs bg-secondary px-2 py-0.5 rounded-full">{stand.discipline_type}</span>
        </div>
        <button onClick={onDelete} className="p-2 hover:bg-destructive/10 rounded-lg"><Trash2 className="w-4 h-4 text-destructive/60" /></button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-2">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-emerald-600">{stand.hits || 0}</p>
          <p className="text-xs text-muted-foreground">Dead</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-red-500">{stand.misses || 0}</p>
          <p className="text-xs text-muted-foreground">Lost</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-amber-600">{noBirds}</p>
          <p className="text-xs text-muted-foreground">No Bird</p>
        </div>
        <div className="bg-primary/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-black text-primary">{pct}%</p>
          <p className="text-xs text-muted-foreground">Score</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Score: {stand.hits || 0}/{valid} valid</p>

      <div className="grid grid-cols-4 gap-2">
        <motion.button whileTap={{ scale: 0.92 }} onClick={onHit}
          className="py-3.5 bg-emerald-500 text-white rounded-xl font-bold text-sm">
          ✓ Dead
        </motion.button>
        <motion.button whileTap={{ scale: 0.92 }} onClick={onMiss}
          className="py-3.5 bg-red-500 text-white rounded-xl font-bold text-sm">
          ✗ Lost
        </motion.button>
        <motion.button whileTap={{ scale: 0.92 }} onClick={onNoBird}
          className="py-3.5 bg-amber-400 text-white rounded-xl font-bold text-xs">
          No Bird
        </motion.button>
        <motion.button whileTap={{ scale: 0.92 }} onClick={onUndo}
          className="py-3.5 bg-secondary text-secondary-foreground rounded-xl font-bold text-sm">
          Undo
        </motion.button>
      </div>

      {stand.shots_used > 0 && stand.shots_used !== valid && (
        <p className="text-xs text-muted-foreground mt-2">Cartridges used: {stand.shots_used}</p>
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
            <th className="px-2 py-2.5 font-bold text-xs uppercase tracking-wide text-muted-foreground">#</th>
            <th className="px-2 py-2.5 font-bold text-xs uppercase tracking-wide text-muted-foreground">Disc.</th>
            <th className="px-2 py-2.5 font-bold text-xs uppercase tracking-wide text-emerald-600 text-center">Hits</th>
            <th className="px-2 py-2.5 font-bold text-xs uppercase tracking-wide text-red-500 text-center">Miss</th>
            <th className="px-2 py-2.5 font-bold text-xs uppercase tracking-wide text-amber-600 text-center">NB</th>
            <th className="px-2 py-2.5 font-bold text-xs uppercase tracking-wide text-muted-foreground text-center">Score</th>
            <th className="px-2 py-2.5 font-bold text-xs uppercase tracking-wide text-muted-foreground text-center">%</th>
            <th className="px-1 py-2.5 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {stands.map((stand, i) => {
            const valid = (stand.hits || 0) + (stand.misses || 0);
            const pct = valid > 0 ? Math.round(((stand.hits || 0) / valid) * 100) : 0;
            const isBest = stats.bestStand?.id === stand.id && stands.length > 1;
            const isWorst = stats.worstStand?.id === stand.id && stands.length > 1 && stats.worstStand?.id !== stats.bestStand?.id;
            return (
              <tr key={stand.id} className={`border-t border-border ${isBest ? 'bg-emerald-50 dark:bg-emerald-900/10' : isWorst ? 'bg-red-50 dark:bg-red-900/10' : i % 2 === 0 ? 'bg-background' : 'bg-secondary/30'}`}>
                <td className="px-2 py-2.5 font-bold text-xs">{stand.stand_number}{isBest && ' 🏆'}{isWorst && ' ↓'}</td>
                <td className="px-2 py-2.5 text-xs text-muted-foreground">{stand.discipline_type}</td>
                <td className="px-2 py-2.5 text-center font-bold text-emerald-600 text-xs">{stand.hits || 0}</td>
                <td className="px-2 py-2.5 text-center font-bold text-red-500 text-xs">{stand.misses || 0}</td>
                <td className="px-2 py-2.5 text-center font-bold text-amber-600 text-xs">{stand.no_birds || 0}</td>
                <td className="px-2 py-2.5 text-center text-xs font-semibold">{stand.hits || 0}/{valid}</td>
                <td className="px-2 py-2.5 text-center">
                  <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${pct >= 75 ? 'bg-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                    {pct}%
                  </span>
                </td>
                <td className="px-1 py-2.5">
                  <button onClick={() => onEdit(stand)} className="p-1 hover:bg-secondary rounded-lg"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                </td>
              </tr>
            );
          })}
          <tr className="border-t-2 border-border bg-primary/5 font-bold">
            <td className="px-2 py-2.5 text-xs uppercase tracking-wide text-muted-foreground" colSpan={2}>Total</td>
            <td className="px-2 py-2.5 text-center text-emerald-600 text-xs">{stats.totalHits}</td>
            <td className="px-2 py-2.5 text-center text-red-500 text-xs">{stats.totalMisses}</td>
            <td className="px-2 py-2.5 text-center text-amber-600 text-xs">{stats.totalNoBirds}</td>
            <td className="px-2 py-2.5 text-center text-xs">{stats.totalHits}/{stats.totalValidScored}</td>
            <td className="px-2 py-2.5 text-center">
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
    const s = calcStats(newStands);
    await base44.entities.ClayScorecard.update(sc.id, {
      total_stands: s.totalStands,
      total_clays: s.totalClays,
      total_hits: s.totalHits,
      total_misses: s.totalMisses,
      total_no_birds: s.totalNoBirds,
      total_valid_scored_clays: s.totalValidScored,
      total_cartridges_used: s.totalCartridges,
      hit_percentage: s.hitPct,
    });
  };

  const saveShotResults = async (standId, shotResults) => {
    // Delete existing shots for this stand
    const existing = await base44.entities.ClayShot.filter({ clay_stand_id: standId });
    await Promise.all(existing.map(s => base44.entities.ClayShot.delete(s.id)));
    // Create new shots — shotResults is array of {shot_number, result, input_method, ...}
    const newShots = [];
    for (const s of shotResults) {
      const payload = { clay_stand_id: standId, shot_number: s.shot_number, result: s.result, input_method: s.input_method || 'manual' };
      if (s.voice_timestamp) payload.voice_timestamp = s.voice_timestamp;
      if (s.voice_confidence_score != null) payload.voice_confidence_score = s.voice_confidence_score;
      const shot = await base44.entities.ClayShot.create(payload);
      newShots.push(shot);
    }
    return newShots;
  };

  const handleAddStand = async (formData) => {
    const { _shotResults, ...cleanData } = formData;
    // Convert results from form (null) to normalized format
    const normalizedResults = _shotResults?.map(s => ({
      ...s,
      result: s.result === null ? null : s.result
    }));
    const newStand = await base44.entities.ClayStand.create({ ...cleanData, clay_scorecard_id: scorecard.id });
    let shots = [];
    if (newStand.scoring_method === 'shot_by_shot' && normalizedResults) {
      shots = await saveShotResults(newStand.id, normalizedResults);
    }
    setShotsMap(prev => ({ ...prev, [newStand.id]: shots }));
    const newStands = [...stands, newStand].sort((a, b) => a.stand_number - b.stand_number);
    setStands(newStands);
    await saveScorecard(newStands);
    setShowAddForm(false);
  };

  const handleEditStand = async (formData) => {
    const { _shotResults, ...cleanData } = formData;
    await base44.entities.ClayStand.update(editingStand.id, cleanData);
    let shots = shotsMap[editingStand.id] || [];
    if (editingStand.scoring_method === 'shot_by_shot' && _shotResults) {
      shots = await saveShotResults(editingStand.id, _shotResults);
      setShotsMap(prev => ({ ...prev, [editingStand.id]: shots }));
    }
    const newStands = stands.map(s => s.id === editingStand.id ? { ...editingStand, ...cleanData } : s).sort((a, b) => a.stand_number - b.stand_number);
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
  const recalcFromShots = (shots) => {
    const hits = shots.filter(s => s.result === 'dead').length;
    const misses = shots.filter(s => s.result === 'lost').length;
    const no_birds = shots.filter(s => s.result === 'no_bird').length;
    const valid_scored_clays = hits + misses;
    const clays_total = valid_scored_clays + no_birds;
    const hit_percentage = valid_scored_clays > 0 ? Math.round((hits / valid_scored_clays) * 100) : 0;
    return { hits, misses, no_birds, valid_scored_clays, clays_total, shots_used: shots.length, hit_percentage };
  };

  const handleAddShot = async (stand, result) => {
    const existingShots = shotsMap[stand.id] || [];
    const newShot = await base44.entities.ClayShot.create({ clay_stand_id: stand.id, shot_number: existingShots.length + 1, result });
    const newShots = [...existingShots, newShot];
    const calc = recalcFromShots(newShots);
    await base44.entities.ClayStand.update(stand.id, calc);
    setShotsMap(prev => ({ ...prev, [stand.id]: newShots }));
    const newStands = stands.map(s => s.id === stand.id ? { ...s, ...calc } : s);
    setStands(newStands);
    await saveScorecard(newStands);
  };

  const handleRemoveShot = async (stand) => {
    const existingShots = shotsMap[stand.id] || [];
    if (existingShots.length === 0) return;
    await base44.entities.ClayShot.delete(existingShots[existingShots.length - 1].id);
    const newShots = existingShots.slice(0, -1);
    const calc = recalcFromShots(newShots);
    await base44.entities.ClayStand.update(stand.id, calc);
    setShotsMap(prev => ({ ...prev, [stand.id]: newShots }));
    const newStands = stands.map(s => s.id === stand.id ? { ...s, ...calc } : s);
    setStands(newStands);
    await saveScorecard(newStands);
  };

  // ── Quick Total tap handlers ──
  const applyQuickUpdate = async (stand, updates) => {
    const updated = { ...stand, ...updates };
    const valid = (updated.hits || 0) + (updated.misses || 0);
    const noBirds = updated.no_birds || 0;
    updated.valid_scored_clays = valid;
    updated.clays_total = valid + noBirds;
    updated.hit_percentage = valid > 0 ? Math.round(((updated.hits || 0) / valid) * 100) : 0;
    await base44.entities.ClayStand.update(stand.id, updated);
    const newStands = stands.map(s => s.id === stand.id ? updated : s);
    setStands(newStands);
    await saveScorecard(newStands);
    return updated;
  };

  const handleHit = async (stand) => {
    setLastActions(prev => ({ ...prev, [stand.id]: { hits: stand.hits, misses: stand.misses, no_birds: stand.no_birds } }));
    await applyQuickUpdate(stand, { hits: (stand.hits || 0) + 1 });
  };

  const handleMiss = async (stand) => {
    setLastActions(prev => ({ ...prev, [stand.id]: { hits: stand.hits, misses: stand.misses, no_birds: stand.no_birds } }));
    await applyQuickUpdate(stand, { misses: (stand.misses || 0) + 1 });
  };

  const handleNoBird = async (stand) => {
    setLastActions(prev => ({ ...prev, [stand.id]: { hits: stand.hits, misses: stand.misses, no_birds: stand.no_birds } }));
    await applyQuickUpdate(stand, { no_birds: (stand.no_birds || 0) + 1 });
  };

  const handleUndo = async (stand) => {
    const last = lastActions[stand.id];
    if (!last) return;
    setLastActions(prev => ({ ...prev, [stand.id]: null }));
    await applyQuickUpdate(stand, { hits: last.hits || 0, misses: last.misses || 0, no_birds: last.no_birds || 0 });
  };

  const stats = calcStats(stands);
  const shotgun = shotguns?.find(s => s.id === session.shotgun_id);
  const ammo = ammunition?.find(a => a.id === session.ammunition_id);
  const nextStandNumber = stands.length > 0 ? Math.max(...stands.map(s => s.stand_number)) + 1 : 1;

  return createPortal(
    <div className="fixed inset-0 z-[60000] bg-black/60 flex flex-col">
      <div className="flex-1 bg-background overflow-y-auto">
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
              <span className="text-3xl font-black">{stats.totalHits} / {stats.totalValidScored}</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center text-xs mb-2">
              <div><p className="font-bold text-sm">{stats.hitPct}%</p><p className="text-muted-foreground">Hit Rate</p></div>
              <div><p className="font-bold text-sm">{stats.totalStands}</p><p className="text-muted-foreground">Stands</p></div>
              <div><p className="font-bold text-sm text-emerald-600">{stats.totalHits}</p><p className="text-muted-foreground">Hits</p></div>
              <div><p className="font-bold text-sm text-red-500">{stats.totalMisses}</p><p className="text-muted-foreground">Misses</p></div>
              <div><p className="font-bold text-sm text-amber-600">{stats.totalNoBirds}</p><p className="text-muted-foreground">No Birds</p></div>
            </div>
            <p className="text-xs text-muted-foreground">Cartridges: {stats.totalCartridges} · Valid scored: {stats.totalValidScored}</p>
            {stats.bestStand && stands.length > 1 && (
              <div className="mt-2 flex gap-3 text-xs flex-wrap">
                <span className="text-emerald-600 font-medium">🏆 Best: Stand {stats.bestStand.stand_number}</span>
                {stats.worstStand?.id !== stats.bestStand?.id && (
                  <span className="text-red-500 font-medium">↓ Worst: Stand {stats.worstStand.stand_number}</span>
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
                <StandFormWrapper stand={editingStand} standNumber={editingStand.stand_number} onSave={handleEditStand} onCancel={() => setEditingStand(null)} initialShots={shotsMap[editingStand.id] || []} />
              )}
            </>
          ) : (
            <>
              <AnimatePresence>
                {stands.map(stand => (
                  editingStand?.id === stand.id ? (
                    <StandFormWrapper key={stand.id} stand={stand} standNumber={stand.stand_number} onSave={handleEditStand} onCancel={() => setEditingStand(null)} initialShots={shotsMap[stand.id] || []} />
                  ) : stand.scoring_method === 'shot_by_shot' ? (
                    <motion.div key={stand.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <ShotByShotCardReadOnly
                        stand={stand}
                        shots={shotsMap[stand.id] || []}
                        onEdit={() => setEditingStand(stand)}
                      />
                    </motion.div>
                  ) : (
                    <motion.div key={stand.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <QuickStandCardReadOnly
                        stand={stand}
                        onEdit={() => setEditingStand(stand)}
                      />
                    </motion.div>
                  )
                ))}
              </AnimatePresence>

              {showAddForm ? (
                <StandFormWrapper standNumber={nextStandNumber} onSave={handleAddStand} onCancel={() => setShowAddForm(false)} />
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