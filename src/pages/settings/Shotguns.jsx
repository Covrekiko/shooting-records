import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ChildScreenHeader from '@/components/ChildScreenHeader';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function Shotguns() {
  const [shotguns, setShotguns] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    make: '',
    model: '',
    gauge: '',
    barrel_length: '',
    serial_number: '',
    notes: '',
  });

  useEffect(() => {
    loadShotguns();
  }, []);

  const loadShotguns = async () => {
    try {
      const currentUser = await base44.auth.me();
      const shotgunsList = await base44.entities.Shotgun.filter({ created_by: currentUser.email });
      setShotguns(shotgunsList);
    } catch (error) {
      console.error('Error loading shotguns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await base44.entities.Shotgun.update(editingId, formData);
        setShotguns(shotguns.map((s) => (s.id === editingId ? { ...s, ...formData } : s)));
        setEditingId(null);
      } else {
        const newShotgun = await base44.entities.Shotgun.create(formData);
        setShotguns([...shotguns, newShotgun]);
      }
      setFormData({ name: '', make: '', model: '', gauge: '', barrel_length: '', serial_number: '', notes: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Error saving shotgun:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this shotgun?')) return;
    try {
      await base44.entities.Shotgun.delete(id);
      setShotguns(shotguns.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Error deleting shotgun:', error);
    }
  };

  const startEdit = (shotgun) => {
    setFormData(shotgun);
    setEditingId(shotgun.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
        <ChildScreenHeader title="Shotguns" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <ChildScreenHeader title="Shotguns" />
      <main className="max-w-4xl mx-auto px-4 py-8 mobile-page-padding">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Shotguns</h1>
          <p className="text-muted-foreground">Manage your shotgun collection</p>
        </div>

        <button
         onClick={() => {
           setEditingId(null);
           setFormData({ name: '', make: '', model: '', gauge: '', barrel_length: '', serial_number: '', notes: '' });
           setShowForm(!showForm);
         }}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 mb-6"
        >
          <Plus className="w-5 h-5" />
          Add Shotgun
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Shotgun Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background"
                required
              />
              <input
                type="text"
                placeholder="Make / Brand"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background"
                required
              />
              <input
                type="text"
                placeholder="Model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background"
                required
              />
              <input
                type="text"
                placeholder="Gauge"
                value={formData.gauge}
                onChange={(e) => setFormData({ ...formData, gauge: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background"
                required
              />
              <input
                type="text"
                placeholder="Barrel Length (e.g., 28in)"
                value={formData.barrel_length}
                onChange={(e) => setFormData({ ...formData, barrel_length: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background"
              />
              <input
                type="text"
                placeholder="Serial Number (optional)"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background"
              />
            </div>
            <textarea
              placeholder="Notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
              rows="2"
            />
            <div className="flex gap-3">
              <button type="submit" className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                {editingId ? 'Update' : 'Save'} Shotgun
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shotguns.map((shotgun) => (
            <div key={shotgun.id} className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-lg">{shotgun.name}</h3>
              <p className="text-sm text-muted-foreground">{shotgun.make} {shotgun.model}</p>
              <p className="text-sm text-muted-foreground">{shotgun.gauge}{shotgun.barrel_length && ` · ${shotgun.barrel_length}`}</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => startEdit(shotgun)}
                  className="flex-1 px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(shotgun.id)}
                  className="flex-1 px-3 py-1 text-sm bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded transition-colors flex items-center justify-center gap-1"
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