import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Plus, Edit2, Trash2 } from 'lucide-react';

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
  const [clubNameInput, setClubNameInput] = useState('');
  const [clubSuggestions, setClubSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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
    e.preventDefault();
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
      setClubNameInput('');
      setClubSuggestions([]);
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
    setClubNameInput(club.name);
    setEditingId(club.id);
    setShowForm(true);
  };

  const handleClubNameChange = async (value) => {
    setClubNameInput(value);
    setFormData({ ...formData, name: value });
    
    if (value.length < 2) {
      setClubSuggestions([]);
      return;
    }
    
    const localClubs = clubs.filter(
      (club) => club.name.toLowerCase().includes(value.toLowerCase()) && club.name !== value
    );
    
    if (localClubs.length > 0) {
      setClubSuggestions(localClubs.slice(0, 5));
      return;
    }
    
    setLoadingSuggestions(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Find 5 real UK shooting clubs or gun clubs that match "${value}". Return only club names as a JSON array, nothing else. Example: ["Club Name 1", "Club Name 2"]`,
        add_context_from_internet: true,
      });
      const names = JSON.parse(response);
      setClubSuggestions(names.map((name) => ({ name, isWeb: true })).slice(0, 5));
    } catch (error) {
      console.error('Error fetching club suggestions:', error);
      setClubSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const selectClubName = (clubName) => {
    setClubNameInput(clubName);
    setFormData({ ...formData, name: clubName });
    setClubSuggestions([]);
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
        <datalist id="club-list" />
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Clubs</h1>
          <p className="text-muted-foreground">Manage your shooting clubs</p>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', type: '', location: '', notes: '' });
            setClubNameInput('');
            setClubSuggestions([]);
            setShowForm(!showForm);
          }}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 mb-6"
        >
          <Plus className="w-5 h-5" />
          Add Club
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="relative">
               <input
                  type="text"
                  placeholder="Club Name"
                  value={clubNameInput}
                  onChange={(e) => handleClubNameChange(e.target.value)}
                  autoComplete="new-password"
                  list="club-list"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  required
                />
                <datalist id="club-list" />
               {(loadingSuggestions || clubSuggestions.length > 0) && (
                   <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                     {loadingSuggestions ? (
                       <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                     ) : (
                       clubSuggestions.map((club, idx) => (
                         <button
                           key={idx}
                           type="button"
                           onClick={() => selectClubName(typeof club === 'string' ? club : club.name)}
                           className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors text-sm border-b border-border last:border-b-0"
                         >
                           {typeof club === 'string' ? club : club.name}
                         </button>
                       ))
                     )}
                   </div>
                 )}
             </div>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background"
                required
              >
                <option value="">Select type</option>
                <option value="Target Shooting">Target Shooting</option>
                <option value="Clay Shooting">Clay Shooting</option>
                <option value="Both">Both</option>
              </select>
              <input
                type="text"
                placeholder="Location / Address"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background md:col-span-2"
                required
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
                {editingId ? 'Update' : 'Save'} Club
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