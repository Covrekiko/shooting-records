import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/Navigation';
import { AlertTriangle, CheckCircle2, Clock, RefreshCw, RotateCw, Trash2 } from 'lucide-react';
import { discardQueueEntry, getAllQueueEntries, retryQueueEntry, runSync, SYNC_STATUS } from '@/lib/syncQueue';
import { getQueueSaveState } from '@/lib/syncQueuePolicy';
import { useOffline } from '@/context/OfflineContext';

const STATUS_STYLES = {
  [SYNC_STATUS.PENDING]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  [SYNC_STATUS.SYNCING]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  [SYNC_STATUS.FAILED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  [SYNC_STATUS.CONFLICT]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  [SYNC_STATUS.EXPIRED]: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  [SYNC_STATUS.DONE]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
};

function formatTime(value) {
  if (!value) return 'Not attempted';
  return new Date(value).toLocaleString();
}

function statusLabel(status) {
  if (status === SYNC_STATUS.CONFLICT) return 'Needs review';
  if (status === SYNC_STATUS.EXPIRED) return 'Expired';
  if (status === SYNC_STATUS.FAILED) return 'Failed';
  if (status === SYNC_STATUS.PENDING) return 'Pending';
  if (status === SYNC_STATUS.SYNCING) return 'Syncing';
  return 'Synced';
}

export default function SyncConflictCenter() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [error, setError] = useState('');
  const { isOnline } = useOffline();

  const loadEntries = async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await getAllQueueEntries();
      setEntries(rows || []);
    } catch (err) {
      setError(err.message || 'Sync queue could not be loaded.');
    }
    setLoading(false);
  };

  useEffect(() => { loadEntries(); }, []);

  const counts = useMemo(() => entries.reduce((acc, entry) => {
    acc[entry.status] = (acc[entry.status] || 0) + 1;
    return acc;
  }, {}), [entries]);

  const handleSync = async () => {
    if (!isOnline) { setError('You are offline. Sync will run when connection returns.'); return; }
    setAction('sync');
    await runSync();
    await loadEntries();
    setAction('');
  };

  const handleRetry = async (entry) => {
    setAction(entry.id);
    await retryQueueEntry(entry.id);
    if (isOnline) await runSync();
    await loadEntries();
    setAction('');
  };

  const handleDiscard = async (entry) => {
    const safe = entry.status === SYNC_STATUS.EXPIRED || entry.status === SYNC_STATUS.CONFLICT || entry.status === SYNC_STATUS.FAILED;
    if (!safe) return;
    if (!confirm('Discard this local sync operation? This will not change server data.')) return;
    setAction(entry.id);
    await discardQueueEntry(entry.id);
    await loadEntries();
    setAction('');
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-4xl mx-auto px-3 pt-2 md:pt-4 pb-8 mobile-page-padding">
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sync Conflict Center</h1>
            <p className="text-sm text-muted-foreground mt-1">Review offline changes that are pending, failed, conflicted, or expired.</p>
          </div>
          <button onClick={handleSync} disabled={!!action || !isOnline} className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${action === 'sync' ? 'animate-spin' : ''}`} /> Sync
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            ['Pending', counts[SYNC_STATUS.PENDING] || 0],
            ['Failed', counts[SYNC_STATUS.FAILED] || 0],
            ['Needs review', counts[SYNC_STATUS.CONFLICT] || 0],
            ['Needs review', (counts[SYNC_STATUS.EXPIRED] || 0) + entries.filter((e) => e.needsReview).length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
            </div>
          ))}
        </div>

        {error && <div className="rounded-2xl border border-border bg-card p-4 mb-4 text-sm text-destructive flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5" />{error}</div>}

        {loading ? (
          <div className="flex justify-center py-12"><RefreshCw className="w-6 h-6 animate-spin text-primary" /></div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="font-semibold">No sync items need attention</p>
            <p className="text-sm text-muted-foreground mt-1">Offline changes will appear here if they cannot sync automatically.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const canDiscard = entry.status === SYNC_STATUS.EXPIRED || entry.status === SYNC_STATUS.CONFLICT || entry.status === SYNC_STATUS.FAILED;
              const canRetry = entry.status === SYNC_STATUS.PENDING || entry.status === SYNC_STATUS.FAILED || entry.status === SYNC_STATUS.CONFLICT;
              return (
                <div key={entry.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[entry.status] || STATUS_STYLES[SYNC_STATUS.PENDING]}`}>{entry.needsReview ? 'Needs review' : statusLabel(entry.status)}</span>
                        <span className="text-xs text-muted-foreground">{entry.entityName || 'Unknown module'} · {entry.action || 'operation'} · {getQueueSaveState(entry.status)}</span>
                      </div>
                      <p className="text-sm font-semibold mt-2 truncate">Affected record: {entry.payload?.title || entry.payload?.name || entry.payload?.location_name || entry.localId || 'Local change'}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1"><Clock className="w-3 h-3" /> Last retry: {formatTime(entry.lastAttemptTime)}</div>
                      {entry.needsReview && <p className="text-sm text-amber-700 dark:text-amber-300 mt-2 flex gap-1.5"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />This change has been waiting for several days and should be reviewed before relying on cloud sync.</p>}
                      {entry.lastError && <p className="text-sm text-destructive mt-2 flex gap-1.5"><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{entry.lastError}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {canRetry && <button onClick={() => handleRetry(entry)} disabled={!!action} className="px-3 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"><RotateCw className={`w-3.5 h-3.5 ${action === entry.id ? 'animate-spin' : ''}`} />Retry</button>}
                      {canDiscard && <button onClick={() => handleDiscard(entry)} disabled={!!action} className="px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60"><Trash2 className="w-3.5 h-3.5" />Discard</button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}