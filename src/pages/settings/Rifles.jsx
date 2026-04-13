import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Plus, Edit2, Trash2 } from 'lucide-react';

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
  const [makeInput, setMakeInput] = useState('');
  const [makeSuggestions, setMakeSuggestions] = useState([]);
  const [loadingMake, setLoadingMake] = useState(false);

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
    e.preventDefault();
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
      setMakeInput('');
      setMakeSuggestions([]);
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
    setMakeInput(rifle.make);
    setEditingId(rifle.id);
    setShowForm(true);
  };

  const handleMakeChange = async (value) => {
    setMakeInput(value);
    setFormData({ ...formData, make: value });
    
    if (value.length < 2) {
      setMakeSuggestions([]);
      return;
    }
    
    setLoadingMake(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `List 5 top rifle manufacturers that match "${value}". Return only brand names as a JSON array, nothing else. Example: ["Brand 1", "Brand 2"]`,
        add_context_from_internet: true,
      });
      const brands = JSON.parse(response);
      setMakeSuggestions(brands.slice(0, 5));
    } catch (error) {
      console.error('Error fetching make suggestions:', error);
      setMakeSuggestions([]);
    } finally {
      setLoadingMake(false);
    }
  };

  const selectMake = (make) => {
    setMakeInput(make);
    setFormData({ ...formData, make });
    setMakeSuggestions([]);
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
          <h1 className="text-3xl font-bold">Rifles</h1>
          <p className="text-muted-foreground">Manage your rifle collection</p>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', make: '', model: '', caliber: '', serial_number: '', notes: '' });
            setMakeInput('');
            setMakeSuggestions([]);
            setShowForm(!showForm);
          }}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 mb-6"
        >
          <Plus className="w-5 h-5" />
          Add Rifle
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-6 mb-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Rifle Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background"
                required
              />
              <div className="relative">
                <input
                  type="text"
                  placeholder="Make / Brand"
                  value={makeInput}
                  onChange={(e) => handleMakeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  required
                />
                {(loadingMake || makeSuggestions.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                    {loadingMake ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
                    ) : (
                      makeSuggestions.map((make, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectMake(make)}
                          className="w-full text-left px-3 py-2 hover:bg-secondary transition-colors text-sm border-b border-border last:border-b-0"
                        >
                          {make}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
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
                placeholder="Caliber"
                value={formData.caliber}
                onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
                className="px-3 py-2 border border-border rounded-lg bg-background"
                required
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
                {editingId ? 'Update' : 'Save'} Rifle
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
          {rifles.map((rifle) => (
            <div key={rifle.id} className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold text-lg">{rifle.name}</h3>
              <p className="text-sm text-muted-foreground">{rifle.make} {rifle.model}</p>
              <p className="text-sm text-muted-foreground">{rifle.caliber}</p>
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