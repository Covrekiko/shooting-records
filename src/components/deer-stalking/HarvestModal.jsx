import { useState } from 'react';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { DESIGN } from '@/lib/designConstants';
import PhotoUpload from '@/components/PhotoUpload';

export default function HarvestModal({ location, onClose, onSubmit }) {
  const [species, setSpecies] = useState('Roe');
  const [sex, setSex] = useState('unknown');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [photos, setPhotos] = useState([]);

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
            className={DESIGN.INPUT} rows={3}
            placeholder="Add details about the harvest..." />
        </div>

        <div>
          <label className={DESIGN.LABEL}>Photos (optional)</label>
          <PhotoUpload photos={photos} onPhotosChange={setPhotos} />
        </div>
      </div>
    </GlobalModal>
  );
}