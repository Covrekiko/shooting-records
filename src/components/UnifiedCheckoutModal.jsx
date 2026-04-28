import { useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];

export default function UnifiedCheckoutModal({ activeOuting, rifles, ammunition, onSubmit, onClose }) {
  useBodyScrollLock(true);
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
      if (!checkoutData.ammunition_id) {
        alert('Please select the ammunition used');
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
    <div className="bg-white rounded-2xl max-w-md w-[calc(100%-1.5rem)] sm:w-full p-5 sm:p-6 flex flex-col max-h-[90vh] shadow-lg overflow-hidden" onClick={(e) => {
      e.stopPropagation();
    }} style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
      <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900">Check Out</h2>
        <motion.button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" whileTap={{ scale: 0.9 }}>
          <X className="w-5 h-5 text-slate-600" />
        </motion.button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
         <div>
           <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Check-out Time</label>
           <input
             type="time"
             value={checkoutData.end_time}
             onChange={(e) => setCheckoutData({ ...checkoutData, end_time: e.target.value })}
             className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
             required
           />
         </div>

        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Did you shoot anything?</label>
          <div className="flex gap-3">
            <motion.button
                  type="button"
                  onClick={() => setCheckoutData({ ...checkoutData, shot_anything: false })}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${
                    !checkoutData.shot_anything
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background text-foreground hover:bg-secondary'
                  }`}
                >
                  No
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setCheckoutData({ ...checkoutData, shot_anything: true })}
                  whileTap={{ scale: 0.98 }}
                  className={`flex-1 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${
                    checkoutData.shot_anything
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background text-foreground hover:bg-secondary'
                  }`}
                >
                  Yes
                </motion.button>
          </div>
        </div>

        {checkoutData.shot_anything && (
          <>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide">Species Harvested</label>
                <motion.button
                  type="button"
                  onClick={addSpecies}
                  whileTap={{ scale: 0.98 }}
                  className="text-xs bg-background border border-border hover:bg-secondary px-3 py-1.5 rounded-lg font-medium transition-all"
                >
                  + Add Species
                </motion.button>
              </div>
              {checkoutData.species_list.map((entry, idx) => (
                <div key={idx} className="bg-secondary/30 p-3 rounded-xl mb-3 space-y-2 border border-border">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-medium text-muted-foreground">Species {idx + 1}</span>
                       {checkoutData.species_list.length > 1 && (
                         <motion.button
                           type="button"
                           onClick={() => removeSpecies(idx)}
                           whileTap={{ scale: 0.95 }}
                           className="text-xs text-destructive hover:text-destructive/80 font-medium"
                         >
                           Remove
                         </motion.button>
                       )}
                     </div>
                    <select
                     value={entry.species}
                     onChange={(e) => updateSpecies(idx, 'species', e.target.value)}
                     className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                     className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                     required
                    />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Rifle Used</label>
              <select
                value={checkoutData.rifle_id}
                onChange={(e) => setCheckoutData({ ...checkoutData, rifle_id: e.target.value })}
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Ammunition *</label>
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
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Select saved ammunition (required)</option>
                {ammunition.map((ammo) => (
                  <option key={ammo.id} value={ammo.id}>
                    {ammo.brand} {ammo.caliber ? `(${ammo.caliber})` : ''} {ammo.bullet_type ? `- ${ammo.bullet_type}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Notes</label>
          <textarea
            value={checkoutData.notes}
            onChange={(e) => setCheckoutData({ ...checkoutData, notes: e.target.value })}
            className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows="2"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Photos</label>
          <div className="flex gap-2 mb-3">
            <label className="flex-1 px-4 py-2.5 bg-secondary hover:bg-secondary/80 rounded-xl text-center cursor-pointer font-medium text-sm transition-colors">
              📁 Choose Photo
              <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
            </label>
            <label className="flex-1 px-4 py-2.5 bg-secondary hover:bg-secondary/80 rounded-xl text-center cursor-pointer font-medium text-sm transition-colors">
              📷 Take Photo
              <input type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
          {checkoutData.photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {checkoutData.photos.map((photo, idx) => (
                <div key={idx} className="relative group">
                  <img src={photo} alt="preview" className="h-20 w-20 object-cover rounded-lg" />
                   <motion.button
                     type="button"
                     onClick={() => setCheckoutData({ ...checkoutData, photos: checkoutData.photos.filter((_, i) => i !== idx) })}
                     whileTap={{ scale: 0.9 }}
                     className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     ×
                   </motion.button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
      <div className="flex-shrink-0 flex gap-3 pt-4 border-t border-border flex-col-reverse sm:flex-row">
        <motion.button
          type="button"
          onClick={handleSubmit}
          whileTap={{ scale: 0.98 }}
          className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 font-semibold text-sm transition-all"
        >
          Check Out
        </motion.button>
        <motion.button
          type="button"
          onClick={onClose}
          whileTap={{ scale: 0.98 }}
          className="flex-1 px-4 py-3 border border-border bg-background rounded-xl hover:bg-secondary font-semibold text-sm transition-all"
        >
          Cancel
        </motion.button>
      </div>
      </div>
      );
      }