import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ViewStandModal({ stand, shots, onClose }) {
  const dead = shots.filter(s => s.result === 'dead').length;
  const lost = shots.filter(s => s.result === 'lost').length;
  const noBirds = shots.filter(s => s.result === 'no_bird').length;
  const validScored = dead + lost;
  const pct = validScored > 0 ? Math.round((dead / validScored) * 100) : 0;

  const shotColor = (result) => {
    if (result === 'dead') return 'bg-emerald-500 text-white';
    if (result === 'lost') return 'bg-red-500 text-white';
    return 'bg-amber-400 text-white';
  };

  return createPortal(
    <div className="fixed inset-0 z-[60001] bg-black/60 flex items-end">
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full bg-background rounded-t-3xl"
      >
        <div className="sticky top-0 bg-background border-b border-border px-4 py-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-lg font-bold">Stand {stand.stand_number}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-140px)] px-4 py-4 pb-8 space-y-4">
          {/* Stand Info */}
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Discipline</span>
              <span className="text-sm font-semibold">{stand.discipline_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Scoring Method</span>
              <span className="text-sm font-semibold capitalize">{stand.scoring_method.replace('_', ' ')}</span>
            </div>
            {stand.notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{stand.notes}</p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-emerald-600">{dead}</p>
              <p className="text-xs text-muted-foreground">Dead</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-red-500">{lost}</p>
              <p className="text-xs text-muted-foreground">Lost</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-amber-600">{noBirds}</p>
              <p className="text-xs text-muted-foreground">No Bird</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-primary">{pct}%</p>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {dead}/{validScored} valid scored · {stand.shots_used || 0} cartridges
          </p>

          {/* Shot-by-Shot Results */}
          {shots.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-sm font-bold mb-3">Shot-by-Shot Results</p>
              <div className="flex gap-2 flex-wrap">
                {shots.map(shot => (
                  <div
                    key={shot.id}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${shotColor(shot.result)}`}
                    title={`Shot ${shot.shot_number}: ${shot.result}`}
                  >
                    {shot.shot_number}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Input method: {shots.some(s => s.input_method === 'voice') ? 'Mixed / Voice' : 'Manual'}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-border px-4 py-4 bg-secondary/30">
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}