import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReloadingSessionForm({ session, onSubmit, onClose }) {
  const [formData, setFormData] = useState(
    session || {
      date: new Date().toISOString().split('T')[0],
      caliber: '',
      batch_number: generateBatchNumber(),
      rounds_loaded: 0,
      components: [],
      notes: '',
      total_cost: 0,
      cost_per_round: 0,
      powder_lot: '',
      primer_lot: '',
      bullet_lot: '',
      oal: '',
      charge_weight: '',
      create_ammo: true,
    }
  );

  const [components, setComponents] = useState(session?.components || []);
  const [newComponent, setNewComponent] = useState({
    type: 'bullet',
    brand: '',
    name: '',
    quantity_used: 0,
    unit: '',
    cost_per_unit: 0,
    total_cost: 0,
  });

  useEffect(() => {
    calculateTotalCost();
  }, [components, formData.rounds_loaded]);

  function generateBatchNumber() {
    const now = new Date();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `BN${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${random}`;
  }

  const calculateTotalCost = () => {
    const total = components.reduce((sum, c) => sum + (c.total_cost || 0), 0);
    const costPerRound = formData.rounds_loaded > 0 ? total / formData.rounds_loaded : 0;
    setFormData(prev => ({
      ...prev,
      total_cost: total,
      cost_per_round: costPerRound,
      components,
    }));
  };

  const addComponent = () => {
    if (newComponent.brand && newComponent.quantity_used > 0) {
      const component = {
        ...newComponent,
        total_cost: newComponent.quantity_used * newComponent.cost_per_unit,
      };
      setComponents([...components, component]);
      setNewComponent({
        type: 'bullet',
        brand: '',
        name: '',
        quantity_used: 0,
        unit: '',
        cost_per_unit: 0,
        total_cost: 0,
      });
    }
  };

  const removeComponent = (index) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.caliber || !formData.rounds_loaded) {
      alert('Please fill in caliber and rounds loaded');
      return;
    }
    onSubmit(formData);
  };

  const inputCls = "w-full px-3 py-2 border border-border rounded-lg bg-background text-sm";
  const labelCls = "block text-xs font-semibold text-muted-foreground uppercase mb-1.5";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-bold">{session ? 'Edit Session' : 'New Reloading Session'}</h2>
        <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <form id="reload-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className={inputCls}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Caliber *</label>
              <input
                type="text"
                value={formData.caliber}
                onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
                className={inputCls}
                placeholder=".308 Win"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Rounds Loaded *</label>
              <input
                type="number"
                value={formData.rounds_loaded}
                onChange={(e) => setFormData({ ...formData, rounds_loaded: parseInt(e.target.value) || 0 })}
                className={inputCls}
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Batch Number</label>
            <input
              type="text"
              value={formData.batch_number}
              disabled
              className={inputCls + " opacity-75 cursor-not-allowed"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Powder Lot #</label>
              <input
                type="text"
                value={formData.powder_lot}
                onChange={(e) => setFormData({ ...formData, powder_lot: e.target.value })}
                className={inputCls}
                placeholder="Safety tracking"
              />
            </div>
            <div>
              <label className={labelCls}>Primer Lot #</label>
              <input
                type="text"
                value={formData.primer_lot}
                onChange={(e) => setFormData({ ...formData, primer_lot: e.target.value })}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>OAL</label>
              <input
                type="text"
                value={formData.oal}
                onChange={(e) => setFormData({ ...formData, oal: e.target.value })}
                className={inputCls}
                placeholder="Overall Length"
              />
            </div>
            <div>
              <label className={labelCls}>Charge Weight</label>
              <input
                type="text"
                value={formData.charge_weight}
                onChange={(e) => setFormData({ ...formData, charge_weight: e.target.value })}
                className={inputCls}
                placeholder="e.g. 45.5gr"
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={inputCls}
              rows="2"
              placeholder="Load data, observations, etc."
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
            <input
              type="checkbox"
              id="create_ammo"
              checked={formData.create_ammo}
              onChange={(e) => setFormData({ ...formData, create_ammo: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="create_ammo" className="text-sm font-medium cursor-pointer flex-1">
              Auto-add to ammunition inventory
            </label>
          </div>

          {/* Components Section */}
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold mb-3">Components Used</h3>
            
            {/* Add Component Form */}
            <div className="bg-secondary/30 p-4 rounded-lg space-y-3 mb-4">
              <div>
                <label className={labelCls}>Component Type</label>
                <select
                  value={newComponent.type}
                  onChange={(e) => setNewComponent({ ...newComponent, type: e.target.value })}
                  className={inputCls}
                >
                  <option value="bullet">Bullet</option>
                  <option value="powder">Powder</option>
                  <option value="primer">Primer</option>
                  <option value="brass">Brass</option>
                  <option value="wad">Wad (Shotgun)</option>
                  <option value="shot">Shot (Shotgun)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Brand</label>
                  <input
                    type="text"
                    value={newComponent.brand}
                    onChange={(e) => setNewComponent({ ...newComponent, brand: e.target.value })}
                    className={inputCls}
                    placeholder="Brand"
                  />
                </div>
                <div>
                  <label className={labelCls}>Name</label>
                  <input
                    type="text"
                    value={newComponent.name}
                    onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
                    className={inputCls}
                    placeholder="Model/Description"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={labelCls}>Qty</label>
                  <input
                    type="number"
                    value={newComponent.quantity_used}
                    onChange={(e) => setNewComponent({ ...newComponent, quantity_used: parseFloat(e.target.value) || 0 })}
                    className={inputCls}
                    step="0.01"
                  />
                </div>
                <div>
                  <label className={labelCls}>Unit</label>
                  <input
                    type="text"
                    value={newComponent.unit}
                    onChange={(e) => setNewComponent({ ...newComponent, unit: e.target.value })}
                    className={inputCls}
                    placeholder="ea, gr, lb"
                  />
                </div>
                <div>
                  <label className={labelCls}>Cost/Unit</label>
                  <input
                    type="number"
                    value={newComponent.cost_per_unit}
                    onChange={(e) => setNewComponent({ ...newComponent, cost_per_unit: parseFloat(e.target.value) || 0 })}
                    className={inputCls}
                    step="0.01"
                    placeholder="£"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addComponent}
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm font-semibold flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Component
              </button>
            </div>

            {/* Components List */}
            {components.length > 0 && (
              <div className="space-y-2">
                {components.map((comp, idx) => (
                  <div key={idx} className="bg-card border border-border p-3 rounded-lg flex items-start justify-between">
                    <div className="flex-1 text-sm">
                      <p className="font-semibold">{comp.brand} {comp.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {comp.quantity_used} {comp.unit} @ £{comp.cost_per_unit.toFixed(2)} = £{comp.total_cost?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeComponent(idx)}
                      className="p-1 hover:bg-destructive/10 text-destructive rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cost Summary */}
          <div className="border-t border-border pt-4 bg-primary/5 p-4 rounded-lg">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Cost:</span>
                <span className="font-semibold">£{formData.total_cost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost per Round:</span>
                <span className="font-bold text-primary">£{formData.cost_per_round.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-5 border-t border-border flex-shrink-0 bg-card">
        <motion.button
          type="submit"
          form="reload-form"
          whileTap={{ scale: 0.97 }}
          className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90"
        >
          {session ? 'Update Session' : 'Save Session'}
        </motion.button>
        <motion.button
          type="button"
          onClick={onClose}
          whileTap={{ scale: 0.97 }}
          className="flex-1 py-3 border border-border rounded-lg font-semibold hover:bg-secondary"
        >
          Cancel
        </motion.button>
      </div>
    </div>
  );
}