import { useState } from 'react';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { DESIGN } from '@/lib/designConstants';

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
    <GlobalModal
      open={true}
      onClose={onClose}
      title="Add Point of Interest"
      subtitle={`Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
      onSubmit={handleSubmit}
      primaryAction="Save POI"
      secondaryAction="Cancel"
    >
      <div className="space-y-4">
        <div>
          <label className={DESIGN.LABEL}>Type</label>
          <div className="grid grid-cols-2 gap-2">
            {POI_TYPES.map(opt => (
              <button key={opt.value} type="button" onClick={() => setType(opt.value)}
                className={`p-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  type === opt.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={DESIGN.LABEL}>Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            className={DESIGN.INPUT} rows="3"
            placeholder="Add any notes about this location..." />
        </div>
      </div>
    </GlobalModal>
  );
}