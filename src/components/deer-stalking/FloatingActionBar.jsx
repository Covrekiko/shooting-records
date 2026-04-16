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
          className="flex items-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:opacity-90 active:scale-95 transition-all shadow-sm"
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
              className="flex items-center gap-2 px-3 py-2 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all whitespace-nowrap shadow-sm border border-slate-200"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              New Outing
            </button>
          )}
          <button
            onClick={() => handleAction(onPOI)}
            className="flex items-center gap-2 px-3 py-2 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all whitespace-nowrap shadow-sm border border-slate-200"
          >
            <MapPin className="w-4 h-4 flex-shrink-0" />
            Add POI
          </button>
          <button
            onClick={() => handleAction(onHarvest)}
            className="flex items-center gap-2 px-3 py-2 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all whitespace-nowrap shadow-sm border border-slate-200"
          >
            <span className="text-sm leading-none flex-shrink-0">🦌</span>
            Add Harvest
          </button>
          <button
            onClick={() => handleAction(onCreateArea)}
            className="flex items-center gap-2 px-3 py-2 bg-white text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-50 active:scale-95 transition-all whitespace-nowrap shadow-sm border border-slate-200"
          >
            <LayoutGrid className="w-4 h-4 flex-shrink-0" />
            Create Area
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className="w-14 h-14 rounded-full bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 transition-all"
      >
        <Plus className="w-6 h-6" style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)' }} />
      </button>
    </div>
  );
}