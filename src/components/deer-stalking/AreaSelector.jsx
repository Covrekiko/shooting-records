import { ChevronDown, MapPin } from 'lucide-react';
import { useState } from 'react';

export default function AreaSelector({ savedAreas, selectedAreaId, onSelectArea }) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedArea = savedAreas.find((a) => a.id === selectedAreaId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-secondary transition-colors min-w-48"
      >
        <MapPin className="w-4 h-4 text-primary" />
        <span className="font-medium text-sm flex-1 text-left truncate">
          {selectedArea?.name || 'Select Area'}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-[9997] max-h-48 overflow-y-auto">
          {savedAreas.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">No saved areas</div>
          ) : (
            savedAreas.map((area) => (
              <button
                key={area.id}
                onClick={() => {
                  onSelectArea(area);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 hover:bg-secondary transition-colors border-b border-border last:border-b-0 ${
                  selectedAreaId === area.id ? 'bg-primary/10 text-primary font-medium' : ''
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