import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { DESIGN } from '@/lib/designConstants';

export default function HarvestModal({ location, onClose, onSubmit }) {
  const [species, setSpecies] = useState('Roe');
  const [sex, setSex] = useState('unknown');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const files = e.target.files;
    if (!files) return;
    e.target.value = '';
    if (!navigator.onLine) {
      alert('Photo upload requires internet. Please try again when online.');
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setPhotos(prev => [...prev, file_url]);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    onSubmit({ species, sex, notes, photos, date });
  };

  return (
    <GlobalModal
      open={true}
      onClose={onClose}
      title="Record Harvest"
      subtitle={`Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
      onSubmit={handleSubmit}
      primaryAction="Save Harvest"
      secondaryAction="Cancel"
    >
      <div className="space-y-4">
        <div>
          <label className={DESIGN.LABEL}>Species</label>
          <select value={species} onChange={(e) => setSpecies(e.target.value)} className={DESIGN.INPUT}>
            <optgroup label="Deer">
              <option>Roe</option>
              <option>Muntjac</option>
              <option>Fallow</option>
              <option>Red</option>
              <option>Sika</option>
              <option>Chinese Water Deer</option>
            </optgroup>
            <optgroup label="Pest Control">
              <option>Fox</option>
              <option>Rabbit</option>
              <option>Grey Squirrel</option>
              <option>Brown Rat</option>
              <option>Mink</option>
              <option>Stoat</option>
              <option>Weasel</option>
              <option>Mole</option>
              <option>Pigeon (Feral)</option>
              <option>Pigeon (Wood)</option>
              <option>Crow</option>
              <option>Magpie</option>
              <option>Jackdaw</option>
              <option>Jay</option>
              <option>Rook</option>
              <option>Canada Goose</option>
              <option>Other (Pest)</option>
            </optgroup>
          </select>
        </div>

        <div>
          <label className={DESIGN.LABEL}>Sex</label>
          <div className="flex gap-2">
            {['male', 'female', 'unknown'].map(s => (
              <button key={s} type="button" onClick={() => setSex(s)}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                  sex === s ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary'
                }`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={DESIGN.LABEL}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={DESIGN.INPUT} />
        </div>

        <div>
          <label className={DESIGN.LABEL}>Notes (optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            className={DESIGN.INPUT} rows="3"
            placeholder="Add details about the harvest..." />
        </div>

        <div>
          <label className={DESIGN.LABEL}>Photos (optional)</label>
          <label className={`flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-all text-sm ${uploading ? 'opacity-50' : ''}`}>
            📷 {uploading ? 'Uploading...' : 'Add Photos'}
            <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="hidden" />
          </label>
          {photos.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative">
                  <img src={photo} alt="harvest" className="w-full h-20 object-cover rounded-xl border border-border" />
                  <button type="button" onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GlobalModal>
  );
}