import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { DESIGN } from '@/lib/designConstants';

export default function OutingModal({ onClose, onSubmit, selectedArea = null }) {
  const [areas, setAreas] = useState([]);
  const [data, setData] = useState({
    date: new Date().toISOString().split('T')[0],
    location_id: selectedArea?.id || '',
    place_name: selectedArea?.name || '',
    start_time: new Date().toTimeString().slice(0, 5),
  });

  const inp = DESIGN.INPUT;
  const lbl = DESIGN.LABEL;

  useEffect(() => {
    base44.auth.me().then(user =>
      base44.entities.Area.filter({ created_by: user.email }).then(list => setAreas(list || []))
    );
  }, []);

  useEffect(() => {
    if (selectedArea) {
      setData(prev => ({ ...prev, location_id: selectedArea.id, place_name: selectedArea.name }));
    }
  }, [selectedArea]);

  const handleAreaSelect = (areaId) => {
    const selected = areas.find(a => a.id === areaId);
    if (selected) setData({ ...data, location_id: selected.id, place_name: selected.name });
    else setData({ ...data, location_id: areaId });
  };

  const handleSubmit = () => {
    onSubmit(data);
  };

  return (
    <GlobalModal
      open={true}
      onClose={onClose}
      title="Check In"
      onSubmit={handleSubmit}
      primaryAction="Check In"
      secondaryAction="Cancel"
    >
      <div className="space-y-4">
        <div>
          <label className={lbl}>Date</label>
          <input type="date" value={data.date}
            onChange={(e) => setData({ ...data, date: e.target.value })}
            className={inp} required />
        </div>
        <div>
          <label className={lbl}>Select Area</label>
          <select value={data.location_id}
            onChange={(e) => handleAreaSelect(e.target.value)}
            className={inp}>
            <option value="">Select your area</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Place Name</label>
          <input type="text" value={data.place_name}
            onChange={(e) => setData({ ...data, place_name: e.target.value })}
            placeholder={selectedArea ? `Suggested: ${selectedArea.name}` : 'Enter location name'}
            className={inp} required />
        </div>
        <div>
          <label className={lbl}>Check-in Time</label>
          <input type="time" value={data.start_time}
            onChange={(e) => setData({ ...data, start_time: e.target.value })}
            className={inp} required />
        </div>
      </div>
    </GlobalModal>
  );
}