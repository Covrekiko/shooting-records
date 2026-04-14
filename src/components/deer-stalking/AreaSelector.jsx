import { ChevronDown, MapPin } from 'lucide-react';
import { useState } from 'react';

export default function AreaSelector({ savedAreas, selectedAreaId, onSelectArea }) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedArea = savedAreas.find((a) => a.id === selectedAreaId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 sm:px-4 py-1.5 sm:py-2 bg-white/15 border border-white/20 rounded-lg hover:bg-white/20 transition-colors min-w-40 sm:min-w-48 shadow-md"
        style={{ WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' }}
      >
        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600 flex-shrink-0" />
        <span className="font-medium text-xs sm:text-sm flex-1 text-left truncate text-black">
          {selectedArea?.name || 'Select Area'}
        </span>
        <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 text-black/60 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white/15 border border-white/20 rounded-lg shadow-lg z-[9997] max-h-48 overflow-y-auto" style={{ WebkitBackdropFilter: 'blur(20px)', backdropFilter: 'blur(20px)' }}>
          {savedAreas.length === 0 ? (
            <div className="px-4 py-3 text-sm text-black/60">No saved areas</div>
          ) : (
            savedAreas.map((area) => (
              <button
                key={area.id}
                onClick={() => {
                  onSelectArea(area);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 hover:bg-white/20 transition-colors border-b border-white/10 last:border-b-0 ${
                  selectedAreaId === area.id ? 'bg-white/25 text-black font-medium' : 'text-black/80'
                }`}
              >
                <p className="font-medium text-sm">{area.name}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}