/**
 * OfflineContext — provides app-wide connectivity and sync state.
 * Wrap the app with <OfflineProvider> to enable.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { connectivityManager } from '@/lib/connectivityManager';
import { syncEngine, SYNC_STATE, triggerSync } from '@/lib/syncEngine';
import { getPendingCount } from '@/lib/syncQueue';

console.error('OFFLINE CONTEXT VERSION: SINGLE_CONTEXT_2026_04_30');

const OfflineContext = createContext(null);

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(connectivityManager.isOnline());
  const [syncState, setSyncState] = useState(SYNC_STATE.IDLE);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  useEffect(() => {
    const unsubConn = connectivityManager.subscribe((online) => {
      setIsOnline(online);
    });

    const unsubSync = syncEngine.subscribe(({ state, result, pendingCount: pc }) => {
      setSyncState(state);
      if (result) setLastSyncResult(result);
      setPendingCount(pc);
    });

    const unsubPending = syncEngine.subscribeToPending((count) => {
      setPendingCount(count);
    });

    getPendingCount().then(setPendingCount);

    return () => {
      unsubConn();
      unsubSync();
      unsubPending();
    };
  }, []);

  const manualSync = useCallback(async () => {
    if (!isOnline) return;
    await triggerSync();
  }, [isOnline]);

  const value = {
    isOnline,
    syncState,
    pendingCount,
    lastSyncResult,
    manualSync,
    isSyncing: syncState === SYNC_STATE.SYNCING,
    hasPending: pendingCount > 0,
    syncFailed: syncState === SYNC_STATE.FAILED,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error('useOffline must be used within OfflineProvider');
  return ctx;
}