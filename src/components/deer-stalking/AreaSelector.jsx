import { useState, useEffect } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AreaSelector({ selectedAreaId, onSelectArea, userLocation }) {
  const [areas, setAreas] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me();
      const areasList = await base44.entities.Area.filter({ created_by: currentUser.email });
      setAreas(areasList || []);
    } catch (error) {
      console.error('Error loading areas:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedArea = areas.find((a) => a.id === selectedAreaId);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading areas...</div>;
  }

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
          {areas.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">No saved areas</div>
          ) : (
            areas.map((area) => (
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
                {area.location_address && <p className="text-xs text-muted-foreground">{area.location_address}</p>}
                {area.deer_species && area.deer_species.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{area.deer_species.join(', ')}</p>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}