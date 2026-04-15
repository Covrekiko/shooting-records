import { ChevronDown, MapPin } from 'lucide-react';
import { useState } from 'react';

export default function AreaSelector({ savedAreas, selectedAreaId, onSelectArea }) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedArea = savedAreas.find((a) => a.id === selectedAreaId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white/20 dark:bg-slate-700/30 border border-white/40 dark:border-slate-600/40 rounded-2xl hover:bg-white/30 dark:hover:bg-slate-700/40 active:scale-95 transition-all min-w-44 sm:min-w-52 shadow-lg hover:shadow-xl backdrop-blur-md"
      >
        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0" />
        <span className="font-semibold text-xs sm:text-sm flex-1 text-left truncate text-slate-700 dark:text-slate-300">
          {selectedArea?.name || 'Select Area'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-600 dark:text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/25 dark:bg-slate-700/40 border border-white/40 dark:border-slate-600/40 rounded-2xl shadow-xl z-[9997] max-h-56 overflow-y-auto backdrop-blur-md">
          {savedAreas.length === 0 ? (
            <div className="px-4 py-4 text-sm text-slate-600 dark:text-slate-400">No saved areas</div>
          ) : (
            savedAreas.map((area) => (
              <button
                key={area.id}
                onClick={() => {
                  onSelectArea(area);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-3 hover:bg-white/20 dark:hover:bg-slate-600/30 transition-colors border-b border-white/20 dark:border-slate-600/30 last:border-b-0 ${
                  selectedAreaId === area.id ? 'bg-white/30 dark:bg-slate-600/40 text-slate-800 dark:text-slate-100 font-semibold' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <p className="font-semibold text-sm">{area.name}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}