import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Plus, Trash2, Edit2, AlertCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export default function AmmunitionInventory() {
  const navigate = useNavigate();
  const [ammo, setAmmo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    brand: '',
    caliber: '',
    bullet_type: '',
    grain: '',
    quantity_in_stock: 0,
    units: 'rounds',
    cost_per_unit: 0,
    date_purchased: new Date().toISOString().split('T')[0],
    low_stock_threshold: 50,
    notes: '',
  });

  useEffect(() => {
    loadAmmo();
  }, []);

  const loadAmmo = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const ammoList = await base44.entities.Ammunition.filter({ created_by: currentUser.email });
      setAmmo(ammoList);
    } catch (error) {
      console.error('Error loading ammunition:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await base44.entities.Ammunition.update(editingId, formData);
      } else {
        await base44.entities.Ammunition.create(formData);
      }
      resetForm();
      loadAmmo();
    } catch (error) {
      console.error('Error saving ammunition:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this ammunition?')) return;
    try {
      await base44.entities.Ammunition.delete(id);
      loadAmmo();
    } catch (error) {
      console.error('Error deleting ammunition:', error);
    }
  };

  const handleEdit = (item) => {
    setFormData(item);
    setEditingId(item.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      brand: '',
      caliber: '',
      bullet_type: '',
      grain: '',
      quantity_in_stock: 0,
      units: 'rounds',
      cost_per_unit: 0,
      date_purchased: new Date().toISOString().split('T')[0],
      low_stock_threshold: 50,
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const isLowStock = (quantity, threshold) => quantity < threshold;

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
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Ammunition Inventory</h1>
              <p className="text-muted-foreground">Track and manage your ammunition stock</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Ammunition
          </button>
        </div>

        {showForm && (
          <div className="bg-card border border-border rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit' : 'Add'} Ammunition</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Brand *</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Caliber</label>
                  <input
                    type="text"
                    value={formData.caliber}
                    onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    placeholder="e.g. .308 Win"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bullet Type</label>
                  <input
                    type="text"
                    value={formData.bullet_type}
                    onChange={(e) => setFormData({ ...formData, bullet_type: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Grain</label>
                  <input
                    type="text"
                    value={formData.grain}
                    onChange={(e) => setFormData({ ...formData, grain: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity in Stock</label>
                  <input
                    type="number"
                    value={formData.quantity_in_stock}
                    onChange={(e) => setFormData({ ...formData, quantity_in_stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Units</label>
                  <select
                    value={formData.units}
                    onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  >
                    <option value="rounds">Rounds</option>
                    <option value="boxes">Boxes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cost Per Unit</label>
                  <input
                    type="number"
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date Purchased</label>
                  <input
                    type="date"
                    value={formData.date_purchased}
                    onChange={(e) => setFormData({ ...formData, date_purchased: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Low Stock Threshold</label>
                  <input
                    type="number"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                  rows="2"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                >
                  {editingId ? 'Update' : 'Add'} Ammunition
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-border rounded-lg hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {ammo.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No ammunition tracked yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ammo.map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">
                      {item.brand} {item.caliber && `- ${item.caliber}`}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {item.bullet_type && `${item.bullet_type}`} {item.grain && `${item.grain}gr`}
                    </p>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Stock:</span> {item.quantity_in_stock} {item.units}
                        {isLowStock(item.quantity_in_stock, item.low_stock_threshold) && (
                          <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                            <AlertCircle className="w-4 h-4" /> Low
                          </span>
                        )}
                      </p>
                      {item.cost_per_unit > 0 && (
                        <p>
                          <span className="font-medium">Cost:</span> £{item.cost_per_unit.toFixed(2)} per {item.units === 'rounds' ? 'round' : 'box'} (Total: £{(item.quantity_in_stock * item.cost_per_unit).toFixed(2)})
                        </p>
                      )}
                      {item.date_purchased && (
                        <p>
                          <span className="font-medium">Purchased:</span> {format(new Date(item.date_purchased), 'MMM d, yyyy')}
                        </p>
                      )}
                      {item.notes && (
                        <p>
                          <span className="font-medium">Notes:</span> {item.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 bg-secondary hover:bg-primary hover:text-primary-foreground rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}