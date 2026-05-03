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
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator';
import { useFirstTimeGuide } from '@/hooks/useFirstTimeGuide';
import { FIRST_TIME_GUIDES } from '@/lib/firstTimeGuides';
import { deleteReloadBatchWithRestore } from '@/lib/reloadingDeleteUtils';

export default function ReloadingManagement() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [activeTab, setActiveTab] = useState('history');
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [manualRestoreSession, setManualRestoreSession] = useState(null);
  const [manualRemainingRounds, setManualRemainingRounds] = useState('0');
  const [manualRestoreWarning, setManualRestoreWarning] = useState('');
  const { Guide: ReloadingBatchGuide, showGuideThen: showReloadingBatchGuideThen } = useFirstTimeGuide(FIRST_TIME_GUIDES.reloadingBatchCreate);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const user = await base44.auth.me();
      const data = await base44.entities.ReloadingSession.filter({ created_by: user.email });
      const visibleSessions = data.filter((session) => session.isDeleted !== true && session.status !== 'deleted' && session.reload_session_deleted !== true);
      setSessions(visibleSessions.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const pullToRefresh = usePullToRefresh(loadSessions, { disabled: showForm || showBatchForm });

  const handleDelete = async (id) => {
    if (!confirm('Delete this reloading session? Component stock will be restored.')) return;
    try {
      const result = await deleteReloadBatchWithRestore({ reloadSessionId: id });
      if (result.requires_manual_remaining) {
        const session = sessions.find((item) => item.id === id);
        setManualRestoreSession(session || { id, rounds_loaded: result.original_rounds_loaded || 0 });
        setManualRemainingRounds('0');
        setManualRestoreWarning(result.warnings?.join('\n') || 'Linked ammunition is missing. Enter remaining unfired rounds to restore manually.');
        return;
      }
      if (result.warnings?.length > 0) {
        alert(result.warnings.join('\n'));
      }
      await loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting session: ' + error.message);
    }
  };

  const handleManualRestoreDelete = async () => {
    if (!manualRestoreSession?.id) return;
    const maxRounds = Number(manualRestoreSession.rounds_loaded || 0);
    const remaining = Math.min(maxRounds, Math.max(0, Number(manualRemainingRounds || 0)));
    try {
      const result = await deleteReloadBatchWithRestore({
        reloadSessionId: manualRestoreSession.id,
        manualRemainingUnfired: remaining,
      });
      setManualRestoreSession(null);
      setManualRestoreWarning('');
      if (result.warnings?.length > 0) {
        alert(result.warnings.join('\n'));
      }
      await loadSessions();
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
          const createdAmmo = await base44.entities.Ammunition.create({
            brand: 'Reloaded',
            caliber: data.caliber,
            bullet_type: 'Custom',
            quantity_in_stock: data.rounds_loaded,
            units: 'rounds',
            cost_per_unit: data.rounds_loaded > 0 ? data.total_cost / data.rounds_loaded : 0,
            date_purchased: data.date,
            low_stock_threshold: 10,
            ammo_type: 'reloaded',
            source_type: 'reload_batch',
            reload_session_id: createdSession.id,
            reload_batch_id: createdSession.id,
            source_id: createdSession.id,
            notes: batchNotes,
          });
          await base44.entities.ReloadingSession.update(createdSession.id, {
            ammunition_id: createdAmmo.id,
            linked_ammunition_id: createdAmmo.id,
            ammo_created_quantity: data.rounds_loaded,
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
      <PullToRefreshIndicator pulling={pullToRefresh.pulling} refreshing={pullToRefresh.refreshing} progress={pullToRefresh.progress} offline={!navigator.onLine} />
      <main className="max-w-4xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        {/* Title Section */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-1">Reloading Management</h1>
            <p className="text-muted-foreground">Track and manage your reloading sessions</p>
          </div>
          <button
            onClick={() => showReloadingBatchGuideThen(() => setShowBatchForm(true))}
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

        <ReloadingBatchGuide />

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

        <GlobalModal
          open={!!manualRestoreSession}
          onClose={() => setManualRestoreSession(null)}
          title="Restore reload batch manually"
          footer={(
            <>
              <button
                type="button"
                onClick={() => setManualRestoreSession(null)}
                className="flex-1 h-11 rounded-xl font-semibold text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualRestoreDelete}
                className="flex-1 h-11 rounded-xl font-semibold text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Restore & Delete
              </button>
            </>
          )}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground whitespace-pre-line">{manualRestoreWarning}</p>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                Remaining unfired rounds
              </label>
              <input
                type="number"
                min="0"
                max={manualRestoreSession?.rounds_loaded || 0}
                value={manualRemainingRounds}
                onChange={(e) => setManualRemainingRounds(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Maximum: {manualRestoreSession?.rounds_loaded || 0} rounds. Use 0 if none remain.
              </p>
            </div>
          </div>
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