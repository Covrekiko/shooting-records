import { useState } from 'react';

export default function OutingModal({ onClose, onSubmit, locations = [] }) {
  const [data, setData] = useState({
    date: new Date().toISOString().split('T')[0],
    location_id: '',
    place_name: '',
    start_time: new Date().toTimeString().slice(0, 5),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(data);
  };

  const handleChange = (field, value) => {
    setData({ ...data, [field]: value });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9997]">
      <div className="bg-card rounded-lg max-w-md w-full p-6 relative z-[9998]">
        <h2 className="text-xl font-bold mb-4">Check In</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={data.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <select
              value={data.location_id}
              onChange={(e) => handleChange('location_id', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            >
              <option value="">Select a location</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.place_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Place Name</label>
            <input
              type="text"
              value={data.place_name}
              onChange={(e) => handleChange('place_name', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Check-in Time</label>
            <input
              type="time"
              value={data.start_time}
              onChange={(e) => handleChange('start_time', e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              Check In
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
    </div>
  );
}