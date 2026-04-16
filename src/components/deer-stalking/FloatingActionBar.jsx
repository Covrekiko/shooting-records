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
          className="flex items-center gap-2 pl-3 pr-4 py-2 bg-red-600 text-white rounded-2xl shadow-lg hover:bg-red-700 active:scale-95 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs font-bold tracking-wide">End Outing</span>
        </button>
      )}

      {/* Expanded menu items */}
      {expanded && (
        <div className="flex flex-col items-end gap-1.5">
          {!activeOuting && (
            <button
              onClick={() => handleAction(onOuting)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl shadow-md active:scale-95 transition-all text-xs font-semibold whitespace-nowrap hover:bg-slate-800"
            >
              <Plus className="w-3.5 h-3.5 flex-shrink-0" />
              New Outing
            </button>
          )}
          <button
            onClick={() => handleAction(onPOI)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl shadow-md active:scale-95 transition-all text-xs font-semibold whitespace-nowrap hover:bg-slate-800"
          >
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            Add POI
          </button>
          <button
            onClick={() => handleAction(onHarvest)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl shadow-md active:scale-95 transition-all text-xs font-semibold whitespace-nowrap hover:bg-slate-800"
          >
            <span className="text-sm leading-none flex-shrink-0">🦌</span>
            Add Harvest
          </button>
          <button
            onClick={() => handleAction(onCreateArea)}
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-xl shadow-md active:scale-95 transition-all text-xs font-semibold whitespace-nowrap hover:bg-slate-800"
          >
            <LayoutGrid className="w-3.5 h-3.5 flex-shrink-0" />
            Create Area
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-all ${
          expanded
            ? 'bg-slate-900 text-white'
            : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-100'
        }`}
        style={{ transition: 'transform 0.2s, background 0.2s' }}
      >
        <Plus className="w-6 h-6" style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)' }} />
      </button>
    </div>
  );
}