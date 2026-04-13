import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
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
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                required
              />
            </div>
          </div>

          {/* Target Shooting */}
          {recordType === 'target' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Club</label>
                <select
                  value={formData.club_id}
                  onChange={(e) => setFormData({ ...formData, club_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="">Select a club</option>
                  {clubs.filter(c => c.type === 'Target Shooting' || c.type === 'Both').map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
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
            </>
          )}

          {/* Clay Shooting */}
          {recordType === 'clay' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">Club</label>
                <select
                  value={formData.club_id}
                  onChange={(e) => setFormData({ ...formData, club_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="">Select a club</option>
                  {clubs.filter(c => c.type === 'Clay Shooting' || c.type === 'Both').map((club) => (
                    <option key={club.id} value={club.id}>{club.name}</option>
                  ))}
                </select>
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
                  onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="">Select a location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.place_name}</option>
                  ))}
                </select>
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
                <label className="block text-sm font-medium mb-2">Deer Species</label>
                <select
                  value={formData.deer_species}
                  onChange={(e) => setFormData({ ...formData, deer_species: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option>Roe</option>
                  <option>Muntjac</option>
                  <option>Fallow</option>
                  <option>Red</option>
                  <option>Sika</option>
                  <option>Chinese Water Deer</option>
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
              <label className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-center cursor-pointer font-medium transition-colors text-sm">
                📷 Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={(e) => handlePhotoUpload(e.target.files, formData, setFormData)}
                  className="hidden"
                />
              </label>
            </div>
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