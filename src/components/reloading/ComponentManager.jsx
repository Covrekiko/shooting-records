import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import { format } from 'date-fns';

const COMPONENT_TYPES = [
  { value: 'primer', label: 'Primer', units: ['pieces'] },
  { value: 'powder', label: 'Powder', units: ['grains', 'grams', 'kg', 'oz', 'lb'] },
  { value: 'brass', label: 'Brass / Cartridge', units: ['pieces'] },
  { value: 'bullet', label: 'Bullet', units: ['pieces'] },
];

export default function ComponentManager() {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    component_type: 'primer',
    name: '',
    quantity_total: '',
    unit: 'pieces',
    price_total: '',
    date_acquired: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    try {
      setLoading(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const componentsList = await base44.entities.ReloadingComponent.filter({
        created_by: currentUser.email,
      });
      setComponents(componentsList);
    } catch (error) {
      console.error('Error loading components:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const costPerUnit = parseFloat(formData.price_total) / parseFloat(formData.quantity_total);
      const data = {
        ...formData,
        quantity_total: parseFloat(formData.quantity_total),
        quantity_remaining: parseFloat(formData.quantity_total),
        price_total: parseFloat(formData.price_total),
        cost_per_unit: costPerUnit,
      };

      if (editingId) {
        await base44.entities.ReloadingComponent.update(editingId, data);
      } else {
        await base44.entities.ReloadingComponent.create(data);
      }

      await loadComponents();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        component_type: 'primer',
        name: '',
        quantity_total: '',
        unit: 'pieces',
        price_total: '',
        date_acquired: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      });
    } catch (error) {
      console.error('Error saving component:', error);
      alert('Error saving component: ' + error.message);
    }
  };

  const handleEdit = (component) => {
    setEditingId(component.id);
    setFormData({
      component_type: component.component_type,
      name: component.name,
      quantity_total: component.quantity_total,
      unit: component.unit,
      price_total: component.price_total,
      date_acquired: component.date_acquired,
      notes: component.notes,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this component?')) return;
    try {
      await base44.entities.ReloadingComponent.delete(id);
      await loadComponents();
    } catch (error) {
      console.error('Error deleting component:', error);
      alert('Error deleting component: ' + error.message);
    }
  };

  const selectedType = COMPONENT_TYPES.find(t => t.value === formData.component_type);

  if (loading) {
    return <div className="text-center py-4"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
  }

  const groupedByType = COMPONENT_TYPES.reduce((acc, type) => {
    acc[type.value] = components.filter(c => c.component_type === type.value);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">{editingId ? 'Edit Component' : 'Add Component'}</h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="p-1 hover:bg-secondary rounded">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Component Type</label>
              <select
                value={formData.component_type}
                onChange={(e) => {
                  const type = COMPONENT_TYPES.find(t => t.value === e.target.value);
                  setFormData({ ...formData, component_type: e.target.value, unit: type.units[0] });
                }}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                {COMPONENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Component Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="e.g., CCI 200, Vihtavuori N140"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Quantity</label>
                <input
                  type="number"
                  value={formData.quantity_total}
                  onChange={(e) => setFormData({ ...formData, quantity_total: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  placeholder="1000"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Unit</label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                >
                  {selectedType?.units.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Total Price (£)</label>
              <input
                type="number"
                value={formData.price_total}
                onChange={(e) => setFormData({ ...formData, price_total: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="100"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Date Acquired</label>
              <input
                type="date"
                value={formData.date_acquired}
                onChange={(e) => setFormData({ ...formData, date_acquired: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                placeholder="Any notes about this component"
                rows="2"
              />
            </div>

            <button type="submit" className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90">
              {editingId ? 'Update Component' : 'Add Component'}
            </button>
          </form>
        </div>
      )}

      {/* Components List */}
      <div className="space-y-6">
        {COMPONENT_TYPES.map(type => {
          const typeComponents = groupedByType[type.value];
          return (
            <div key={type.value}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-lg">{type.label}s ({typeComponents.length})</h3>
                {!showForm && (
                  <button
                    onClick={() => {
                      setFormData({ ...formData, component_type: type.value, unit: type.units[0] });
                      setShowForm(true);
                    }}
                    className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-1 hover:opacity-90"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                )}
              </div>

              {typeComponents.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No {type.label.toLowerCase()}s added yet</p>
              ) : (
                <div className="grid gap-3">
                  {typeComponents.map(comp => (
                    <div key={comp.id} className="bg-card border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold">{comp.name}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {comp.quantity_remaining}/{comp.quantity_total} {comp.unit}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(comp)}
                            className="p-2 hover:bg-secondary rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(comp.id)}
                            className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-xs">
                        <div>
                          <p className="text-muted-foreground">Unit Cost</p>
                          <p className="font-semibold">£{comp.cost_per_unit.toFixed(4)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Cost</p>
                          <p className="font-semibold">£{comp.price_total.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Added</p>
                          <p className="font-semibold">{format(new Date(comp.date_acquired), 'MMM d')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}