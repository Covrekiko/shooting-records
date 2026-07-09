import assert from 'node:assert/strict';
import { queueEntryNeedsReview, getQueueSaveState, getQueueAgeMs, QUEUE_REVIEW_AFTER_MS } from '../../src/lib/syncQueuePolicy.js';

const now = Date.now();
assert.equal(getQueueAgeMs({ timestamp: now - 5000 }, now), 5000);
assert.equal(queueEntryNeedsReview({ timestamp: now - QUEUE_REVIEW_AFTER_MS - 1 }, now), true);
assert.equal(queueEntryNeedsReview({ timestamp: now - 1000 }, now), false);
assert.equal(getQueueSaveState('pending'), 'Waiting to sync');
assert.equal(getQueueSaveState('syncing'), 'Syncing');
assert.equal(getQueueSaveState('done'), 'Synced');
assert.equal(getQueueSaveState('failed'), 'Failed');
assert.equal(getQueueSaveState('conflict'), 'Conflict');
assert.equal(getQueueSaveState('expired'), 'Needs review');

console.log('offline logic tests passed');