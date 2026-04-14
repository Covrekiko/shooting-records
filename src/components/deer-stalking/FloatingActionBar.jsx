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
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-auto select-none">
      {/* End Outing Button */}
      {activeOuting && (
        <button
          onClick={() => handleAction(onEndOuting)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-slate-900 rounded-full shadow-md hover:shadow-lg hover:bg-orange-500/30 transition-all animate-pulse cursor-pointer pointer-events-auto active:scale-95 border border-orange-500/30"
          style={{ WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' }}
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
            className="flex items-center gap-2 px-4 py-2 bg-orange-500/15 text-slate-900 rounded-full shadow-md hover:shadow-lg hover:bg-orange-500/25 transition-all cursor-pointer pointer-events-auto active:scale-95 border border-orange-500/20"
            style={{ WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' }}
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">New Outing</span>
          </button>
          <button
            onClick={() => handleAction(onRecenter)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500/15 text-slate-900 rounded-full shadow-md hover:shadow-lg hover:bg-orange-500/25 transition-all cursor-pointer pointer-events-auto active:scale-95 border border-orange-500/20"
            style={{ WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' }}
          >
            <Crosshair className="w-5 h-5" />
            <span className="text-sm font-medium">My Location</span>
          </button>
          <button
            onClick={() => handleAction(onPOI)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500/15 text-slate-900 rounded-full shadow-md hover:shadow-lg hover:bg-orange-500/25 transition-all cursor-pointer pointer-events-auto active:scale-95 border border-orange-500/20"
            style={{ WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' }}
          >
            <MapPin className="w-5 h-5" />
            <span className="text-sm font-medium">Add POI</span>
          </button>
          <button
            onClick={() => handleAction(onHarvest)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500/15 text-slate-900 rounded-full shadow-md hover:shadow-lg hover:bg-orange-500/25 transition-all cursor-pointer pointer-events-auto active:scale-95 border border-orange-500/20"
            style={{ WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' }}
          >
            <span className="text-lg">🦌</span>
            <span className="text-sm font-medium">Add Harvest</span>
          </button>
          <button
            onClick={() => handleAction(onCreateArea)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500/15 text-slate-900 rounded-full shadow-md hover:shadow-lg hover:bg-orange-500/25 transition-all cursor-pointer pointer-events-auto active:scale-95 border border-orange-500/20"
            style={{ WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10v10H7z" />
            </svg>
            <span className="text-sm font-medium">Create Area</span>
          </button>
        </>
      )}

      {/* Main FAB */}
      <button
        onClick={handleMainClick}
        className="w-14 h-14 rounded-full bg-orange-500/25 text-orange-600 flex items-center justify-center shadow-md hover:shadow-lg hover:bg-orange-500/35 transition-all cursor-pointer pointer-events-auto active:scale-95 border border-orange-500/30"
        style={{ WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' }}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}