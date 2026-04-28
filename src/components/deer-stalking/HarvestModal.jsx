import { useState } from 'react';
import { Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import GlobalSheet from '@/components/ui/GlobalSheet.jsx';

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

    setUploading(true);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setPhotos((prev) => [...prev, file_url]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    onSubmit({ species, sex, notes, photos, date });
  };

  return (
    <GlobalSheet
      open={true}
      onClose={onClose}
      title="Record Harvest"
      subtitle={`Location: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`}
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl font-semibold text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">Cancel</button>
          <button type="button" onClick={handleSubmit} className="flex-1 h-11 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Save Harvest</button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Species</label>
          <select value={species} onChange={(e) => setSpecies(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm">
            <option>Roe</option><option>Muntjac</option><option>Fallow</option><option>Red</option><option>Sika</option><option>Chinese Water Deer</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Sex</label>
          <div className="flex gap-2">
            {['male', 'female', 'unknown'].map((s) => (
              <button key={s} type="button" onClick={() => setSex(s)}
                className={`flex-1 py-2 rounded-xl border-2 text-sm capitalize transition-all ${sex === s ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border bg-background'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Notes (Optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" rows="3" placeholder="Add details about the harvest..." />
        </div>
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase mb-1.5">Photos (Optional)</label>
          <label className="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-all">
            <Upload className="w-4 h-4" />
            <span className="text-sm">{uploading ? 'Uploading...' : 'Add Photos'}</span>
            <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="hidden" />
          </label>
          {photos.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative group">
                  <img src={photo} alt="harvest" className="w-full h-20 object-cover rounded-lg" />
                  <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </GlobalSheet>
  );
}