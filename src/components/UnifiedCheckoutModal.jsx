import { useState } from 'react';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import PhotoUpload from '@/components/PhotoUpload.jsx';

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];

export default function UnifiedCheckoutModal({ activeOuting, rifles, ammunition, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    end_time: new Date().toTimeString().slice(0, 5),
    shot_anything: false,
    species_list: [],
    total_count: '',
    rifle_id: '',
    ammunition_id: '',
    ammunition_used: '',
    notes: '',
    photos: [],
  });

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSpeciesChange = (species, count) => {
    const existing = formData.species_list.filter(s => s.species !== species);
    if (count && parseInt(count) > 0) {
      set('species_list', [...existing, { species, count: String(count) }]);
    } else {
      set('species_list', existing);
    }
  };

  const totalCount = formData.species_list.reduce((sum, s) => sum + (parseInt(s.count) || 0), 0);

  const handleSubmit = () => {
    onSubmit({
      ...formData,
      total_count: formData.shot_anything ? String(totalCount) : null,
      species_list: formData.shot_anything ? formData.species_list : [],
    });
  };

  const inputCls = 'w-full px-3 py-2.5 border border-input bg-background text-foreground rounded-lg text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none';
  const labelCls = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block';

  return (
    <GlobalModal
      open={true}
      onClose={onClose}
      title="Check Out"
      subtitle={activeOuting?.location_name}
      onSubmit={handleSubmit}
      primaryAction="Check Out"
      secondaryAction="Cancel"
    >
      <div className="space-y-4">
        <div>
          <label className={labelCls}>End Time</label>
          <input type="time" value={formData.end_time} onChange={e => set('end_time', e.target.value)} className={inputCls} />
        </div>

        <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
          <input
            type="checkbox"
            id="shot_anything"
            checked={formData.shot_anything}
            onChange={e => set('shot_anything', e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <label htmlFor="shot_anything" className="text-sm font-medium cursor-pointer">I shot something today</label>
        </div>

        {formData.shot_anything && (
          <>
            <div>
              <label className={labelCls}>Species Harvested</label>
              <div className="space-y-2">
                {DEER_SPECIES.map(species => {
                  const entry = formData.species_list.find(s => s.species === species);
                  return (
                    <div key={species} className="flex items-center gap-3">
                      <span className="text-sm w-36 text-foreground">{species}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        placeholder="0"
                        value={entry?.count || ''}
                        onChange={e => handleSpeciesChange(species, e.target.value)}
                        className="w-20 px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm outline-none focus:border-primary"
                      />
                    </div>
                  );
                })}
              </div>
              {totalCount > 0 && (
                <p className="text-xs text-primary font-semibold mt-2">Total: {totalCount} animal{totalCount !== 1 ? 's' : ''}</p>
              )}
            </div>

            <div>
              <label className={labelCls}>Rifle Used</label>
              <select value={formData.rifle_id} onChange={e => set('rifle_id', e.target.value)} className={inputCls}>
                <option value="">Select rifle</option>
                {rifles.map(r => <option key={r.id} value={r.id}>{r.name} ({r.caliber})</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Ammunition Used</label>
              <select value={formData.ammunition_id} onChange={e => {
                const ammo = ammunition.find(a => a.id === e.target.value);
                set('ammunition_id', e.target.value);
                set('ammunition_used', ammo ? `${ammo.brand} ${ammo.caliber}` : '');
              }} className={inputCls}>
                <option value="">Select ammunition</option>
                {ammunition.map(a => <option key={a.id} value={a.id}>{a.brand} {a.caliber}</option>)}
              </select>
            </div>
          </>
        )}

        <div>
          <label className={labelCls}>Notes</label>
          <textarea
            value={formData.notes}
            onChange={e => set('notes', e.target.value)}
            className={inputCls}
            rows={3}
            placeholder="Optional notes about the outing..."
          />
        </div>

        <div>
          <label className={labelCls}>Photos</label>
          <PhotoUpload
            photos={formData.photos}
            onPhotosChange={photos => set('photos', photos)}
          />
        </div>
      </div>
    </GlobalModal>
  );
}