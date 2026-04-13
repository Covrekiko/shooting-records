import { useState, useEffect, useRef } from 'react';
import { useFormValidation } from '@/lib/formValidation';
import { useMobileKeyboardHandler } from '@/lib/mobileKeyboardHandler';
import { cameraPermissionHandler } from '@/lib/cameraPermissionHandler';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import AddRifleForm from './AddRifleForm';

async function handlePhotoUpload(files, data, setFormData) {
  if (!files || files.length === 0) return;
  
  const uploadedPhotos = [];
  for (const file of files) {
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      uploadedPhotos.push(response.file_url);
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
  }
  
  if (uploadedPhotos.length > 0) {
    setFormData({ ...data, photos: [...(data.photos || []), ...uploadedPhotos] });
  }
}

export default function ManualRecordModal({ record = null, onClose, onSave, recordTypes = ['target', 'clay', 'deer'] }) {
  const modalRef = useRef(null);
  const { errors, validateField, clearError, hasErrors } = useFormValidation();
  useMobileKeyboardHandler(modalRef);
  const [recordType, setRecordType] = useState(record?.recordType || 'target');
  const [date, setDate] = useState(record?.date || new Date().toISOString().split('T')[0]);
  const [clubs, setClubs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [shotguns, setShotguns] = useState([]);
  const [ammunition, setAmmunition] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    // Shared
    club_id: record?.club_id || '',
    location_id: record?.location_id || '',
    place_name: record?.place_name || '',
    notes: record?.notes || '',
    photos: record?.photos || [],

    // Target Shooting
    checkin_time: record?.checkin_time || '09:00',
    checkout_time: record?.checkout_time || '17:00',
    rifles_used: record?.rifles_used || [],

    // Clay Shooting
    shotgun_id: record?.shotgun_id || '',
    rounds_fired: record?.rounds_fired || '',
    ammunition_used: record?.ammunition_used || '',
    ammunition_id: record?.ammunition_id || '',

    // Deer Management
    start_time: record?.start_time || '06:00',
    end_time: record?.end_time || '18:00',
    deer_species: record?.deer_species || 'Roe',
    number_shot: record?.number_shot || '',
    species_list: record?.species_list || [],
    total_count: record?.total_count || '',
    rifle_id: record?.rifle_id || '',
    ammunition_id: record?.ammunition_id || '',
    ammunition_used: record?.ammunition_used || '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      const [clubsList, locationsList, riflesList, shotgunsList, ammoList] = await Promise.all([
        base44.entities.Club.filter({ created_by: currentUser.email }),
        base44.entities.DeerLocation.filter({ created_by: currentUser.email }),
        base44.entities.Rifle.filter({ created_by: currentUser.email }),
        base44.entities.Shotgun.filter({ created_by: currentUser.email }),
        base44.entities.Ammunition.filter({ created_by: currentUser.email }),
      ]);
      setClubs(clubsList);
      setLocations(locationsList);
      setRifles(riflesList);
      setShotguns(shotgunsList);
      setAmmunition(ammoList);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    let hasValidationErrors = false;
    if (!date) {
      validateField('date', 'Date is required');
      hasValidationErrors = true;
    }
    if (recordType === 'target' && !formData.club_id) {
      validateField('club', 'Club is required');
      hasValidationErrors = true;
    }
    if (recordType === 'clay' && !formData.club_id) {
      validateField('club', 'Club is required');
      hasValidationErrors = true;
    }
    if (recordType === 'deer' && !formData.location_id) {
      validateField('location', 'Location is required');
      hasValidationErrors = true;
    }
    
    if (hasValidationErrors) return;
    
    try {
      const baseData = {
        date,
        notes: formData.notes,
        photos: formData.photos,
      };

      let data = baseData;

      if (recordType === 'target') {
        data = {
          ...data,
          club_id: formData.club_id,
          checkin_time: formData.checkin_time,
          checkout_time: formData.checkout_time,
          rifles_used: formData.rifles_used,
        };
      } else if (recordType === 'clay') {
        data = {
          ...data,
          club_id: formData.club_id,
          checkin_time: formData.checkin_time,
          checkout_time: formData.checkout_time,
          shotgun_id: formData.shotgun_id,
          rounds_fired: formData.rounds_fired ? parseInt(formData.rounds_fired) : 0,
          ammunition_used: formData.ammunition_used,
        };
      } else if (recordType === 'deer') {
        data = {
          ...data,
          location_id: formData.location_id,
          place_name: formData.place_name,
          start_time: formData.start_time,
          end_time: formData.end_time,
          deer_species: formData.deer_species,
          number_shot: formData.number_shot ? parseInt(formData.number_shot) : 0,
          species_list: formData.species_list,
          total_count: formData.total_count || formData.number_shot,
          rifle_id: formData.rifle_id,
          ammunition_used: formData.ammunition_used,
        };
      }

      await onSave(data, recordType, record?.id);
      onClose();
    } catch (error) {
      console.error('Error saving record:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-card rounded-lg p-6 max-w-md w-full">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto" ref={modalRef}>
      <div className="bg-card rounded-lg max-w-2xl w-full p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{record ? 'Edit Record' : 'Add Manual Record'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Record Type & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Record Type</label>
              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
                disabled={!!record}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background disabled:opacity-50"
              >
                <option value="target">Target Shooting</option>
                <option value="clay">Clay Shooting</option>
                <option value="deer">Deer Management</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  clearError('date');
                }}
                className={`w-full px-3 py-2 border rounded-lg bg-background ${
                  errors.date ? 'border-destructive' : 'border-border'
                }`}
                required
              />
              {errors.date && <p className="text-xs text-destructive mt-1">{errors.date}</p>}
            </div>
          </div>

          {/* Target Shooting */}
          {recordType === 'target' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Club</label>
                <select
                  value={formData.club_id}
                  onChange={(e) => {
                    setFormData({ ...formData, club_id: e.target.value });
                    clearError('club');
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-background ${
                    errors.club ? 'border-destructive' : 'border-border'
                  }`}
                >
                  <option value="">Select a club</option>
                  {clubs.filter(c => c.type === 'Target Shooting' || c.type === 'Both').map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
                {errors.club && <p className="text-xs text-destructive mt-1">{errors.club}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Check-in Time</label>
                  <input
                    type="time"
                    value={formData.checkin_time}
                    onChange={(e) => setFormData({ ...formData, checkin_time: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Check-out Time</label>
                  <input
                    type="time"
                    value={formData.checkout_time}
                    onChange={(e) => setFormData({ ...formData, checkout_time: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Rifles Used</h3>
                {formData.rifles_used && formData.rifles_used.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {formData.rifles_used.map((rifle, idx) => (
                      <div key={idx} className="bg-secondary/30 p-3 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{rifles[rifle.rifle_id]?.name || 'Unknown Rifle'}</div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, rifles_used: formData.rifles_used.filter((_, i) => i !== idx) })}
                            className="text-destructive text-sm hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div>Rounds: {rifle.rounds_fired}</div>
                          <div>Distance: {rifle.meters_range}m</div>
                          <div>Ammo: {rifle.ammunition_brand}</div>
                          <div>Caliber: {rifle.caliber}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <AddRifleForm rifles={rifles} ammunition={ammunition} formData={formData} setFormData={setFormData} />
              </div>
            </>
          )}

          {/* Clay Shooting */}
          {recordType === 'clay' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Club</label>
                <select
                  value={formData.club_id}
                  onChange={(e) => {
                    setFormData({ ...formData, club_id: e.target.value });
                    clearError('club');
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-background ${
                    errors.club ? 'border-destructive' : 'border-border'
                  }`}
                >
                  <option value="">Select a club</option>
                  {clubs.filter(c => c.type === 'Clay Shooting' || c.type === 'Both').map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
                {errors.club && <p className="text-xs text-destructive mt-1">{errors.club}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Check-in Time</label>
                  <input
                    type="time"
                    value={formData.checkin_time}
                    onChange={(e) => setFormData({ ...formData, checkin_time: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Check-out Time</label>
                  <input
                    type="time"
                    value={formData.checkout_time}
                    onChange={(e) => setFormData({ ...formData, checkout_time: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Shotgun</label>
                <select
                  value={formData.shotgun_id}
                  onChange={(e) => setFormData({ ...formData, shotgun_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="">Select a shotgun</option>
                  {shotguns.map((shotgun) => (
                    <option key={shotgun.id} value={shotgun.id}>{shotgun.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Rounds Fired</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.rounds_fired}
                    onChange={(e) => setFormData({ ...formData, rounds_fired: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Ammunition Used</label>
                  <input
                    type="text"
                    placeholder="e.g. Federal 12 Gauge"
                    value={formData.ammunition_used}
                    onChange={(e) => setFormData({ ...formData, ammunition_used: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
              </div>
            </>
          )}

          {/* Deer Management */}
          {recordType === 'deer' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <select
                  value={formData.location_id}
                  onChange={(e) => {
                    setFormData({ ...formData, location_id: e.target.value });
                    clearError('location');
                  }}
                  className={`w-full px-3 py-2 border rounded-lg bg-background ${
                    errors.location ? 'border-destructive' : 'border-border'
                  }`}
                >
                  <option value="">Select a location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.place_name}</option>
                  ))}
                </select>
                {errors.location && <p className="text-xs text-destructive mt-1">{errors.location}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Species</label>
                <select
                  value={formData.deer_species}
                  onChange={(e) => setFormData({ ...formData, deer_species: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="">Select a species</option>
                  <optgroup label="Deer">
                    <option>Roe</option>
                    <option>Muntjac</option>
                    <option>Fallow</option>
                    <option>Red</option>
                    <option>Sika</option>
                    <option>Chinese Water Deer</option>
                  </optgroup>
                  <optgroup label="Pest Control">
                    <option>Rabbit</option>
                    <option>Grey Squirrel</option>
                    <option>Rat</option>
                    <option>Fox</option>
                    <option>Crow</option>
                    <option>Wood Pigeon</option>
                    <option>Feral Cat</option>
                  </optgroup>
                  <option>Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Number Shot</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.number_shot}
                    onChange={(e) => setFormData({ ...formData, number_shot: e.target.value, total_count: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Rifle</label>
                  <select
                    value={formData.rifle_id}
                    onChange={(e) => setFormData({ ...formData, rifle_id: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option value="">Select a rifle</option>
                    {rifles.map((rifle) => (
                      <option key={rifle.id} value={rifle.id}>{rifle.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Ammunition</label>
                <select
                  value={formData.ammunition_id || ''}
                  onChange={(e) => {
                    const selectedAmmo = ammunition.find(a => a.id === e.target.value);
                    setFormData({ ...formData, ammunition_id: e.target.value });
                    if (selectedAmmo) {
                      setFormData(prev => ({ ...prev, ammunition_used: `${selectedAmmo.brand} ${selectedAmmo.caliber || ''} ${selectedAmmo.bullet_type || ''}`.trim() }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background mb-2"
                >
                  <option value="">Select saved ammunition</option>
                  {ammunition.length > 0 ? ammunition.map((ammo) => (
                    <option key={ammo.id} value={ammo.id}>
                      {ammo.brand} {ammo.caliber ? `(${ammo.caliber})` : ''} {ammo.bullet_type ? `- ${ammo.bullet_type}` : ''}
                    </option>
                  )) : <option disabled>No ammunition available</option>}
                </select>
                <span className="text-xs text-muted-foreground">Or enter manually:</span>
                <input
                  type="text"
                  placeholder="e.g. Federal .308"
                  value={formData.ammunition_used}
                  onChange={(e) => setFormData({ ...formData, ammunition_used: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background mt-1"
                />
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              rows="3"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium mb-2">Photos</label>
            <div className="flex gap-2 mb-3">
            <label className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center cursor-pointer font-medium transition-colors text-sm">
              📁 Choose Photo
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotoUpload(e.target.files, formData, setFormData)}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={async () => {
                const result = await cameraPermissionHandler.capturePhoto();
                if (result.success) {
                  clearError('camera');
                  handlePhotoUpload([result.file], formData, setFormData);
                } else {
                  validateField('camera', result.error);
                }
              }}
              className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center cursor-pointer font-medium transition-colors text-sm"
            >
              📷 Take Photo
            </button>
            </div>
            {errors.camera && <p className="text-xs text-destructive mb-2">{errors.camera}</p>}
            {formData.photos && formData.photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.photos.map((photo, idx) => (
                  <div key={idx} className="relative group">
                    <img src={photo} alt="preview" className="h-20 w-20 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, photos: formData.photos.filter((_, i) => i !== idx) })}
                      className="absolute top-0 right-0 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
            >
              {record ? 'Update Record' : 'Add Record'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}