import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Plus, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import AmmoSpendingBreakdown from '@/components/AmmoSpendingBreakdown';
import GlobalModal, { ModalCancelButton, ModalSaveButton } from '@/components/ui/GlobalModal';
import { loadOwnedAmmunitionWithReloads } from '@/lib/ownedAmmunition';
import { formatAmmunitionLabel } from '@/utils/ammoLabels';
import { deleteReloadBatchWithRestore, isReloadedAmmunition } from '@/lib/reloadingDeleteUtils';
import { useFirstTimeGuide } from '@/hooks/useFirstTimeGuide';
import { FIRST_TIME_GUIDES } from '@/lib/firstTimeGuides';
import CaliberTypeahead from '@/components/CaliberTypeahead';
import { normalizeCaliber } from '@/utils/caliberCatalog';

export default function AmmunitionInventory() {
  const [ammo, setAmmo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const { Guide: AmmoGuide, showGuideThen: showAmmoGuideThen } = useFirstTimeGuide(FIRST_TIME_GUIDES.ammoCreate);
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
    lot_number: '',
    supplier: '',
    notes: '',
  });

  useEffect(() => {
    loadAmmo();
  }, []);

  const loadAmmo = async (attempt = 0) => {
    setError(null);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      const ammoList = await loadOwnedAmmunitionWithReloads(currentUser);
      setAmmo(ammoList);
    } catch (err) {
      // If rate-limited, retry once after a short delay
      if (err.message?.includes('Rate limit') && attempt < 2) {
        setTimeout(() => loadAmmo(attempt + 1), 2000 + attempt * 1000);
        return;
      }
      console.error('Error loading ammunition:', err);
      setError(err.message || 'Failed to load ammunition');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!navigator.onLine) {
      alert('This action requires internet connection to protect stock accuracy.');
      return;
    }
    try {
      if (editingId) {
        await base44.entities.Ammunition.update(editingId, { ...formData, caliber: normalizeCaliber(formData.caliber) });
      } else {
        await base44.functions.invoke('createAmmunitionForUser', {
          ammunition: { ...formData, caliber: normalizeCaliber(formData.caliber) },
        });
      }
      resetForm();
      loadAmmo();
    } catch (error) {
      console.error('Error saving ammunition:', error);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem?.id) return;
    if (!navigator.onLine) {
      alert('This action requires internet connection to protect stock accuracy.');
      return;
    }
    try {
      if (isReloadedAmmunition(deletingItem)) {
        const result = await deleteReloadBatchWithRestore({ ammunitionId: deletingItem.id });
        if (result.warnings?.length > 0) {
          alert(result.warnings.join('\n'));
        }
      } else {
        await base44.entities.Ammunition.delete(deletingItem.id);
      }
      setDeletingItem(null);
      await loadAmmo();
    } catch (error) {
      console.error('Error deleting ammunition:', error);
      alert('Error deleting ammunition: ' + error.message);
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
      lot_number: '',
      supplier: '',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const isLowStock = (quantity, threshold) => quantity < threshold;

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
        <Navigation />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#13161e] min-h-screen">
      <Navigation />
      <main className="max-w-4xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-1">Ammunition Inventory</h1>
            <p className="text-muted-foreground">Track and manage your ammunition stock</p>
          </div>
          <button
            onClick={() => {
              if (!navigator.onLine && !showForm) {
                alert('This action requires internet connection to protect stock accuracy.');
                return;
              }
              showForm ? setShowForm(false) : showAmmoGuideThen(() => setShowForm(true));
            }}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl hover:opacity-90 flex items-center gap-2 font-semibold whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Ammunition</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        <AmmoGuide />
        {showForm && (
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <h2 className="text-lg font-bold mb-4">{editingId ? 'Edit' : 'Add'} Ammunition</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Brand *</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Caliber</label>
                  <CaliberTypeahead
                    value={formData.caliber}
                    onChange={(caliber) => setFormData({ ...formData, caliber })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                    placeholder="e.g. .303 British, .308 Win"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Bullet Type</label>
                  <input
                    type="text"
                    value={formData.bullet_type}
                    onChange={(e) => setFormData({ ...formData, bullet_type: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Grain</label>
                  <input
                    type="text"
                    value={formData.grain}
                    onChange={(e) => setFormData({ ...formData, grain: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Quantity in Stock</label>
                  <input
                    type="number"
                    value={formData.quantity_in_stock}
                    onChange={(e) => setFormData({ ...formData, quantity_in_stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Units</label>
                  <select
                    value={formData.units}
                    onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                  >
                    <option value="rounds">Rounds</option>
                    <option value="boxes">Boxes</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Cost Per Unit</label>
                  <input
                    type="number"
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Date Purchased</label>
                  <input
                    type="date"
                    value={formData.date_purchased}
                    onChange={(e) => setFormData({ ...formData, date_purchased: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Low Stock Threshold</label>
                  <input
                    type="number"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                    min="0"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-border bg-secondary/30 p-3">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Extra Inventory Details <span className="normal-case font-normal">(optional)</span></p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={formData.lot_number || ''}
                    onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                    placeholder="Lot / batch number"
                  />
                  <input
                    type="text"
                    value={formData.supplier || ''}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                    placeholder="Supplier / shop"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase mb-2 block">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
                  rows="2"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold text-sm"
                >
                  {editingId ? 'Update' : 'Add'} Ammunition
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2.5 border border-border rounded-lg hover:bg-secondary font-semibold text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Spending Breakdown */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Spending Breakdown</h2>
          <AmmoSpendingBreakdown />
        </div>

        {error ? (
          <div className="bg-card border border-destructive/30 rounded-lg p-8 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
            <p className="text-destructive font-medium mb-1">Failed to load ammunition</p>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <button onClick={loadAmmo} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90">
              Retry
            </button>
          </div>
        ) : ammo.length === 0 ? (
           <div className="bg-card border border-border rounded-lg p-8 text-center">
             <p className="text-muted-foreground">No ammunition tracked yet</p>
           </div>
        ) : (
           <div className="space-y-3">
            {ammo.map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">
                       {formatAmmunitionLabel(item)}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.bullet_type && `${item.bullet_type}`} {item.grain && `${item.grain}gr`}
                    </p>
                    <div className="mt-3 space-y-1 text-xs">
                      <p>
                        <span className="font-medium">Stock:</span> {item.quantity_in_stock} {item.units}
                        {isLowStock(item.quantity_in_stock, item.low_stock_threshold) && (
                          <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                            <AlertCircle className="w-3 h-3" /> Low
                          </span>
                        )}
                      </p>
                      {item.cost_per_unit > 0 && (
                        <p>
                          <span className="font-medium">Cost:</span> £{item.cost_per_unit.toFixed(2)}/{item.units === 'rounds' ? 'rd' : 'box'} (£{(item.quantity_in_stock * item.cost_per_unit).toFixed(2)} total)
                        </p>
                      )}
                      {item.date_purchased && (
                        <p>
                          <span className="font-medium">{item.brand === 'Reloaded' ? 'Reloaded' : 'Purchased'}:</span> {format(new Date(item.date_purchased), 'MMM d, yyyy')}
                        </p>
                      )}
                      {(item.lot_number || item.supplier) && (
                        <p>
                          <span className="font-medium">Extra:</span> {[item.lot_number && `Lot ${item.lot_number}`, item.supplier].filter(Boolean).join(' · ')}
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
                      className="p-2 hover:bg-primary hover:text-primary-foreground rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingItem(item)}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"
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

        <GlobalModal
          open={!!deletingItem}
          onClose={() => setDeletingItem(null)}
          title="Delete ammunition?"
          subtitle={deletingItem ? `${deletingItem.brand}${deletingItem.caliber ? ` - ${deletingItem.caliber}` : ''}` : ''}
          footer={(
            <>
              <ModalCancelButton onClick={() => setDeletingItem(null)}>Cancel</ModalCancelButton>
              <ModalSaveButton danger onClick={handleDelete}>Delete</ModalSaveButton>
            </>
          )}
        >
          <p className="text-sm text-muted-foreground">
            {deletingItem && isReloadedAmmunition(deletingItem)
              ? 'This ammunition was created from a reload batch. Deleting it will also remove the linked reload session and restore unused components where safe.'
              : 'This will permanently remove this ammunition from your inventory.'}
          </p>
        </GlobalModal>
      </main>
    </div>
  );
}