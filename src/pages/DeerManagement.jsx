import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import CheckinBanner from '@/components/CheckinBanner';
import { useGeolocation, calculateDistance } from '@/hooks/useGeolocation';
import LegalShootingHours from '@/components/LegalShootingHours';
import { Plus } from 'lucide-react';

const DEER_SPECIES = ['Roe', 'Muntjac', 'Fallow', 'Red', 'Sika', 'Chinese Water Deer', 'Other'];

export default function DeerManagement() {
  const [locations, setLocations] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [records, setRecords] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { location } = useGeolocation();
  const [nearbyLocation, setNearbyLocation] = useState(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: new Date().toTimeString().slice(0, 5),
    end_time: new Date().toTimeString().slice(0, 5),
    location_id: '',
    place_name: '',
    deer_species: '',
    number_shot: '',
    rifle_id: '',
    ammunition_used: '',
    notes: '',
    photos: [],
  });

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await base44.auth.me();

        const [locationsList, riflesList, recordsList] = await Promise.all([
          base44.entities.DeerLocation.filter({ created_by: currentUser.email }),
          base44.entities.Rifle.filter({ created_by: currentUser.email }),
          base44.entities.DeerManagement.filter({ created_by: currentUser.email }),
        ]);

        setLocations(locationsList);
        setRifles(riflesList);
        setRecords(recordsList);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (location && locations.length > 0) {
      locations.forEach((loc) => {
        const match = loc.location?.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
        if (match) {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            parseFloat(match[1]),
            parseFloat(match[2])
          );
          if (distance < 0.5) {
            setNearbyLocation({ name: loc.place_name, distance });
          }
        }
      });
    }
  }, [location, locations]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newRecord = await base44.entities.DeerManagement.create(formData);
      setRecords([...records, newRecord]);
      setShowForm(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        start_time: new Date().toTimeString().slice(0, 5),
        end_time: new Date().toTimeString().slice(0, 5),
        location_id: '',
        place_name: '',
        deer_species: '',
        number_shot: '',
        rifle_id: '',
        ammunition_used: '',
        notes: '',
        photos: [],
      });
    } catch (error) {
      console.error('Error creating record:', error);
    }
  };

  if (loading) {
    return (
      <div>
        <Navigation />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navigation />
      {nearbyLocation && (
        <CheckinBanner
          location={nearbyLocation.name}
          distance={nearbyLocation.distance}
          onDismiss={() => setNearbyLocation(null)}
          onCheckin={() => setShowForm(true)}
        />
      )}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Deer Management</h1>
          <p className="text-muted-foreground">Record your deer stalking outings</p>
        </div>

        <LegalShootingHours />

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 mb-6"
        >
          <Plus className="w-5 h-5" />
          New Outing
        </button>

        {showForm && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Record Deer Management Outing</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <select
                    value={formData.location_id}
                    onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option value="">Select location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.place_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Place Name</label>
                  <input
                    type="text"
                    value={formData.place_name}
                    onChange={(e) => setFormData({ ...formData, place_name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deer Species</label>
                  <select
                    value={formData.deer_species}
                    onChange={(e) => setFormData({ ...formData, deer_species: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    required
                  >
                    <option value="">Select species</option>
                    {DEER_SPECIES.map((species) => (
                      <option key={species} value={species}>
                        {species}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Number Shot</label>
                  <input
                    type="number"
                    value={formData.number_shot}
                    onChange={(e) => setFormData({ ...formData, number_shot: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rifle Used</label>
                  <select
                    value={formData.rifle_id}
                    onChange={(e) => setFormData({ ...formData, rifle_id: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option value="">Select rifle</option>
                    {rifles.map((rifle) => (
                      <option key={rifle.id} value={rifle.id}>
                        {rifle.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ammunition Used</label>
                  <input
                    type="text"
                    value={formData.ammunition_used}
                    onChange={(e) => setFormData({ ...formData, ammunition_used: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  rows="3"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                >
                  Save Record
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {records.map((record) => (
            <div key={record.id} className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold">{record.place_name}</h3>
              <p className="text-sm text-muted-foreground">{record.date} • {record.deer_species}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}