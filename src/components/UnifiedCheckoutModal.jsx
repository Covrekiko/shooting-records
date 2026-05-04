import { useState } from 'react';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { base44 } from '@/api/base44Client';
import { getSelectableAmmunition } from '@/lib/ammoUtils';
import { formatAmmunitionLabel } from '@/utils/ammoLabels';
import { Camera, Check, Clock, Crosshair, MapPin, Plus, Trash2, Upload, X } from 'lucide-react';

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];
const PEST_SPECIES = ['Fox', 'Rabbit', 'Grey Squirrel', 'Brown Rat', 'Mink', 'Stoat', 'Weasel', 'Mole', 'Pigeon (Feral)', 'Pigeon (Wood)', 'Crow', 'Magpie', 'Jackdaw', 'Jay', 'Rook', 'Canada Goose', 'Other (Pest)'];
const OTHER_SPECIES = ['Other', 'Other (Pest)'];

export default function UnifiedCheckoutModal({ activeOuting, rifles, ammunition, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    end_time: new Date().toTimeString().slice(0, 5),
    shot_anything: false,
    species_list: [],
    total_count: '',
    rounds_fired: '',
    rifle_id: '',
    ammunition_id: '',
    ammunition_used: '',
    notes: '',
  });
  const [selectedDeer, setSelectedDeer] = useState('');
  const [selectedPest, setSelectedPest] = useState('');
  const [deerQuantity, setDeerQuantity] = useState('1');
  const [pestQuantity, setPestQuantity] = useState('1');
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const handlePhotoUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
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
      setShowPhotoOptions(false);
    }
  };

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const updateEntry = (species, field, value) => {
    set('species_list', formData.species_list.map(s =>
      s.species === species ? { ...s, [field]: value, ...(field === 'count' ? { quantity: normalizeQuantity(value) } : {}) } : s
    ));
  };

  const removeEntry = (species) => {
    set('species_list', formData.species_list.filter(s => s.species !== species));
  };

  const normalizeQuantity = (value) => Math.max(1, parseInt(value, 10) || 1);

  const addSpecies = (species, quantityValue, speciesSetter, quantitySetter) => {
    const cleanSpecies = String(species || '').trim();
    const quantity = normalizeQuantity(quantityValue);
    if (!cleanSpecies || quantity <= 0) return;

    setFormData(prev => {
      const existing = prev.species_list.find(s => s.species === cleanSpecies);
      if (existing) {
        return {
          ...prev,
          species_list: prev.species_list.map(s => {
            if (s.species !== cleanSpecies) return s;
            const nextQuantity = normalizeQuantity(s.count) + quantity;
            return { ...s, count: String(nextQuantity), quantity: nextQuantity };
          }),
        };
      }

      return {
        ...prev,
        species_list: [...prev.species_list, { species: cleanSpecies, count: String(quantity), quantity, note: '' }],
      };
    });

    quantitySetter('1');
  };

  const totalCount = formData.species_list.reduce((sum, s) => sum + (parseInt(s.count) || 0), 0);

  const handleSubmit = () => {
    // rounds_fired defaults to total animal count if not explicitly entered
    const roundsFired = formData.shot_anything
      ? (parseInt(formData.rounds_fired) > 0 ? parseInt(formData.rounds_fired) : totalCount)
      : 0;
    onSubmit({
      ...formData,
      photos,
      total_count: formData.shot_anything ? String(totalCount) : null,
      rounds_fired: roundsFired,
      species_list: formData.shot_anything ? formData.species_list : [],
    });
  };

  const inputCls = 'w-full h-11 px-3 border border-border bg-background text-foreground rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none';
  const labelCls = 'text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 block';
  const cardCls = 'rounded-2xl border border-border bg-card shadow-sm';

  const selectedRifle = rifles.find(r => r.id === formData.rifle_id);
  const filteredAmmo = selectedRifle && selectedRifle.caliber
    ? getSelectableAmmunition(ammunition, selectedRifle.caliber)
    : ammunition;
  const harvestSummary = totalCount > 0 ? `${totalCount} animal${totalCount !== 1 ? 's' : ''}` : '0 animals';
  const rifleSummary = selectedRifle ? `${selectedRifle.name} (${selectedRifle.caliber})` : 'Not selected';

  const deerEntries = formData.species_list.filter(s => DEER_SPECIES.includes(s.species));
  const pestEntries = formData.species_list.filter(s => PEST_SPECIES.includes(s.species));

  const SpeciesRow = ({ entry, pest = false }) => (
    <div key={entry.species} className="rounded-xl border border-border bg-background/70 p-3 space-y-2">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${pest ? 'bg-slate-100 text-slate-600' : 'bg-green-50 text-green-700'}`}>
          {pest ? '🐾' : '🦌'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{entry.species}</p>
          <p className="text-xs text-muted-foreground">Quantity: {entry.count}</p>
        </div>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={entry.count}
          onChange={e => updateEntry(entry.species, 'count', e.target.value)}
          className="w-20 h-10 px-3 border border-border bg-card text-foreground rounded-xl text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => removeEntry(entry.species)}
          className="w-10 h-10 rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {OTHER_SPECIES.includes(entry.species) && (
        <input
          type="text"
          value={entry.note || ''}
          onChange={e => updateEntry(entry.species, 'note', e.target.value)}
          placeholder="Describe species…"
          className={inputCls}
        />
      )}
    </div>
  );

  return (
    <GlobalModal
      open={true}
      onClose={onClose}
      title={(
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-full bg-green-800 text-white flex items-center justify-center text-lg shadow-sm flex-shrink-0">🦌</span>
          <span className="min-w-0 block">
            <span className="text-lg font-bold leading-tight text-foreground block">Check Out</span>
            <span className="text-xs font-medium text-muted-foreground truncate block">{activeOuting?.location_name || 'Outing'} • Deer Management</span>
          </span>
        </span>
      )}
      onSubmit={handleSubmit}
      primaryAction="Complete Check Out"
      secondaryAction="Cancel"
      footer={(
        <>
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-xl font-semibold text-sm bg-card border border-border text-foreground hover:bg-secondary transition-colors active:scale-95 flex items-center justify-center gap-2">
            <X className="w-4 h-4" /> Cancel
          </button>
          <button type="submit" className="flex-1 h-11 rounded-xl font-semibold text-sm bg-gradient-to-r from-orange-500 to-primary text-white hover:opacity-90 transition-colors active:scale-95 flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Complete Check Out
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <section className={`${cardCls} p-4`}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Session Summary</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl bg-background/80 border border-border p-3 flex items-center gap-3 min-w-0">
              <MapPin className="w-5 h-5 text-green-700 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Area</p>
                <p className="text-sm font-bold text-foreground truncate">{activeOuting?.location_name || 'Outing'}</p>
              </div>
            </div>
            <div className="rounded-xl bg-background/80 border border-border p-3 flex items-center gap-3 min-w-0">
              <Clock className="w-5 h-5 text-green-700 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">End Time</p>
                <input type="time" value={formData.end_time} onChange={e => set('end_time', e.target.value)} className="w-full bg-transparent text-sm font-bold text-foreground outline-none" />
              </div>
            </div>
            <div className="rounded-xl bg-background/80 border border-border p-3 flex items-center gap-3 min-w-0">
              <span className="text-xl flex-shrink-0">🦌</span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Harvest</p>
                <p className="text-sm font-bold text-foreground truncate">{harvestSummary}</p>
              </div>
            </div>
            <div className="rounded-xl bg-background/80 border border-border p-3 flex items-center gap-3 min-w-0">
              <Crosshair className="w-5 h-5 text-green-700 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Rifle</p>
                <p className="text-sm font-bold text-foreground truncate">{rifleSummary}</p>
              </div>
            </div>
          </div>
        </section>

        {activeOuting?.shared_area && activeOuting?.share_outing_with_owner && (
          <section className={`${cardCls} p-4`}>
            <p className="text-sm font-bold text-foreground">This outing will be shared with {activeOuting.shared_owner_name || 'the area owner'} after checkout.</p>
            {activeOuting.share_live_location && <p className="text-xs text-muted-foreground mt-1">Live tracking stops when you check out.</p>}
          </section>
        )}

        <section className="rounded-2xl border border-green-200 bg-green-50/60 p-4 relative overflow-hidden">
          <div className="flex items-start gap-3 relative z-10">
            <input
              type="checkbox"
              id="shot_anything"
              checked={formData.shot_anything}
              onChange={e => set('shot_anything', e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded accent-green-700"
            />
            <label htmlFor="shot_anything" className="cursor-pointer flex-1">
              <span className="block text-sm font-bold text-foreground">I shot something today</span>
              <span className="block text-sm text-muted-foreground mt-1">Record harvested deer or pest control from this outing.</span>
            </label>
          </div>
          <div className="absolute right-4 bottom-1 text-5xl opacity-10">🦌</div>
        </section>

        {formData.shot_anything && (
          <>
            <section className={`${cardCls} p-4 space-y-4`}>
              <div className="flex items-start gap-2">
                <span className="text-lg">🦌</span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Species Harvested</h3>
                  <p className="text-xs text-muted-foreground mt-1">Add deer species and quantity taken during this outing.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem_10rem] gap-3">
                <select value={selectedDeer} onChange={e => setSelectedDeer(e.target.value)} className={inputCls}>
                  <option value="">Select species…</option>
                  {DEER_SPECIES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <input type="text" inputMode="numeric" pattern="[0-9]*" value={deerQuantity} onChange={e => setDeerQuantity(e.target.value.replace(/\D/g, ''))} className={inputCls} />
                <button
                  type="button"
                  disabled={!selectedDeer || normalizeQuantity(deerQuantity) <= 0}
                  onClick={() => addSpecies(selectedDeer, deerQuantity, setSelectedDeer, setDeerQuantity)}
                  className="h-11 rounded-xl bg-green-800 text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-green-900 transition-colors"
                ><Plus className="w-4 h-4" /> Add</button>
              </div>
              {deerEntries.length > 0 && (
                <div className="space-y-2">
                  {deerEntries.map(entry => <SpeciesRow key={entry.species} entry={entry} />)}
                </div>
              )}
              <div className="rounded-xl border border-orange-100 bg-orange-50/60 px-4 py-3 flex items-center justify-between text-sm">
                <span className="font-bold text-orange-700">Total Harvest</span>
                <span className="font-bold text-orange-700">{harvestSummary}</span>
              </div>
            </section>

            <section className={`${cardCls} p-4 space-y-4`}>
              <div className="flex items-start gap-2">
                <Crosshair className="w-4 h-4 text-green-700 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Pest Control</h3>
                  <p className="text-xs text-muted-foreground mt-1">Add pest species and quantity if recorded.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem_10rem] gap-3">
                <select value={selectedPest} onChange={e => setSelectedPest(e.target.value)} className={inputCls}>
                  <option value="">Select species…</option>
                  {PEST_SPECIES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <input type="text" inputMode="numeric" pattern="[0-9]*" value={pestQuantity} onChange={e => setPestQuantity(e.target.value.replace(/\D/g, ''))} className={inputCls} />
                <button
                  type="button"
                  disabled={!selectedPest || normalizeQuantity(pestQuantity) <= 0}
                  onClick={() => addSpecies(selectedPest, pestQuantity, setSelectedPest, setPestQuantity)}
                  className="h-11 rounded-xl bg-gradient-to-r from-orange-500 to-primary text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2 hover:opacity-90 transition-colors"
                ><Plus className="w-4 h-4" /> Add</button>
              </div>
              {pestEntries.length > 0 ? (
                <div className="space-y-2">
                  {pestEntries.map(entry => <SpeciesRow key={entry.species} entry={entry} pest />)}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                  <span>🐾</span> No pest control recorded
                </div>
              )}
            </section>

            <section className={`${cardCls} p-4 space-y-4`}>
              <div className="flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-green-700" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Firearm & Ammunition</h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Rounds Fired</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={formData.rounds_fired}
                    onChange={e => set('rounds_fired', e.target.value)}
                    placeholder={String(totalCount || 0)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Rifle Used</label>
                  <select value={formData.rifle_id} onChange={e => { set('rifle_id', e.target.value); set('ammunition_id', ''); set('ammunition_used', ''); }} className={inputCls}>
                    <option value="">Select rifle</option>
                    {rifles.map(r => <option key={r.id} value={r.id}>{r.name} ({r.caliber})</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Ammunition Used</label>
                  <select value={formData.ammunition_id} onChange={e => {
                    const ammo = ammunition.find(a => a.id === e.target.value);
                    set('ammunition_id', e.target.value);
                    set('ammunition_used', formatAmmunitionLabel(ammo));
                  }} className={inputCls}>
                    <option value="">Select ammunition</option>
                    {filteredAmmo.map(a => <option key={a.id} value={a.id}>{formatAmmunitionLabel(a)}</option>) }
                  </select>
                </div>
              </div>
            </section>

            <section className={`${cardCls} p-4 space-y-4`}>
              <div className="flex items-start gap-2">
                <Camera className="w-4 h-4 text-green-700 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Photos <span className="text-muted-foreground">(Optional)</span></h3>
                  <p className="text-xs text-muted-foreground mt-1">Add photos from your outing.</p>
                </div>
              </div>
              <input id="photo-gallery" type="file" multiple accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="hidden" />
              <input id="photo-camera" type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} disabled={uploading} className="hidden" />
              {!showPhotoOptions ? (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setShowPhotoOptions(true)}
                  className="w-full min-h-16 flex flex-col items-center justify-center gap-1 px-4 py-3 border-2 border-dashed border-border rounded-xl hover:border-primary transition-all text-sm disabled:opacity-50 bg-background/50"
                >
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="font-semibold text-foreground">{uploading ? 'Uploading...' : 'Tap to add photos'}</span>
                  <span className="text-xs text-muted-foreground">You can add multiple images</span>
                </button>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                  <label htmlFor="photo-camera" className="flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl cursor-pointer text-sm font-semibold hover:bg-primary/90 transition-colors">
                    <Camera className="w-4 h-4" /> Take Photo
                  </label>
                  <label htmlFor="photo-gallery" className="flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl cursor-pointer text-sm font-semibold hover:bg-secondary/80 transition-colors">
                    <Upload className="w-4 h-4" /> Gallery
                  </label>
                  <button type="button" onClick={() => setShowPhotoOptions(false)} className="px-3 py-3 rounded-xl border border-border text-muted-foreground hover:bg-secondary text-sm">✕</button>
                </div>
              )}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, idx) => (
                    <div key={idx} className="relative">
                      <img src={photo} alt="harvest" className="w-full h-20 object-cover rounded-xl border border-border" />
                      <button type="button" onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <section className={`${cardCls} p-4`}>
          <label className={labelCls}>Notes</label>
          <textarea
            value={formData.notes}
            onChange={e => set('notes', e.target.value)}
            className={`${inputCls} min-h-24 py-3 resize-none`}
            rows={3}
            placeholder="Optional notes about the outing..."
          />
        </section>
      </div>
    </GlobalModal>
  );
}