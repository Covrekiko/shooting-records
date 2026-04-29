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
    if (!confirm('Delete this reloading session? All component stock will be restored.')) return;
    try {
      // Get the session to restore its stock
      const session = sessions.find(s => s.id === id);
      if (session && session.components) {
        const unitConversions = {
          'grams': 1,
          'kg': 1000,
          'oz': 28.3495,
          'lb': 453.592,
          'grains': 0.06479891,
        };

        // Restore each component used in the session
        for (const comp of session.components) {
          try {
            let component;

            if (comp.type === 'powder') {
              // Restore powder: convert used amount to grams, then back to stored unit
              const usedInGrams = parseFloat(comp.quantity_used) * (unitConversions[comp.unit] || 1);
              
              // Try to find by ID first, then by name
              if (comp.component_id) {
                const results = await base44.entities.ReloadingComponent.filter({
                  created_by: session.created_by,
                  component_type: 'powder',
                }).then(results => results.find(c => c.id === comp.component_id));
                component = results;
              } else if (comp.name) {
                const results = await base44.entities.ReloadingComponent.filter({
                  created_by: session.created_by,
                  component_type: 'powder',
                }).then(results => results.find(c => c.name === comp.name));
                component = results;
              }

              if (component) {
                const restoredRemaining = component.quantity_remaining + usedInGrams / (unitConversions[component.unit] || 1);
                await base44.entities.ReloadingComponent.update(component.id, {
                  quantity_remaining: restoredRemaining,
                });
              }
            } else {
              // Restore primer, brass, bullet: simple quantity addition
              // Try to find by ID first, then by name
              if (comp.component_id) {
                const results = await base44.entities.ReloadingComponent.filter({
                  created_by: session.created_by,
                  component_type: comp.type,
                }).then(results => results.find(c => c.id === comp.component_id));
                component = results;
              } else if (comp.name) {
                const results = await base44.entities.ReloadingComponent.filter({
                  created_by: session.created_by,
                  component_type: comp.type,
                }).then(results => results.find(c => c.name === comp.name));
                component = results;
              }

              if (component) {
                const restoredRemaining = component.quantity_remaining + (comp.quantity_used || 0);
                await base44.entities.ReloadingComponent.update(component.id, {
                  quantity_remaining: restoredRemaining,
                });
              }
            }
          } catch (compError) {
            console.warn('Could not restore component:', comp, compError);
            // Continue with other components even if one fails
          }
        }
      }

      // Reverse the global Ammunition stock added when this batch was created
      if (session && session.rounds_loaded > 0) {
        try {
          const user = await base44.auth.me();
          const ammoList = await base44.entities.Ammunition.filter({ created_by: user.email });
          const matchedAmmo = ammoList.find(a =>
            a.brand === 'Reloaded' &&
            a.caliber === session.caliber
          );
          if (matchedAmmo) {
            const newQty = Math.max(0, (matchedAmmo.quantity_in_stock || 0) - session.rounds_loaded);
            await base44.entities.Ammunition.update(matchedAmmo.id, { quantity_in_stock: newQty });
            console.log(`🟢 Reversed ${session.rounds_loaded} reloaded rounds for ${session.caliber} → stock now: ${newQty}`);
          } else {
            console.warn(`⚠️ No 'Reloaded' ammo found for caliber ${session.caliber} — nothing to reverse`);
          }
        } catch (e) {
          console.warn('Could not reverse ammo stock for reloaded batch:', e.message);
        }
      }

      // Delete the session
      await base44.entities.ReloadingSession.delete(id);
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
        await base44.entities.ReloadingSession.create(data);
        
        // Auto-add to ammunition if enabled
        if (data.create_ammo) {
          const user = await base44.auth.me();
          const existingAmmo = await base44.entities.Ammunition.filter({
            created_by: user.email,
            brand: 'Reloaded',
            caliber: data.caliber,
          });

          if (existingAmmo.length > 0) {
            // Update existing ammo — add to current stock
            const ammo = existingAmmo[0];
            await base44.entities.Ammunition.update(ammo.id, {
              quantity_in_stock: (ammo.quantity_in_stock || 0) + data.rounds_loaded,
            });
          } else {
            // Create new ammo entry
            await base44.entities.Ammunition.create({
              brand: 'Reloaded',
              caliber: data.caliber,
              bullet_type: 'Custom',
              quantity_in_stock: data.rounds_loaded,
              units: 'rounds',
              cost_per_unit: data.rounds_loaded > 0 ? data.total_cost / data.rounds_loaded : 0,
              date_purchased: data.date,
              low_stock_threshold: 50,
              notes: `Reloaded batch ${data.batch_number}`,
            });
          }
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