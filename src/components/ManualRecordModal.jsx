import { useState, useEffect, useRef } from 'react';
import { useFormValidation } from '@/lib/formValidation';
import { useMobileKeyboardHandler } from '@/lib/mobileKeyboardHandler';
import { cameraPermissionHandler } from '@/lib/cameraPermissionHandler';
import { base44 } from '@/api/base44Client';
import AddRifleForm from './AddRifleForm';
import BottomSheetSelect from '@/components/BottomSheetSelect';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import NumberInput from '@/components/ui/NumberInput.jsx';
import { formatAmmunitionLabel } from '@/utils/ammoLabels';

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
  const [user, setUser] = useState(null);

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

    // Ammo (shared, no duplicate keys)
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
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const [clubsList, locationsList, riflesList, shotgunsList, ammoList] = await Promise.all([
        base44.entities.Club.filter({ created_by: currentUser.email }),
        base44.entities.Area.filter({ created_by: currentUser.email }),
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
    
    // Check ownership if editing
    if (record && user && record.created_by !== user.email) {
      alert('You can only edit your own records');
      return;
    }
    
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
          ammunition_id: formData.ammunition_id,
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
      <GlobalModal open={true} onClose={onClose} title="Loading…" footer={null}>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </GlobalModal>
    );
  }

  return (
    <GlobalModal
      open={true}
      onClose={onClose}
      title={record ? 'Edit Record' : 'Add Manual Record'}
      onSubmit={handleSubmit}
      primaryAction={record ? 'Update Record' : 'Add Record'}
      maxWidth="max-w-2xl"
    >
      <div ref={modalRef} className="space-y-6">
          {/* Record Type & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Record Type</label>
              <BottomSheetSelect
                value={recordType}
                onChange={setRecordType}
                placeholder="Select type"
                options={[
                  { value: 'target', label: 'Target Shooting' },
                  { value: 'clay', label: 'Clay Shooting' },
                  { value: 'deer', label: 'Deer Management' },
                ]}
              />
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
                <BottomSheetSelect
                  value={formData.club_id}
                  onChange={(val) => { setFormData({ ...formData, club_id: val }); clearError('club'); }}
                  placeholder="Select a club"
                  options={clubs.filter(c => c.type === 'Target Shooting' || c.type === 'Both').map(c => ({ value: c.id, label: c.name }))}
                />
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
                          <div className="font-medium">{rifles.find(r => r.id === rifle.rifle_id)?.name || 'Unknown Rifle'}</div>
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
                <BottomSheetSelect
                  value={formData.club_id}
                  onChange={(val) => { setFormData({ ...formData, club_id: val }); clearError('club'); }}
                  placeholder="Select a club"
                  options={clubs.filter(c => c.type === 'Clay Shooting' || c.type === 'Both').map(c => ({ value: c.id, label: c.name }))}
                />
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
                <BottomSheetSelect
                  value={formData.shotgun_id}
                  onChange={(val) => setFormData({ ...formData, shotgun_id: val })}
                  placeholder="Select a shotgun"
                  options={shotguns.map(s => ({ value: s.id, label: s.name }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
              <NumberInput
                label="Rounds Fired"
                value={formData.rounds_fired}
                onChange={(v) => setFormData({ ...formData, rounds_fired: v })}
                placeholder="0"
                unit="rounds"
              />
                <div>
                  <label className="block text-sm font-medium mb-2">Ammunition</label>
                  <BottomSheetSelect
                    value={formData.ammunition_id || ''}
                    onChange={(val) => {
                      const selectedAmmo = ammunition.find(a => a.id === val);
                      setFormData(prev => ({
                        ...prev,
                        ammunition_id: val,
                        ammunition_used: selectedAmmo ? formatAmmunitionLabel(selectedAmmo) : prev.ammunition_used,
                      }));
                    }}
                    placeholder="Select saved ammunition"
                    options={ammunition.map(a => ({ value: a.id, label: formatAmmunitionLabel(a) }))}
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
                <BottomSheetSelect
                  value={formData.location_id}
                  onChange={(val) => {
                    const selected = locations.find(l => l.id === val);
                    setFormData({ ...formData, location_id: val, place_name: selected?.name || formData.place_name });
                    clearError('location');
                  }}
                  placeholder="Select a location"
                  options={locations.map(l => ({ value: l.id, label: l.name }))}
                />
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
                <BottomSheetSelect
                  value={formData.deer_species}
                  onChange={(val) => setFormData({ ...formData, deer_species: val })}
                  placeholder="Select a species"
                  options={[
                    { value: 'Roe', label: 'Roe' },
                    { value: 'Muntjac', label: 'Muntjac' },
                    { value: 'Fallow', label: 'Fallow' },
                    { value: 'Red', label: 'Red' },
                    { value: 'Sika', label: 'Sika' },
                    { value: 'Chinese Water Deer', label: 'Chinese Water Deer' },
                    { value: 'Rabbit', label: 'Rabbit' },
                    { value: 'Grey Squirrel', label: 'Grey Squirrel' },
                    { value: 'Rat', label: 'Rat' },
                    { value: 'Fox', label: 'Fox' },
                    { value: 'Crow', label: 'Crow' },
                    { value: 'Wood Pigeon', label: 'Wood Pigeon' },
                    { value: 'Feral Cat', label: 'Feral Cat' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <NumberInput
                  label="Number Shot"
                  value={formData.number_shot}
                  onChange={(v) => setFormData({ ...formData, number_shot: v, total_count: v })}
                  placeholder="0"
                />
                <div>
                  <label className="block text-sm font-medium mb-2">Rifle</label>
                  <BottomSheetSelect
                    value={formData.rifle_id}
                    onChange={(val) => setFormData({ ...formData, rifle_id: val })}
                    placeholder="Select a rifle"
                    options={rifles.map(r => ({ value: r.id, label: r.name }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Ammunition</label>
                <BottomSheetSelect
                  value={formData.ammunition_id || ''}
                  onChange={(val) => {
                    const selectedAmmo = ammunition.find(a => a.id === val);
                    setFormData(prev => ({
                      ...prev,
                      ammunition_id: val,
                      ammunition_used: selectedAmmo ? formatAmmunitionLabel(selectedAmmo) : prev.ammunition_used,
                    }));
                  }}
                  placeholder="Select saved ammunition"
                  options={ammunition.map(a => ({ value: a.id, label: formatAmmunitionLabel(a) }))}
                />
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

      </div>
    </GlobalModal>
  );
}