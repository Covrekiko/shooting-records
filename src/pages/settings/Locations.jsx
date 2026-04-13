import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import BoundaryMapEditor from '@/components/BoundaryMapEditor';
import { Plus, Edit2, Trash2, Map } from 'lucide-react';

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    place_name: '',
    location: '',
    notes: '',
    photos: [],
    boundary_map_data: null,
  });

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const currentUser = await base44.auth.me();
      const locationsList = await base44.entities.DeerLocation.filter({ created_by: currentUser.email });
      setLocations(locationsList);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await base44.entities.DeerLocation.update(editingId, formData);
        setLocations(locations.map((l) => (l.id === editingId ? { ...l, ...formData } : l)));
        setEditingId(null);
      } else {
        const newLocation = await base44.entities.DeerLocation.create(formData);
        setLocations([...locations, newLocation]);
      }
      setFormData({ place_name: '', location: '', notes: '', photos: [], boundary_map_data: null });
      setShowForm(false);
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this location?')) return;
    try {
      await base44.entities.DeerLocation.delete(id);
      setLocations(locations.filter((l) => l.id !== id));
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  const startEdit = (location) => {
    setFormData(location);
    setEditingId(location.id);
    setShowForm(true);
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
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Deer Locations</h1>
          <p className="text-muted-foreground">Manage your hunting locations</p>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ place_name: '', location: '', notes: '', photos: [], boundary_map_data: null });
            setShowForm(!showForm);
          }}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 mb-6"
        >
          <Plus className="w-5 h-5" />
          Add Location
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 mb-6 space-y-4">
            <input
              type="text"
              placeholder="Place Name"
              value={formData.place_name}
              onChange={(e) => setFormData({ ...formData, place_name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <input
              type="text"
              placeholder="Location / Address / Map Info"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              required
            />
            <textarea
              placeholder="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              rows="3"
            />
            <div>
              <label className="block text-sm font-medium mb-2">Boundary & High Seats Map</label>
              <BoundaryMapEditor
                initialCenter={formData.location ? formData.location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/) ? [parseFloat(formData.location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/)[1]), parseFloat(formData.location.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/)[2])] : null : null}
                mapData={formData.boundary_map_data}
                onDataChange={(mapData) => setFormData({ ...formData, boundary_map_data: mapData })}
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                {editingId ? 'Update' : 'Save'} Location
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
          {locations.map((location) => (
            <div key={location.id} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{location.place_name}</h3>
                <p className="text-sm text-muted-foreground">{location.location}</p>
              </div>
              <div className="flex gap-2">
                {location.boundary_map_data && (
                  <button
                    onClick={() => {
                      setFormData({ ...location });
                      setShowForm(true);
                      setEditingId(location.id);
                    }}
                    className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded transition-colors flex items-center gap-1"
                    title="View/Edit Map"
                  >
                    <Map className="w-4 h-4" />
                  </button>
                )}
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
          ))}
        </div>
      </main>
    </div>
  );
}