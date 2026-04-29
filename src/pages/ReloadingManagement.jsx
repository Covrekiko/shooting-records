import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import Navigation from '@/components/Navigation';
import { Plus, Trash2, Edit2, ArrowLeft, Menu, Download, FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import ReloadingSessionForm from '@/components/reloading/ReloadingSessionForm';
import ReloadingInventoryWidget from '@/components/reloading/ReloadingInventoryWidget';
import ComponentManager from '@/components/reloading/ComponentManager';
import ReloadBatchForm from '@/components/reloading/ReloadBatchForm';
import ReloadingStockInventory from '@/components/reloading/ReloadingStockInventory';
import GlobalModal from '@/components/ui/GlobalModal.jsx';
import { generateReloadingBatchPDF } from '@/utils/pdfGenerators';

export default function ReloadingManagement() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [activeTab, setActiveTab] = useState('history');
  const [showBatchForm, setShowBatchForm] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const user = await base44.auth.me();
      const data = await base44.entities.ReloadingSession.filter({ created_by: user.email });
      setSessions(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this reloading session? Component stock will be restored.')) return;
    try {
      const session = sessions.find(s => s.id === id);
      const user = await base44.auth.me();

      // ── STEP 1: Find linked ammo stock item ──────────────────────────
      const ammoList = await base44.entities.Ammunition.filter({ created_by: user.email });
      let matchedAmmo = ammoList.find(a => a.notes && a.notes.includes(`reload_batch:${id}`));
      if (!matchedAmmo && session) {
        matchedAmmo = ammoList.find(a =>
          (a.brand === 'Reloaded') &&
          a.caliber === session.caliber &&
          a.notes && a.notes.includes(session.batch_number)
        );
      }

      console.log(`[RELOAD DELETE DEBUG] batchId = ${id}`);
      console.log(`[RELOAD DELETE DEBUG] ammoStockItemId = ${matchedAmmo?.id || 'NOT FOUND'}`);
      console.log(`[RELOAD DELETE DEBUG] roundsProduced = ${session?.rounds_loaded || 0}`);
      console.log(`[RELOAD DELETE DEBUG] ammoInventoryBefore = ${matchedAmmo?.quantity_in_stock ?? 'N/A'}`);

      // ── STEP 2: Check if any rounds were used in session records ─────
      let roundsUsed = 0;
      if (matchedAmmo) {
        const spendingLogs = await base44.entities.AmmoSpending.filter({ ammunition_id: matchedAmmo.id });
        roundsUsed = spendingLogs.reduce((sum, s) => sum + (s.quantity_used || 0), 0);
      }
      const roundsRemaining = Math.max(0, (matchedAmmo?.quantity_in_stock || 0));
      console.log(`[RELOAD DELETE DEBUG] roundsUsedInRecords = ${roundsUsed}`);
      console.log(`[RELOAD DELETE DEBUG] roundsRemaining = ${roundsRemaining}`);

      // ── STEP 3: Block if rounds were used in records ─────────────────
      if (roundsUsed > 0) {
        alert(`Cannot delete this batch — ${roundsUsed} round(s) have already been used in session records. Archive the batch instead or edit it manually.`);
        return;
      }

      // ── STEP 4: Delete the linked ammo stock item entirely ───────────
      if (matchedAmmo) {
        await base44.entities.Ammunition.delete(matchedAmmo.id);
        console.log(`[RELOAD DELETE DEBUG] removingFromInventory = true (deleted ammo id ${matchedAmmo.id})`);
        console.log(`[RELOAD DELETE DEBUG] ammoInventoryAfter = 0 (item deleted)`);
      } else {
        console.warn(`[RELOAD DELETE DEBUG] removingFromInventory = false (no linked ammo found)`);
      }

      // ── STEP 5: Restore components ───────────────────────────────────
      const unitConversions = { grams: 1, kg: 1000, oz: 28.3495, lb: 453.592, grains: 0.06479891 };
      if (session?.components) {
        // Fetch all user's components once to avoid repeated filter calls
        const allComponents = await base44.entities.ReloadingComponent.filter({ created_by: user.email });

        for (const comp of session.components) {
          try {
            // Find the matching component by ID first, then by name+type as fallback
            let component = comp.component_id
              ? allComponents.find(c => c.id === comp.component_id)
              : allComponents.find(c => c.component_type === comp.type && c.name === comp.name);

            // ── PRIMER DEBUG ─────────────────────────────────────────────
            if (comp.type === 'primer') {
              console.log(`[PRIMER REFUND DEBUG] reloadBatchId = ${id}`);
              console.log(`[PRIMER REFUND DEBUG] primerId = ${comp.component_id || 'none (old session)'}`);
              console.log(`[PRIMER REFUND DEBUG] primersUsed = ${comp.quantity_used}`);
              console.log(`[PRIMER REFUND DEBUG] primerStockBefore = ${component?.quantity_remaining ?? 'component not found'}`);
              console.log(`[PRIMER REFUND DEBUG] refundQuantity = ${comp.quantity_used || 0}`);
            }

            if (component) {
              let newRemaining;
              if (comp.type === 'powder') {
                const usedInGrams = parseFloat(comp.quantity_used) * (unitConversions[comp.unit] || 1);
                newRemaining = component.quantity_remaining + usedInGrams / (unitConversions[component.unit] || 1);
              } else {
                newRemaining = component.quantity_remaining + Number(comp.quantity_used || 0);
              }
              await base44.entities.ReloadingComponent.update(component.id, { quantity_remaining: newRemaining });

              if (comp.type === 'primer') {
                console.log(`[PRIMER REFUND DEBUG] primerStockAfter = ${newRemaining}`);
                console.log(`[PRIMER REFUND DEBUG] primerRefundSuccess = true`);
                console.log(`[PRIMER REFUND DEBUG] componentInventoryRefreshTriggered = true`);
              }
            } else if (comp.type === 'primer') {
              console.warn(`[PRIMER REFUND DEBUG] primerRefundSuccess = false — component not found in DB`);
              console.warn(`[PRIMER REFUND DEBUG] comp.component_id = ${comp.component_id}, comp.name = "${comp.name}"`);
            }
          } catch (compError) {
            console.warn('Could not restore component:', comp.type, comp.name, compError);
            if (comp.type === 'primer') {
              console.error(`[PRIMER REFUND DEBUG] primerRefundSuccess = false — error: ${compError.message}`);
            }
          }
        }
        console.log(`[RELOAD DELETE DEBUG] componentsRestored = true`);
      }

      // ── STEP 6: Delete the session record ────────────────────────────
      await base44.entities.ReloadingSession.delete(id);
      console.log(`[RELOAD DELETE DEBUG] batchDeleteOrArchiveSuccess = true`);
      console.log(`[RELOAD DELETE DEBUG] inventoryRefreshTriggered = true`);

      loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting session: ' + error.message);
    }
  };

  const handleExportBatchPDF = (session) => {
    const doc = generateReloadingBatchPDF(session);
    doc.save(`batch-${session.batch_number}.pdf`);
  };

  const handleSubmit = async (data) => {
    try {
      if (editingSession) {
        // When editing, only update metadata fields — never silently change rounds_loaded
        // (that would cause ammo stock to drift). Preserve original rounds_loaded.
        const safeUpdate = { ...data, rounds_loaded: editingSession.rounds_loaded };
        await base44.entities.ReloadingSession.update(editingSession.id, safeUpdate);
      } else {
        const createdSession = await base44.entities.ReloadingSession.create(data);
        
        // Auto-add to ammunition if enabled
        if (data.create_ammo) {
          const user = await base44.auth.me();
          // Create a per-batch ammo entry tagged with reload_batch:<id> for reliable reversal
          const batchNotes = `reload_batch:${createdSession.id} | Batch ${data.batch_number}`;
          await base44.entities.Ammunition.create({
            brand: 'Reloaded',
            caliber: data.caliber,
            bullet_type: 'Custom',
            quantity_in_stock: data.rounds_loaded,
            units: 'rounds',
            cost_per_unit: data.rounds_loaded > 0 ? data.total_cost / data.rounds_loaded : 0,
            date_purchased: data.date,
            low_stock_threshold: 10,
            notes: batchNotes,
          });
        }
      }
      setShowForm(false);
      setEditingSession(null);
      loadSessions();
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Error: ' + error.message);
    }
  };

  const totalCost = sessions.reduce((sum, s) => sum + (s.total_cost || 0), 0);
  const totalRounds = sessions.reduce((sum, s) => sum + (s.rounds_loaded || 0), 0);

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
        {/* Title Section */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-1">Reloading Management</h1>
            <p className="text-muted-foreground">Track and manage your reloading sessions</p>
          </div>
          <button
            onClick={() => setShowBatchForm(true)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl hover:opacity-90 flex items-center gap-2 font-semibold whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Batch</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Load Development Banner */}
        <Link
          to="/load-development"
          className="flex items-center justify-between gap-3 bg-primary/10 border border-primary/30 rounded-xl px-5 py-4 mb-6 hover:bg-primary/15 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <FlaskConical className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">Load Development</p>
              <p className="text-xs text-muted-foreground">Create and test load variants with full inventory tracking</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-primary group-hover:underline whitespace-nowrap">Open →</span>
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase mb-1.5">Sessions</p>
            <p className="text-2xl font-bold">{sessions.length}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase mb-1.5">Rounds Loaded</p>
            <p className="text-2xl font-bold">{totalRounds.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase mb-1.5">Total Cost</p>
            <p className="text-2xl font-bold text-primary">£{totalCost.toFixed(2)}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground font-semibold uppercase mb-1.5">Avg Cost/Rnd</p>
            <p className="text-2xl font-bold">{sessions.length > 0 ? '£' + (totalCost / totalRounds).toFixed(2) : '-'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Session History
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'stock'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Stock Inventory
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'components'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Manage Components
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'inventory'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Old Inventory
          </button>
        </div>

        {/* Stock Inventory */}
        {activeTab === 'stock' && (
          <ReloadingStockInventory />
        )}

        {/* Sessions List */}
        {activeTab === 'history' && (
          sessions.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">No reloading sessions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold">{session.caliber}</h3>
                      <p className="text-xs text-muted-foreground mt-1">Batch: {session.batch_number}</p>
                      <div className="mt-3 space-y-1 text-xs">
                        <p><span className="font-medium">Rounds:</span> {session.rounds_loaded}</p>
                        <p><span className="font-medium">Cost:</span> £{session.total_cost?.toFixed(2) || '0.00'} (£{session.cost_per_round?.toFixed(2) || '0.00'}/rd)</p>
                        <p><span className="font-medium">Date:</span> {format(new Date(session.date), 'MMM d, yyyy')}</p>
                        {session.notes && <p><span className="font-medium">Notes:</span> {session.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleExportBatchPDF(session)}
                        className="p-2 hover:bg-primary/10 text-primary rounded transition-colors"
                        title="Export PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingSession(session);
                          setShowForm(true);
                        }}
                        className="p-2 hover:bg-primary hover:text-primary-foreground rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(session.id)}
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
          )
        )}

        {/* Components Tab */}
        {activeTab === 'components' && <ComponentManager />}

        {/* Old Inventory Tab */}
        {activeTab === 'inventory' && <ReloadingInventoryWidget />}

        {/* Reload Batch Form Modal */}
        <GlobalModal
          open={showBatchForm}
          onClose={() => setShowBatchForm(false)}
          title="New Reload Batch"
          footer={null}
          maxWidth="max-w-2xl"
        >
          <ReloadBatchForm
            onSubmit={() => {
              setShowBatchForm(false);
              loadSessions();
            }}
            onClose={() => setShowBatchForm(false)}
          />
        </GlobalModal>

        {/* Old Session Form Modal */}
        <GlobalModal
          open={showForm}
          onClose={() => { setShowForm(false); setEditingSession(null); }}
          title={editingSession ? 'Edit Session' : 'New Session'}
          footer={null}
          maxWidth="max-w-2xl"
        >
          <ReloadingSessionForm
            session={editingSession}
            onSubmit={handleSubmit}
            onClose={() => {
              setShowForm(false);
              setEditingSession(null);
            }}
          />
        </GlobalModal>
      </main>
    </div>
  );
}