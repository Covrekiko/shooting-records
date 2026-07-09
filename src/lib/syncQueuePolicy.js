export const QUEUE_REVIEW_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function getQueueAgeMs(entry, now = Date.now()) {
  return Math.max(0, now - Number(entry?.timestamp || now));
}

export function queueEntryNeedsReview(entry, now = Date.now()) {
  return getQueueAgeMs(entry, now) > QUEUE_REVIEW_AFTER_MS;
}

export function getQueueSaveState(status) {
  if (status === 'syncing') return 'Syncing';
  if (status === 'done') return 'Synced';
  if (status === 'failed') return 'Failed';
  if (status === 'conflict') return 'Conflict';
  if (status === 'expired') return 'Needs review';
  return 'Waiting to sync';
}