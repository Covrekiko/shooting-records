import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import ChildScreenHeader from '@/components/ChildScreenHeader';
import BottomSheetSelect from '@/components/BottomSheetSelect';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const inp = 'w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/40';
const lbl = 'block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5';

export default function Clubs() {
  const [clubs, setClubs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    location: '',
    notes: '',
  });

  useEffect(() => {
    loadClubs();
  }, []);

  const loadClubs = async () => {
    try {
      const currentUser = await base44.auth.me();
      const clubsList = await base44.entities.Club.filter({ created_by: currentUser.email });
      setClubs(clubsList);
    } catch (error) {
      console.error('Error loading clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    try {
      if (editingId) {
        await base44.entities.Club.update(editingId, formData);
        setClubs(clubs.map((c) => (c.id === editingId ? { ...c, ...formData } : c)));
        setEditingId(null);
      } else {
        const newClub = await base44.entities.Club.create(formData);
        setClubs([...clubs, newClub]);
      }
      setFormData({ name: '', type: '', location: '', notes: '' });
      setShowForm(false);
    } catch (error) {
      console.error('Error saving club:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this club?')) return;
    try {
      await base44.entities.Club.delete(id);
      setClubs(clubs.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Error deleting club:', error);
    }
  };

  const startEdit = (club) => {
    setFormData(club);
    setEditingId(club.id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
        <ChildScreenHeader title="Clubs" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <ChildScreenHeader title="Clubs" />
      <main className="max-w-4xl mx-auto px-4 py-8 mobile-page-padding">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Clubs</h1>
          <p className="text-muted-foreground">Manage your shooting clubs</p>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', type: '', location: '', notes: '' });
            setShowForm(!showForm);
          }}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 mb-6"
        >
          <Plus className="w-5 h-5" />
          Add Club
        </button>

        <GlobalModal
          open={showForm}
          onClose={() => setShowForm(false)}
          title={editingId ? 'Edit Club' : 'Add Club'}
          onSubmit={handleSubmit}
          primaryAction={editingId ? 'Update Club' : 'Save Club'}
          secondaryAction="Cancel"
        >
          <div className="space-y-4">
            <div><label className={lbl}>Club Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={inp} required /></div>
            <div>
              <label className={lbl}>Type</label>
              <BottomSheetSelect value={formData.type} onChange={(val) => setFormData({ ...formData, type: val })} placeholder="Select type" options={[{ value: 'Target Shooting', label: 'Target Shooting' }, { value: 'Clay Shooting', label: 'Clay Shooting' }, { value: 'Both', label: 'Both' }]} />
            </div>
            <div><label className={lbl}>Location / Address *</label><input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className={inp} required /></div>
            <div><label className={lbl}>Notes</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className={inp} rows="2" /></div>
          </div>
        </GlobalModal>

        <div className="space-y-3">
          {clubs.map((club) => (
            <div key={club.id} className="bg-card border border-border rounded-lg p-4 flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{club.name}</h3>
                <p className="text-sm text-muted-foreground">{club.type}</p>
                <p className="text-sm text-muted-foreground">{club.location}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(club)}
                  className="px-3 py-1 text-sm bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(club.id)}
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