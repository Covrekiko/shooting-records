import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ChildScreenHeader from '@/components/ChildScreenHeader';
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react';

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    location_address: '',
    postcode: '',
    center_point: { lat: '', lng: '' },
    polygon_coordinates: [],
    deer_species: [],
    notes: '',
  });
  const [addressError, setAddressError] = useState('');

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const currentUser = await base44.auth.me();
      const locationsList = await base44.entities.Area.filter({ created_by: currentUser.email });
      setLocations(locationsList);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateAddress = async () => {
    const address = `${formData.address_number} ${formData.address_street}, ${formData.city}, ${formData.postcode}`;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const results = await response.json();
      if (results.length === 0) {
        setAddressError('Address not found. Please check and try again.');
        return false;
      }
      setAddressError('');
      return true;
    } catch (error) {
      setAddressError('Error validating address');
      return false;
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          });
        },
        (error) => alert('Could not get location: ' + error.message),
        { enableHighAccuracy: true }
      );
    } else {
      alert('Geolocation not supported');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        name: formData.name,
        location_address: formData.location_address,
        postcode: formData.postcode,
        center_point: {
          lat: parseFloat(formData.center_point.lat),
          lng: parseFloat(formData.center_point.lng),
        },
        polygon_coordinates: formData.polygon_coordinates || [],
        deer_species: formData.deer_species || [],
        notes: formData.notes,
      };
      if (editingId) {
        await base44.entities.Area.update(editingId, submitData);
        setLocations(locations.map((l) => (l.id === editingId ? { ...l, ...submitData } : l)));
        setEditingId(null);
      } else {
        const newLocation = await base44.entities.Area.create(submitData);
        setLocations([...locations, newLocation]);
      }
      setFormData({
        name: '',
        location_address: '',
        postcode: '',
        center_point: { lat: '', lng: '' },
        polygon_coordinates: [],
        deer_species: [],
        notes: '',
      });
      setAddressError('');
      setShowForm(false);
    } catch (error) {
      console.error('Error saving area:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this area?')) return;
    try {
      await base44.entities.Area.delete(id);
      setLocations(locations.filter((l) => l.id !== id));
    } catch (error) {
      console.error('Error deleting area:', error);
    }
  };

  const startEdit = (location) => {
    setFormData({
      name: location.name,
      location_address: location.location_address || '',
      postcode: location.postcode || '',
      center_point: location.center_point || { lat: '', lng: '' },
      polygon_coordinates: location.polygon_coordinates || [],
      deer_species: location.deer_species || [],
      notes: location.notes || '',
    });
    setEditingId(location.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
        <ChildScreenHeader title="Deer Locations" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <ChildScreenHeader title="Deer Locations" />
      <main className="max-w-4xl mx-auto px-4 py-8 mobile-page-padding">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Deer Locations</h1>
          <p className="text-muted-foreground">Manage your hunting locations</p>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              location_address: '',
              postcode: '',
              center_point: { lat: '', lng: '' },
              polygon_coordinates: [],
              deer_species: [],
              notes: '',
            });
            setAddressError('');
            setShowForm(!showForm);
          }}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 mb-6"
        >
          <Plus className="w-5 h-5" />
          Add Area
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 mb-6 space-y-4">
            <input
              type="text"
              placeholder="Area Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <input
              type="text"
              placeholder="Location Address"
              value={formData.location_address}
              onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
            <input
              type="text"
              placeholder="Postcode"
              value={formData.postcode}
              onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium">Center Point Coordinates</label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Center Latitude"
                  step="0.000001"
                  value={formData.center_point.lat}
                  onChange={(e) => setFormData({ ...formData, center_point: { ...formData.center_point, lat: e.target.value } })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  required
                />
                <input
                  type="number"
                  placeholder="Center Longitude"
                  step="0.000001"
                  value={formData.center_point.lng}
                  onChange={(e) => setFormData({ ...formData, center_point: { ...formData.center_point, lng: e.target.value } })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        setFormData({
                          ...formData,
                          center_point: {
                            lat: position.coords.latitude.toFixed(6),
                            lng: position.coords.longitude.toFixed(6),
                          }
                        });
                      },
                      (error) => alert('Could not get location: ' + error.message),
                      { enableHighAccuracy: true }
                    );
                  } else {
                    alert('Geolocation not supported');
                  }
                }}
                className="w-full px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg flex items-center justify-center gap-2 font-medium"
              >
                <MapPin className="w-4 h-4" />
                Use My Current Location
              </button>
            </div>
            <textarea
              placeholder="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              rows="3"
            />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                {editingId ? 'Update' : 'Save'} Area
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
        )}

        <div className="space-y-3">
          {locations.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No areas created yet. Add one to get started.</p>
          ) : (
            locations.map((location) => (
              <div key={location.id} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{location.name}</h3>
                  <p className="text-sm text-muted-foreground">{location.location_address || 'No address'}</p>
                  {location.postcode && <p className="text-sm text-muted-foreground">{location.postcode}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(location)}
                    className="px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(location.id)}
                    className="px-3 py-1 text-sm bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}