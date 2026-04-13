import { useState } from 'react';
import { X } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9997]">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full shadow-xl relative z-[9998]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Add Point of Interest</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-slate-600 mb-2">
            Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Type</label>
          <div className="grid grid-cols-2 gap-2">
            {POI_TYPES.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setType(opt.value)}
                className={`p-2 rounded border-2 text-sm transition-all ${
                  type === opt.value
                    ? 'border-primary bg-primary/10'
                    : 'border-slate-300 hover:border-primary'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm resize-none"
            rows="3"
            placeholder="Add any notes about this location..."
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Save POI
          </button>
        </div>
      </div>
    </div>
  );
}