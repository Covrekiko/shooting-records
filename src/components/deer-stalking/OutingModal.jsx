import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function OutingModal({ onClose, onSubmit, locations = [], selectedArea = null }) {
  const [areas, setAreas] = useState([]);
  const [data, setData] = useState({
    date: new Date().toISOString().split('T')[0],
    location_id: '',
    place_name: selectedArea?.name || '',
    area_id: selectedArea?.id || '',
    start_time: new Date().toTimeString().slice(0, 5),
  });

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    try {
      const currentUser = await base44.auth.me();
      const areasList = await base44.entities.Area.filter({ created_by: currentUser.email });
      setAreas(areasList || []);
    } catch (error) {
      console.error('Error loading areas:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(data);
  };

  const handleChange = (field, value) => {
    setData({ ...data, [field]: value });
  };

  const handleAreaSelect = (areaId) => {
    const selected = areas.find(a => a.id === areaId);
    if (selected) {
      setData({
        ...data,
        area_id: selected.id,
        place_name: selected.name,
      });
    }
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
            <label className="block text-sm font-medium mb-1">Select Area</label>
            <select
              value={data.area_id}
              onChange={(e) => handleAreaSelect(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="">Select your area</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
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