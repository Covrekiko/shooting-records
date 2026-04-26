/**
 * Subtle but clear offline/sync status indicator.
 * Shows in the app shell when offline or syncing.
 */

import { useOffline } from '@/context/OfflineContext';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2, CloudOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SYNC_STATE } from '@/lib/syncEngine';

export default function OfflineStatusBar() {
  const { isOnline, syncState, pendingCount, lastSyncResult, manualSync, isSyncing } = useOffline();

  // Don't show when online and nothing actively wrong
  if (isOnline && syncState === SYNC_STATE.IDLE) return null;
  if (isOnline && syncState === SYNC_STATE.DONE) return null;
  if (isOnline && pendingCount === 0 && syncState !== SYNC_STATE.FAILED) return null;

  let content = null;
  let bgClass = '';

  if (!isOnline) {
    bgClass = 'bg-slate-700 dark:bg-slate-800';
    content = (
      <>
        <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Offline</span>
        {pendingCount > 0 && (
          <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {pendingCount} pending
          </span>
        )}
      </>
    );
  } else if (isSyncing) {
    bgClass = 'bg-blue-600 dark:bg-blue-700';
    content = (
      <>
        <RefreshCw className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />
        <span>Syncing {pendingCount > 0 ? `${pendingCount} changes…` : '…'}</span>
      </>
    );
  } else if (syncState === SYNC_STATE.FAILED) {
    bgClass = 'bg-red-600 dark:bg-red-700';
    content = (
      <>
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Sync failed</span>
        {lastSyncResult?.failed > 0 && (
          <span className="ml-1 text-red-200 text-[10px]">({lastSyncResult.failed} errors)</span>
        )}
        <button
          onClick={manualSync}
          className="ml-2 text-[10px] font-bold underline hover:no-underline"
        >
          Retry
        </button>
      </>
    );
  } else if (isOnline && pendingCount > 0) {
    bgClass = 'bg-amber-500 dark:bg-amber-600';
    content = (
      <>
        <CloudOff className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{pendingCount} change{pendingCount !== 1 ? 's' : ''} pending</span>
        <button
          onClick={manualSync}
          className="ml-2 text-[10px] font-bold underline hover:no-underline"
        >
          Sync now
        </button>
      </>
    );
  }

  if (!content) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        className={`relative z-[8999] ${bgClass} text-white text-xs font-semibold flex items-center justify-center gap-2 px-4 py-1.5`}
      >
        {content}
      </motion.div>
    </AnimatePresence>
  );
}