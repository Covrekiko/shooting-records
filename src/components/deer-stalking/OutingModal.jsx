import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import GlobalSheet from '@/components/ui/GlobalSheet.jsx';

export default function OutingModal({ onClose, onSubmit, locations = [], selectedArea = null }) {
  const [areas, setAreas] = useState([]);
  const [data, setData] = useState({
    date: new Date().toISOString().split('T')[0],
    location_id: selectedArea?.id || '',
    place_name: selectedArea?.name || '',
    start_time: new Date().toTimeString().slice(0, 5),
  });

  useEffect(() => {
    loadAreas();
  }, []);

  useEffect(() => {
    if (selectedArea) {
      setData(prev => ({
        ...prev,
        location_id: selectedArea.id,
        place_name: selectedArea.name,
      }));
    }
  }, [selectedArea]);

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
        location_id: selected.id,
        place_name: selected.name,
      });
    }
  };

  return (
    <GlobalSheet
      open={true}
      onClose={onClose}
      title="Check In"
      onSubmit={handleSubmit}
      primaryAction="Check In"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Date</label>
          <input
            type="date"
            value={data.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Select Area</label>
          <select
            value={data.location_id}
            onChange={(e) => handleAreaSelect(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
          >
            <option value="">Select your area</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>{area.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Place Name</label>
          <input
            type="text"
            value={data.place_name}
            onChange={(e) => handleChange('place_name', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Check-in Time</label>
          <input
            type="time"
            value={data.start_time}
            onChange={(e) => handleChange('start_time', e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            required
          />
        </div>
      </div>
    </GlobalSheet>
  );
}