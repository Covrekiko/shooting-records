import { useState } from 'react';
import GlobalModal from '@/components/ui/GlobalModal.jsx';

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];
const PEST_SPECIES = ['Fox', 'Rabbit', 'Grey Squirrel', 'Brown Rat', 'Mink', 'Stoat', 'Weasel', 'Mole', 'Pigeon (Feral)', 'Pigeon (Wood)', 'Crow', 'Magpie', 'Jackdaw', 'Jay', 'Rook', 'Canada Goose', 'Other (Pest)'];
const OTHER_SPECIES = ['Other', 'Other (Pest)'];

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
  });
  const [selectedDeer, setSelectedDeer] = useState('');
  const [selectedPest, setSelectedPest] = useState('');

  const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const updateEntry = (species, field, value) => {
    set('species_list', formData.species_list.map(s =>
      s.species === species ? { ...s, [field]: value } : s
    ));
  };

  const removeEntry = (species) => {
    set('species_list', formData.species_list.filter(s => s.species !== species));
  };

  const addSpecies = (species, setter) => {
    if (!species) return;
    if (!formData.species_list.find(s => s.species === species)) {
      set('species_list', [...formData.species_list, { species, count: '1', note: '' }]);
    }
    setter('');
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

  const selectedRifle = rifles.find(r => r.id === formData.rifle_id);
  const filteredAmmo = selectedRifle
    ? ammunition.filter(a => a.caliber && selectedRifle.caliber && a.caliber.toLowerCase() === selectedRifle.caliber.toLowerCase())
    : ammunition;

  const deerEntries = formData.species_list.filter(s => DEER_SPECIES.includes(s.species));
  const pestEntries = formData.species_list.filter(s => PEST_SPECIES.includes(s.species));

  const SpeciesRow = ({ entry }) => (
    <div key={entry.species} className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm flex-1 text-foreground">{entry.species}</span>
        <input
          type="number"
          inputMode="numeric"
          min="1"
          value={entry.count}
          onChange={e => updateEntry(entry.species, 'count', e.target.value)}
          className="w-20 px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={() => removeEntry(entry.species)}
          className="text-muted-foreground hover:text-destructive text-xl leading-none px-1"
        >×</button>
      </div>
      {OTHER_SPECIES.includes(entry.species) && (
        <input
          type="text"
          value={entry.note || ''}
          onChange={e => updateEntry(entry.species, 'note', e.target.value)}
          placeholder="Describe species…"
          className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm outline-none focus:border-primary ml-0"
        />
      )}
    </div>
  );

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
            {/* Species Harvested — dropdown add */}
            <div>
              <label className={labelCls}>Species Harvested</label>
              <div className="flex gap-2">
                <select value={selectedDeer} onChange={e => setSelectedDeer(e.target.value)} className={inputCls}>
                  <option value="">Select species…</option>
                  {DEER_SPECIES.filter(p => !formData.species_list.find(s => s.species === p)).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedDeer}
                  onClick={() => addSpecies(selectedDeer, setSelectedDeer)}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-40 shrink-0"
                >Add</button>
              </div>
              {deerEntries.length > 0 && (
                <div className="mt-2 space-y-2">
                  {deerEntries.map(entry => <SpeciesRow key={entry.species} entry={entry} />)}
                </div>
              )}
            </div>

            {/* Pest Control — dropdown add */}
            <div>
              <label className={labelCls}>Pest Control</label>
              <div className="flex gap-2">
                <select value={selectedPest} onChange={e => setSelectedPest(e.target.value)} className={inputCls}>
                  <option value="">Select species…</option>
                  {PEST_SPECIES.filter(p => !formData.species_list.find(s => s.species === p)).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!selectedPest}
                  onClick={() => addSpecies(selectedPest, setSelectedPest)}
                  className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-40 shrink-0"
                >Add</button>
              </div>
              {pestEntries.length > 0 && (
                <div className="mt-2 space-y-2">
                  {pestEntries.map(entry => <SpeciesRow key={entry.species} entry={entry} />)}
                </div>
              )}
            </div>

            {totalCount > 0 && (
              <p className="text-xs text-primary font-semibold">Total: {totalCount} animal{totalCount !== 1 ? 's' : ''}</p>
            )}

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
                set('ammunition_used', ammo ? `${ammo.brand} ${ammo.caliber}` : '');
              }} className={inputCls}>
                <option value="">Select ammunition</option>
                {filteredAmmo.map(a => <option key={a.id} value={a.id}>{a.brand} {a.caliber}</option>)}
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
      </div>
    </GlobalModal>
  );
}