import { useState } from 'react';
import { X } from 'lucide-react';

export default function OutingModal({ onClose, onSubmit }) {
  const [location, setLocation] = useState('');

  const handleSubmit = () => {
    if (location.trim()) {
      onSubmit(location);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Start New Outing</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Location Name</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Ashdown Forest, North Copse..."
            className="w-full border rounded-lg p-2 text-sm"
            autoFocus
          />
          <p className="text-xs text-slate-500 mt-1">
            GPS will be tracked from start time
          </p>
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
            disabled={!location.trim()}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            Start Tracking
          </button>
        </div>
      </div>
    </div>
  );
}