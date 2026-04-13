import { useState } from 'react';
import { Plus, MapPin, Crosshair, LogOut } from 'lucide-react';

export default function FloatingActionBar({
  onPOI,
  onHarvest,
  onOuting,
  onRecenter,
  activeOuting,
  onEndOuting,
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
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-auto select-none">
      {/* End Outing Button */}
      {activeOuting && (
        <button
          onClick={() => handleAction(onEndOuting)}
          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all animate-pulse cursor-pointer pointer-events-auto active:scale-95"
        >
          <LogOut className="w-5 h-5" />
          End Outing
        </button>
      )}

      {/* Menu Items */}
      {expanded && (
        <>
          <button
            onClick={() => handleAction(onOuting)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-600 transition-all cursor-pointer pointer-events-auto active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">New Outing</span>
          </button>
          <button
            onClick={() => handleAction(onRecenter)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-600 transition-all cursor-pointer pointer-events-auto active:scale-95"
          >
            <Crosshair className="w-5 h-5" />
            <span className="text-sm font-medium">Live Location</span>
          </button>
          <button
            onClick={() => handleAction(onPOI)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-600 transition-all cursor-pointer pointer-events-auto active:scale-95"
          >
            <MapPin className="w-5 h-5" />
            <span className="text-sm font-medium">Add POI</span>
          </button>
          <button
            onClick={() => handleAction(onHarvest)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-600 transition-all cursor-pointer pointer-events-auto active:scale-95"
          >
            <span className="text-lg">🦌</span>
            <span className="text-sm font-medium">Add Harvest</span>
          </button>
        </>
      )}

      {/* Main FAB */}
      <button
        onClick={handleMainClick}
        className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all cursor-pointer pointer-events-auto active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}