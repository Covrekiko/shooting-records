import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ChildScreenHeader from '@/components/ChildScreenHeader';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const inp = 'w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/40';
const lbl = 'block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5';

export default function Rifles() {
  const [rifles, setRifles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    make: '',
    model: '',
    caliber: '',
    serial_number: '',
    notes: '',
  });

  useEffect(() => {
    loadRifles();
  }, []);

  const loadRifles = async () => {
    try {
      const currentUser = await base44.auth.me();
      const riflesList = await base44.entities.Rifle.filter({ created_by: currentUser.email });
      setRifles(riflesList);
    } catch (error) {
      console.error('Error loading rifles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    try {
      if (editingId) {
        await base44.entities.Rifle.update(editingId, formData);
        setRifles(rifles.map((r) => (r.id === editingId ? { ...r, ...formData } : r)));
        setEditingId(null);
      } else {
        const newRifle = await base44.entities.Rifle.create(formData);
        setRifles([...rifles, newRifle]);
      }
      setFormData({ name: '', make: '', model: '', caliber: '', serial_number: '', notes: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Error saving rifle:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this rifle?')) return;
    try {
      await base44.entities.Rifle.delete(id);
      setRifles(rifles.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Error deleting rifle:', error);
    }
  };

  const startEdit = (rifle) => {
    setFormData(rifle);
    setEditingId(rifle.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
        <ChildScreenHeader title="Rifles" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <ChildScreenHeader title="Rifles" />
      <main className="max-w-4xl mx-auto px-4 py-8 mobile-page-padding">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Rifles</h1>
          <p className="text-muted-foreground">Manage your rifle collection</p>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', make: '', model: '', caliber: '', serial_number: '', notes: '' });
            setShowForm(!showForm);
          }}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 mb-6"
        >
          <Plus className="w-5 h-5" />
          Add Rifle
        </button>

        <GlobalModal
          open={showForm}
          onClose={() => setShowForm(false)}
          title={editingId ? 'Edit Rifle' : 'Add Rifle'}
          onSubmit={handleSubmit}
          primaryAction={editingId ? 'Update Rifle' : 'Save Rifle'}
          secondaryAction="Cancel"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className={lbl}>Rifle Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inp} required /></div>
              <div><label className={lbl}>Make / Brand *</label><input type="text" value={formData.make} onChange={(e) => setFormData({ ...formData, make: e.target.value })} className={inp} required /></div>
              <div><label className={lbl}>Model *</label><input type="text" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} className={inp} required /></div>
              <div><label className={lbl}>Caliber *</label><input type="text" value={formData.caliber} onChange={(e) => setFormData({ ...formData, caliber: e.target.value })} className={inp} required /></div>
              <div className="sm:col-span-2"><label className={lbl}>Serial Number (optional)</label><input type="text" value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} className={inp} /></div>
            </div>
            <div><label className={lbl}>Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className={inp} rows="2" /></div>
          </div>
        </GlobalModal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rifles.map((rifle) => (
            <div key={rifle.id} className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-lg">{rifle.name}</h3>
              <p className="text-sm text-muted-foreground">{rifle.make} {rifle.model}</p>
              <p className="text-sm text-muted-foreground">{rifle.caliber}</p>
              {rifle.serial_number && <p className="text-sm text-muted-foreground font-mono">S/N: {rifle.serial_number}</p>}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => startEdit(rifle)}
                  className="flex-1 px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(rifle.id)}
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