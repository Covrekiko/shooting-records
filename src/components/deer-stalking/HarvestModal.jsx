import { useState } from 'react';
import { X } from 'lucide-react';

export default function HarvestModal({ location, onClose, onSubmit }) {
  const [species, setSpecies] = useState('Roe');
  const [sex, setSex] = useState('unknown');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = () => {
    onSubmit({ species, sex, notes, photos: [], date });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9997]">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full shadow-xl relative z-[9998]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Record Harvest</h2>
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
          <label className="block text-sm font-medium mb-2">Species</label>
          <select
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
          >
            <option>Roe</option>
            <option>Muntjac</option>
            <option>Fallow</option>
            <option>Red</option>
            <option>Sika</option>
            <option>Chinese Water Deer</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Sex</label>
          <div className="flex gap-2">
            {['male', 'female', 'unknown'].map((s) => (
              <button
                key={s}
                onClick={() => setSex(s)}
                className={`flex-1 p-2 rounded border-2 text-sm capitalize transition-all ${
                  sex === s ? 'border-primary bg-primary/10' : 'border-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm resize-none"
            rows="3"
            placeholder="Add details about the harvest..."
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
            Save Harvest
          </button>
        </div>
      </div>
    </div>
  );
}