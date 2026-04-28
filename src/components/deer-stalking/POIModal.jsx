import { useState } from 'react';
import GlobalSheet from '@/components/ui/GlobalSheet.jsx';

const POI_TYPES = [
  { value: 'deer_sighting', label: '🦌 Deer Sighting' },
  { value: 'animal', label: '🐾 Other Animal' },
  { value: 'high_seat', label: '🪑 High Seat' },
  { value: 'feeding_area', label: '🌾 Feeding Area' },
  { value: 'tracks_signs', label: '👣 Tracks / Signs' },
  { value: 'other', label: '📍 Other' },
];

export default function POIModal({ location, onClose, onSubmit }) {
  const [type, setType] = useState('deer_sighting');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    onSubmit({ type, notes, photos: [] });
  };

  return (
    <GlobalSheet
      open={true}
      onClose={onClose}
      title="Add Point of Interest"
      subtitle={`Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl font-semibold text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">Cancel</button>
          <button type="button" onClick={handleSubmit} className="flex-1 h-11 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Save POI</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {POI_TYPES.map((opt) => (
              <button key={opt.value} type="button" onClick={() => setType(opt.value)}
                className={`p-2.5 rounded-xl border-2 text-sm transition-all ${type === opt.value ? 'border-primary bg-primary/10 font-semibold' : 'border-border hover:border-primary'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Notes (Optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" rows="3"
            placeholder="Add any notes about this location..." />
        </div>
      </div>
    </GlobalSheet>
  );
}