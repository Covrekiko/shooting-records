import { useState } from 'react';
import { X } from 'lucide-react';

export default function DeerStalkingCheckoutModal({ activeOuting, onConfirm, onClose }) {
  const [endTime, setEndTime] = useState(new Date().toTimeString().slice(0, 5));
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('🔴 DeerStalkingCheckoutModal.handleSubmit - calling onConfirm with endTime:', endTime);
    onConfirm({ endTime, notes });
  };

  return (
    <div className="bg-card rounded-lg max-w-md w-full p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">End Outing</h2>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            Outing: <span className="font-medium">{activeOuting?.location_name}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Started: {new Date(activeOuting?.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            rows="2"
            placeholder="Any final observations..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Confirm End Outing
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}