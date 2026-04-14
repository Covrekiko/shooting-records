import { useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];

export default function UnifiedCheckoutModal({ activeOuting, rifles, ammunition, onSubmit, onClose }) {
  console.log('🔴 UnifiedCheckoutModal RENDERING - activeOuting:', activeOuting?.id, 'rifles:', rifles.length, 'ammunition:', ammunition.length);
  const [checkoutData, setCheckoutData] = useState({
    end_time: new Date().toTimeString().slice(0, 5),
    shot_anything: false,
    species_list: [{ species: '', count: '' }],
    rifle_id: '',
    ammunition_id: '',
    ammunition_used: '',
    notes: '',
    photos: [],
  });

  const addSpecies = () => {
    setCheckoutData(prev => ({
      ...prev,
      species_list: [...prev.species_list, { species: '', count: '' }],
    }));
  };

  const removeSpecies = (index) => {
    setCheckoutData(prev => ({
      ...prev,
      species_list: prev.species_list.filter((_, i) => i !== index),
    }));
  };

  const updateSpecies = (index, field, value) => {
    setCheckoutData(prev => {
      const updated = [...prev.species_list];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, species_list: updated };
    });
  };

  const handlePhotoUpload = async (e) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        continue;
      }
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setCheckoutData(prev => ({
          ...prev,
          photos: [...prev.photos, file_url],
        }));
      } catch (error) {
        console.error('Error uploading photo:', error);
      }
    }
  };

  const handleSubmit = () => {
    if (checkoutData.shot_anything) {
      const hasEmptySpecies = checkoutData.species_list.some(s => !s.species || !s.count);
      if (hasEmptySpecies) {
        alert('Please fill in all species and counts');
        return;
      }
    }
    // Auto-calculate total_count from species list
    const totalCount = checkoutData.shot_anything
      ? checkoutData.species_list.reduce((sum, s) => sum + (parseInt(s.count) || 0), 0)
      : 0;
    onSubmit({ ...checkoutData, total_count: String(totalCount) });
  };

  return (
    <div className="bg-card rounded-lg max-w-md w-[calc(100%-2rem)] sm:w-full p-4 sm:p-6 flex flex-col max-h-[85vh] sm:max-h-[90vh]" onClick={(e) => {
      console.log('🔴 UnifiedCheckoutModal modal container clicked');
      e.stopPropagation();
    }} style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Check Out</h2>
        <button onClick={onClose} className="p-0.5 hover:bg-slate-100 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div>
          <label className="block text-sm font-medium mb-1">Check-out Time</label>
          <input
            type="time"
            value={checkoutData.end_time}
            onChange={(e) => setCheckoutData({ ...checkoutData, end_time: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Did you shoot anything?</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setCheckoutData({ ...checkoutData, shot_anything: false })}
              className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                !checkoutData.shot_anything
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border hover:bg-secondary'
              }`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setCheckoutData({ ...checkoutData, shot_anything: true })}
              className={`flex-1 px-3 py-2 rounded-lg transition-colors ${
                checkoutData.shot_anything
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border hover:bg-secondary'
              }`}
            >
              Yes
            </button>
          </div>
        </div>

        {checkoutData.shot_anything && (
          <>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-bold">Species Harvested</label>
                <button
                  type="button"
                  onClick={addSpecies}
                  className="text-xs bg-secondary hover:bg-primary hover:text-primary-foreground px-2 py-1 rounded"
                >
                  + Add Species
                </button>
              </div>
              {checkoutData.species_list.map((entry, idx) => (
                <div key={idx} className="bg-secondary/30 p-3 rounded-lg mb-3 space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-muted-foreground">Species {idx + 1}</span>
                    {checkoutData.species_list.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSpecies(idx)}
                        className="text-xs text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <select
                    value={entry.species}
                    onChange={(e) => updateSpecies(idx, 'species', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-background"
                    required
                  >
                    <option value="">Select species</option>
                    <optgroup label="Deer">
                      {DEER_SPECIES.map((species) => (
                        <option key={species} value={species}>
                          {species}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Pest Control">
                      <option value="Fox">Fox</option>
                      <option value="Rabbit">Rabbit</option>
                      <option value="Hare">Hare</option>
                      <option value="Crow">Crow</option>
                      <option value="Magpie">Magpie</option>
                      <option value="Pigeon">Pigeon</option>
                      <option value="Squirrel">Squirrel</option>
                    </optgroup>
                  </select>
                  <input
                    type="number"
                    min="1"
                    placeholder="Count"
                    value={entry.count}
                    onChange={(e) => updateSpecies(idx, 'count', e.target.value)}
                    className="w-full px-2 py-1 text-sm border border-border rounded-lg bg-background"
                    required
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Rifle Used</label>
              <select
                value={checkoutData.rifle_id}
                onChange={(e) => setCheckoutData({ ...checkoutData, rifle_id: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              >
                <option value="">Select a rifle</option>
                {rifles.map((rifle) => (
                  <option key={rifle.id} value={rifle.id}>
                    {rifle.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ammunition</label>
              <select
                value={checkoutData.ammunition_id || ''}
                onChange={(e) => {
                  const selectedAmmo = ammunition.find(a => a.id === e.target.value);
                  if (selectedAmmo) {
                    setCheckoutData({
                      ...checkoutData,
                      ammunition_used: `${selectedAmmo.brand} ${selectedAmmo.caliber || ''} ${selectedAmmo.bullet_type || ''} ${selectedAmmo.grain || ''}`.trim(),
                      ammunition_id: e.target.value,
                    });
                  }
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background mb-2"
              >
                <option value="">Select saved ammunition</option>
                {ammunition.map((ammo) => (
                  <option key={ammo.id} value={ammo.id}>
                    {ammo.brand} {ammo.caliber ? `(${ammo.caliber})` : ''} {ammo.bullet_type ? `- ${ammo.bullet_type}` : ''}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="e.g. Federal 308 Win"
                value={checkoutData.ammunition_used}
                onChange={(e) => setCheckoutData({ ...checkoutData, ammunition_used: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={checkoutData.notes}
            onChange={(e) => setCheckoutData({ ...checkoutData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            rows="2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Photos</label>
          <div className="flex gap-2 mb-3">
            <label className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center cursor-pointer font-medium transition-colors">
              📁 Choose Photo
              <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
            </label>
            <label className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center cursor-pointer font-medium transition-colors">
              📷 Take Photo
              <input type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
          {checkoutData.photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {checkoutData.photos.map((photo, idx) => (
                <div key={idx} className="relative group">
                  <img src={photo} alt="preview" className="h-20 w-20 object-cover rounded" />
                  <button
                    type="button"
                    onClick={() => setCheckoutData({ ...checkoutData, photos: checkoutData.photos.filter((_, i) => i !== idx) })}
                    className="absolute top-0 right-0 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      <div className="flex-shrink-0 flex gap-3 pt-4 border-t border-border bg-card">
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          Check Out
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}