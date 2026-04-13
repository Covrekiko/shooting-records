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
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-2 md:gap-3 pointer-events-auto select-none">
      {/* End Outing Button */}
      {activeOuting && (
        <button
          onClick={() => handleAction(onEndOuting)}
          className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all animate-pulse cursor-pointer pointer-events-auto active:scale-95 text-xs md:text-sm"
        >
          <LogOut className="w-4 h-4 md:w-5 md:h-5" />
          <span className="hidden md:inline">End Outing</span>
        </button>
      )}

      {/* Menu Items */}
      {expanded && (
        <>
          <button
            onClick={() => handleAction(onOuting)}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-600 transition-all cursor-pointer pointer-events-auto active:scale-95 text-xs md:text-sm"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden md:inline font-medium">New Outing</span>
          </button>
          <button
            onClick={() => handleAction(onRecenter)}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-600 transition-all cursor-pointer pointer-events-auto active:scale-95 text-xs md:text-sm"
          >
            <Crosshair className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden md:inline font-medium">Live Location</span>
          </button>
          <button
            onClick={() => handleAction(onPOI)}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-600 transition-all cursor-pointer pointer-events-auto active:scale-95 text-xs md:text-sm"
          >
            <MapPin className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden md:inline font-medium">Add POI</span>
          </button>
          <button
            onClick={() => handleAction(onHarvest)}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-600 transition-all cursor-pointer pointer-events-auto active:scale-95 text-xs md:text-sm"
          >
            <span className="text-base md:text-lg">🦌</span>
            <span className="hidden md:inline font-medium">Add Harvest</span>
          </button>
          <button
            onClick={() => handleAction(onCreateArea)}
            className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 bg-slate-700 text-white rounded-full shadow-lg hover:bg-slate-600 transition-all cursor-pointer pointer-events-auto active:scale-95 text-xs md:text-sm"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10v10H7z" />
            </svg>
            <span className="hidden md:inline font-medium">Create Area</span>
          </button>
        </>
      )}

      {/* Main FAB */}
      <button
        onClick={handleMainClick}
        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg hover:bg-primary/90 hover:shadow-xl transition-all cursor-pointer pointer-events-auto active:scale-95"
      >
        <Plus className="w-5 h-5 md:w-6 md:h-6" />
      </button>
    </div>
  );
}