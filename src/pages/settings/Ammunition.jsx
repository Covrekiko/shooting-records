import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ChildScreenHeader from '@/components/ChildScreenHeader';
import { Plus, Trash2 } from 'lucide-react';

export default function Ammunition() {
  const [ammunition, setAmmunition] = useState([]);
  const [rifles, setRifles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    brand: '',
    caliber: '',
    bullet_type: '',
    grain: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const ammoList = await base44.entities.Ammunition.filter({ created_by: currentUser.email });
        setAmmunition(ammoList);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleAddAmmunition = async (e) => {
    e.preventDefault();
    try {
      const newAmmo = await base44.entities.Ammunition.create(formData);
      setAmmunition([...ammunition, newAmmo]);
      setFormData({ brand: '', caliber: '', bullet_type: '', grain: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding ammunition:', error);
    }
  };

  const handleDeleteAmmunition = async (id) => {
    if (confirm('Delete this ammunition?')) {
      try {
        await base44.entities.Ammunition.delete(id);
        setAmmunition(ammunition.filter(a => a.id !== id));
      } catch (error) {
        console.error('Error deleting ammunition:', error);
      }
    }
  };



  if (loading) {
    return (
      <div>
        <ChildScreenHeader title="Ammunition" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ChildScreenHeader title="Ammunition" />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Ammunition Management</h1>
          <p className="text-muted-foreground">Manage ammunition for your rifles</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="mb-6 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Ammunition
        </button>

        {showForm && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Add New Ammunition</h2>
            <form onSubmit={handleAddAmmunition} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Brand</label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Caliber (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., 308 Win, 9mm"
                  value={formData.caliber}
                  onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bullet Type (optional)</label>
                <input
                  type="text"
                  value={formData.bullet_type}
                  onChange={(e) => setFormData({ ...formData, bullet_type: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Grain (optional)</label>
                <input
                  type="text"
                  value={formData.grain}
                  onChange={(e) => setFormData({ ...formData, grain: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                >
                  Save
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

        {ammunition.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No ammunition saved yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ammunition.map((ammo) => (
              <div key={ammo.id} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mt-1">Brand: {ammo.brand}</p>
                  {ammo.caliber && (
                    <p className="text-sm text-muted-foreground">Caliber: {ammo.caliber}</p>
                  )}
                  {ammo.bullet_type && (
                    <p className="text-sm text-muted-foreground">Bullet Type: {ammo.bullet_type}</p>
                  )}
                  {ammo.grain && (
                    <p className="text-sm text-muted-foreground">Grain: {ammo.grain}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteAmmunition(ammo.id)}
                  className="px-3 py-1 text-sm bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}