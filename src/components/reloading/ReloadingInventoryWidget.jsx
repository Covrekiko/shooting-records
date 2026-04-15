import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

export default function ReloadingInventoryWidget() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    component_type: 'bullet',
    brand: '',
    name: '',
    caliber: '',
    quantity_total: 0,
    unit: 'ea',
    cost_per_unit: 0,
    low_stock_threshold: 100,
    lot_number: '',
    date_acquired: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const user = await base44.auth.me();
      const data = await base44.entities.ReloadingInventory.filter({ created_by: user.email });
      setInventory(data);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await base44.entities.ReloadingInventory.update(editingItem.id, formData);
      } else {
        await base44.entities.ReloadingInventory.create(formData);
      }
      resetForm();
      loadInventory();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this component?')) return;
    try {
      await base44.entities.ReloadingInventory.delete(id);
      loadInventory();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleEdit = (item) => {
    setFormData(item);
    setEditingItem(item);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      component_type: 'bullet',
      brand: '',
      name: '',
      caliber: '',
      quantity_total: 0,
      unit: 'ea',
      cost_per_unit: 0,
      low_stock_threshold: 100,
      lot_number: '',
      date_acquired: new Date().toISOString().split('T')[0],
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const isLowStock = (total, threshold) => total < threshold;
  const componentTypeLabels = {
    brass: 'Brass Cases',
    bullet: 'Bullets',
    powder: 'Powder',
    primer: 'Primers',
    wad: 'Wads',
    shot: 'Shot',
  };

  if (loading) {
    return <div className="text-center py-4"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Component Inventory</h2>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 flex items-center gap-2 font-semibold"
        >
          <Plus className="w-4 h-4" />
          Add Component
        </button>
      </div>

      {inventory.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">No components tracked yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(componentTypeLabels).map(([type, label]) => {
            const items = inventory.filter(i => i.component_type === type);
            if (items.length === 0) return null;

            return (
              <div key={type}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">{label}</h3>
                <div className="space-y-2 mb-4">
                  {items.map(item => (
                    <div key={item.id} className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold">
                            {item.brand} {item.name && `- ${item.name}`}
                          </h4>
                          {item.caliber && <p className="text-xs text-muted-foreground">{item.caliber}</p>}
                          <div className="mt-2 space-y-1 text-sm">
                            <p>
                              <span className="font-medium">Stock:</span> {item.quantity_total} {item.unit}
                              {isLowStock(item.quantity_total, item.low_stock_threshold) && (
                                <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                                  <AlertCircle className="w-3 h-3" /> Low Stock
                                </span>
                              )}
                            </p>
                            {item.cost_per_unit > 0 && (
                              <p><span className="font-medium">Cost:</span> £{item.cost_per_unit.toFixed(2)}/{item.unit}</p>
                            )}
                            {item.lot_number && <p><span className="font-medium">Lot:</span> {item.lot_number}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 bg-secondary hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && createPortal(
        <div className="fixed inset-0 bg-black/50 z-[50000] flex items-end sm:items-center justify-center p-4 sm:p-0">
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            className="bg-card rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
              <h3 className="font-bold">{editingItem ? 'Edit Component' : 'Add Component'}</h3>
              <button onClick={resetForm} className="p-1 hover:bg-secondary rounded">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Type</label>
                <select
                  value={formData.component_type}
                  onChange={(e) => setFormData({ ...formData, component_type: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                >
                  <option value="bullet">Bullets</option>
                  <option value="powder">Powder</option>
                  <option value="primer">Primers</option>
                  <option value="brass">Brass Cases</option>
                  <option value="wad">Wads</option>
                  <option value="shot">Shot</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                    placeholder="Model/spec"
                  />
                </div>
              </div>

              {['brass', 'bullet'].includes(formData.component_type) && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Caliber</label>
                  <input
                    type="text"
                    value={formData.caliber}
                    onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity_total}
                    onChange={(e) => setFormData({ ...formData, quantity_total: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Unit</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                    placeholder="ea, gr, lb"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Cost/Unit</label>
                  <input
                    type="number"
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Low Stock Alert</label>
                  <input
                    type="number"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 100 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1.5">Lot Number</label>
                <input
                  type="text"
                  value={formData.lot_number}
                  onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90"
                >
                  {editingItem ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 border border-border rounded-lg font-semibold hover:bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}