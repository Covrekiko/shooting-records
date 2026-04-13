// Offline support for critical features like check-in
const OFFLINE_QUEUE_KEY = 'offlineQueue';
const OFFLINE_SESSION_KEY = 'offlineSession';

export const offlineManager = {
  // Check if user is online
  isOnline: () => navigator.onLine,

  // Queue an action for later sync
  queueAction: (action, data) => {
    if (!offlineManager.isOnline()) {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      queue.push({
        action,
        data,
        timestamp: Date.now(),
        id: `action_${Date.now()}_${Math.random()}`,
      });
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      return true;
    }
    return false;
  },

  // Get queued actions
  getQueuedActions: () => {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  },

  // Sync queued actions (call when online)
  syncQueuedActions: async (syncFunction) => {
    const queue = offlineManager.getQueuedActions();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (const action of queue) {
      try {
        await syncFunction(action);
        synced++;
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        failed++;
      }
    }

    // Clear queue only if all synced
    if (failed === 0) {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    }

    return { synced, failed };
  },

  // Save session for offline access
  saveOfflineSession: (sessionData) => {
    localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(sessionData));
  },

  // Get offline session
  getOfflineSession: () => {
    return JSON.parse(localStorage.getItem(OFFLINE_SESSION_KEY) || 'null');
  },

  // Listen for online/offline changes
  onOnlineStatusChange: (callback) => {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  },
};