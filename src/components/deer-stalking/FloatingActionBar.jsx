import { useState } from 'react';
import { Plus, MapPin, Crosshair, LogOut } from 'lucide-react';

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

  const handleMainClick = (e) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <div className="flex flex-col items-end gap-3 pointer-events-auto select-none">
      {/* End Outing Button */}
      {activeOuting && (
        <button
          onClick={() => handleAction(onEndOuting)}
          className="flex items-center gap-2 px-3.5 py-2 bg-red-500/15 dark:bg-red-500/20 text-red-700 dark:text-red-400 rounded-full shadow-lg hover:shadow-xl hover:bg-red-500/25 dark:hover:bg-red-500/30 transition-all animate-pulse cursor-pointer pointer-events-auto active:scale-95 backdrop-blur-md border border-red-400/30 dark:border-red-500/30"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span className="text-xs sm:text-sm font-semibold">End Outing</span>
        </button>
      )}

      {/* Menu Items */}
      {expanded && (
        <>
          <button
            onClick={() => handleAction(onOuting)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 rounded-full shadow-lg hover:shadow-xl hover:bg-white/30 dark:hover:bg-slate-700/40 transition-all cursor-pointer pointer-events-auto active:scale-95 backdrop-blur-md border border-white/40 dark:border-slate-600/40 text-sm font-medium whitespace-nowrap"
          >
            <Plus className="w-4.5 h-4.5 flex-shrink-0" />
            New Outing
          </button>

          <button
            onClick={() => handleAction(onPOI)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 rounded-full shadow-lg hover:shadow-xl hover:bg-white/30 dark:hover:bg-slate-700/40 transition-all cursor-pointer pointer-events-auto active:scale-95 backdrop-blur-md border border-white/40 dark:border-slate-600/40 text-sm font-medium whitespace-nowrap"
          >
            <MapPin className="w-4.5 h-4.5 flex-shrink-0" />
            Add POI
          </button>
          <button
            onClick={() => handleAction(onHarvest)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 rounded-full shadow-lg hover:shadow-xl hover:bg-white/30 dark:hover:bg-slate-700/40 transition-all cursor-pointer pointer-events-auto active:scale-95 backdrop-blur-md border border-white/40 dark:border-slate-600/40 text-sm font-medium whitespace-nowrap"
          >
            <span className="text-lg">🦌</span>
            Add Harvest
          </button>
          <button
            onClick={() => handleAction(onCreateArea)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 rounded-full shadow-lg hover:shadow-xl hover:bg-white/30 dark:hover:bg-slate-700/40 transition-all cursor-pointer pointer-events-auto active:scale-95 backdrop-blur-md border border-white/40 dark:border-slate-600/40 text-sm font-medium whitespace-nowrap"
          >
            <svg className="w-4.5 h-4.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10v10H7z" />
            </svg>
            Create Area
          </button>
        </>
      )}

      {/* Main FAB */}
      <button
        onClick={handleMainClick}
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-500/20 dark:bg-amber-600/25 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-xl hover:shadow-2xl hover:bg-amber-500/30 dark:hover:bg-amber-600/35 transition-all cursor-pointer pointer-events-auto active:scale-95 backdrop-blur-md border border-amber-400/40 dark:border-amber-500/40"
      >
        <Plus className="w-7 h-7 sm:w-8 sm:h-8" />
      </button>
    </div>
  );
}