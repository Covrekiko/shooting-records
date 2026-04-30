import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { Calendar, Check, Clock, MapPin, X } from 'lucide-react';

export default function OutingModal({ onClose, onSubmit, selectedArea = null }) {
  const [areas, setAreas] = useState([]);
  const [data, setData] = useState({
    date: new Date().toISOString().split('T')[0],
    location_id: selectedArea?.id || '',
    place_name: selectedArea?.name || '',
    start_time: new Date().toTimeString().slice(0, 5),
  });

  const selectedAreaRecord = areas.find(a => a.id === data.location_id) || selectedArea;
  const inputCls = 'w-full h-14 pl-14 pr-4 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-medium outline-none focus:border-green-700 focus:ring-2 focus:ring-green-700/10 transition-all';
  const labelCls = 'text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2 block';
  const fieldIconCls = 'absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center pointer-events-none';

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
      title={(
        <span className="flex items-center gap-4 min-w-0">
          <span className="w-12 h-12 rounded-full bg-green-800 text-white flex items-center justify-center text-2xl shadow-sm flex-shrink-0">🦌</span>
          <span className="min-w-0 block">
            <span className="text-2xl font-bold leading-tight text-slate-900 block">Start Outing</span>
            <span className="text-sm font-medium text-green-800/80 block mt-1">Stalk Map check-in</span>
          </span>
        </span>
      )}
      onSubmit={handleSubmit}
      footer={(
        <>
          <button type="button" onClick={onClose} className="flex-1 h-12 rounded-xl font-bold text-sm bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors active:scale-95 flex items-center justify-center gap-3">
            <X className="w-5 h-5" /> Cancel
          </button>
          <button type="submit" className="flex-1 h-12 rounded-xl font-bold text-sm bg-orange-600 text-white hover:bg-orange-700 transition-colors active:scale-95 flex items-center justify-center gap-3 shadow-sm">
            <Check className="w-5 h-5" /> Check In
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-4 h-4 text-green-800" />
            <h3 className="text-sm font-bold text-green-800 uppercase tracking-wide">Session Setup</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Date</label>
              <div className="relative">
                <span className={fieldIconCls}><Calendar className="w-5 h-5" /></span>
                <input type="date" value={data.date} onChange={(e) => setData({ ...data, date: e.target.value })} className={inputCls} required />
              </div>
            </div>

            <div>
              <label className={labelCls}>Select Area</label>
              <div className="relative">
                <span className={fieldIconCls}><MapPin className="w-5 h-5" /></span>
                <select value={data.location_id} onChange={(e) => handleAreaSelect(e.target.value)} className={`${inputCls} appearance-none`} required>
                  <option value="">Select your area</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              {selectedAreaRecord && (
                <p className="text-xs text-green-700 mt-2 flex items-center gap-1.5 font-medium">
                  <Check className="w-3.5 h-3.5" /> Area selected: {selectedAreaRecord.name}
                </p>
              )}
            </div>

            <div>
              <label className={labelCls}>Place Name</label>
              <div className="relative">
                <span className={fieldIconCls}><MapPin className="w-5 h-5" /></span>
                <input type="text" value={data.place_name} onChange={(e) => setData({ ...data, place_name: e.target.value })} placeholder={selectedArea ? `Suggested: ${selectedArea.name}` : 'Enter location name'} className={inputCls} required />
              </div>
              <p className="text-xs text-slate-500 mt-2">You can edit the location name if needed.</p>
            </div>

            <div>
              <label className={labelCls}>Check-In Time</label>
              <div className="relative">
                <span className={fieldIconCls}><Clock className="w-5 h-5" /></span>
                <input type="time" value={data.start_time} onChange={(e) => setData({ ...data, start_time: e.target.value })} className={inputCls} required />
              </div>
            </div>
          </div>
        </section>

        <section className={`relative overflow-hidden rounded-2xl border p-5 ${selectedAreaRecord ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-4 relative z-10">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${selectedAreaRecord ? 'bg-green-700 text-white' : 'bg-slate-200 text-slate-500'}`}>
              <Check className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className={`text-base font-bold ${selectedAreaRecord ? 'text-green-800' : 'text-slate-700'}`}>{selectedAreaRecord ? 'Ready to check in' : 'Select an area to continue'}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700 mt-2">
                {selectedAreaRecord && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-green-700" /> Area: <strong>{selectedAreaRecord.name}</strong></span>}
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-green-700" /> Time: <strong>{data.start_time}</strong></span>
              </div>
            </div>
          </div>
          <div className="absolute right-5 bottom-1 text-7xl opacity-10 pointer-events-none">🦌</div>
        </section>
      </div>
    </GlobalModal>
  );
}