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
          className="flex items-center gap-2 px-3 py-2 bg-red-500/30 dark:bg-red-600/30 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-500/40 dark:hover:bg-red-600/40 active:scale-95 transition-all shadow-sm border border-red-400/40 dark:border-red-500/40 backdrop-blur-md"
        >
          <LogOut className="w-4 h-4" />
          <span>End Outing</span>
        </button>
      )}

      {/* Expanded menu items */}
      {expanded && (
        <div className="flex flex-col items-end gap-2">
          {!activeOuting && (
            <button
              onClick={() => handleAction(onOuting)}
              className="flex items-center gap-2 px-3 py-2 bg-white/20 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-white/30 dark:hover:bg-slate-700/40 active:scale-95 transition-all whitespace-nowrap shadow-sm border border-white/40 dark:border-slate-600/40 backdrop-blur-md"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              New Outing
            </button>
          )}
          <button
            onClick={() => handleAction(onPOI)}
            className="flex items-center gap-2 px-3 py-2 bg-white/20 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-white/30 dark:hover:bg-slate-700/40 active:scale-95 transition-all whitespace-nowrap shadow-sm border border-white/40 dark:border-slate-600/40 backdrop-blur-md"
          >
            <MapPin className="w-4 h-4 flex-shrink-0" />
            Add POI
          </button>
          <button
            onClick={() => handleAction(onHarvest)}
            className="flex items-center gap-2 px-3 py-2 bg-white/20 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-white/30 dark:hover:bg-slate-700/40 active:scale-95 transition-all whitespace-nowrap shadow-sm border border-white/40 dark:border-slate-600/40 backdrop-blur-md"
          >
            <span className="text-sm leading-none flex-shrink-0">🦌</span>
            Add Harvest
          </button>
          <button
            onClick={() => handleAction(onCreateArea)}
            className="flex items-center gap-2 px-3 py-2 bg-white/20 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-white/30 dark:hover:bg-slate-700/40 active:scale-95 transition-all whitespace-nowrap shadow-sm border border-white/40 dark:border-slate-600/40 backdrop-blur-md"
          >
            <LayoutGrid className="w-4 h-4 flex-shrink-0" />
            Create Area
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="w-14 h-14 rounded-full bg-white/20 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-lg hover:bg-white/30 dark:hover:bg-slate-700/40 active:scale-95 transition-all border border-white/40 dark:border-slate-600/40 backdrop-blur-md"
      >
        <Plus className="w-6 h-6" style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)' }} />
      </button>
    </div>
  );
}