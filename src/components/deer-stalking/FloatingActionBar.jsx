import { useState } from 'react';
import { Plus, MapPin, X, LogOut, PenSquare, LayoutGrid } from 'lucide-react';

export default function FloatingActionBar({
  onPOI,
  onHarvest,
  onOuting,
  onRecenter,
  activeOuting,
  onEndOuting,
  onCreateArea,
}) {
  const [expanded, setExpanded] = useState(false);

  const handleAction = (callback) => {
    callback();
    setExpanded(false);
  };

  return (
    <div className="flex flex-col items-end gap-2.5 pointer-events-auto select-none">

      {/* Active outing pill */}
      {activeOuting && (
        <button
          onClick={() => handleAction(onEndOuting)}
          className="flex items-center gap-2 pl-3 pr-4 py-2 bg-red-500/90 backdrop-blur-xl text-white rounded-2xl shadow-xl border border-red-400/30 hover:bg-red-500 active:scale-95 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs font-bold tracking-wide">End Outing</span>
        </button>
      )}

      {/* Expanded menu items */}
      {expanded && (
        <div className="flex flex-col items-end gap-2">
          {!activeOuting && (
            <button
              onClick={() => handleAction(onOuting)}
              className="flex items-center gap-2.5 pl-3.5 pr-4.5 py-2.5 bg-white/85 dark:bg-slate-800/85 backdrop-blur-xl text-slate-800 dark:text-slate-100 rounded-2xl shadow-lg border border-white/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-700 active:scale-95 transition-all text-sm font-semibold whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
              New Outing
            </button>
          )}

          <button
            onClick={() => handleAction(onPOI)}
            className="flex items-center gap-2.5 pl-3.5 pr-4.5 py-2.5 bg-white/85 dark:bg-slate-800/85 backdrop-blur-xl text-slate-800 dark:text-slate-100 rounded-2xl shadow-lg border border-white/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-700 active:scale-95 transition-all text-sm font-semibold whitespace-nowrap"
          >
            <MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
            Add POI
          </button>

          <button
            onClick={() => handleAction(onHarvest)}
            className="flex items-center gap-2.5 pl-3.5 pr-4.5 py-2.5 bg-white/85 dark:bg-slate-800/85 backdrop-blur-xl text-slate-800 dark:text-slate-100 rounded-2xl shadow-lg border border-white/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-700 active:scale-95 transition-all text-sm font-semibold whitespace-nowrap"
          >
            <span className="text-base leading-none flex-shrink-0">🦌</span>
            Add Harvest
          </button>

          <button
            onClick={() => handleAction(onCreateArea)}
            className="flex items-center gap-2.5 pl-3.5 pr-4.5 py-2.5 bg-white/85 dark:bg-slate-800/85 backdrop-blur-xl text-slate-800 dark:text-slate-100 rounded-2xl shadow-lg border border-white/60 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-700 active:scale-95 transition-all text-sm font-semibold whitespace-nowrap"
          >
            <LayoutGrid className="w-4 h-4 text-slate-500 dark:text-slate-400 flex-shrink-0" />
            Create Area
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl active:scale-95 transition-all backdrop-blur-xl border ${
          expanded
            ? 'bg-slate-900/90 border-slate-700/60 text-white rotate-45'
            : 'bg-white/90 dark:bg-slate-800/90 border-white/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-700'
        }`}
        style={{ transition: 'transform 0.2s, background 0.2s' }}
      >
        <Plus className="w-6 h-6" style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)' }} />
      </button>
    </div>
  );
}