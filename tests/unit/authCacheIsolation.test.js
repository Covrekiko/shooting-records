import assert from 'node:assert/strict';
import { clearUserCaches, readCurrentUserCache, writeUserCache } from '../../src/lib/authCacheIsolation.js';

function makeStorage() {
  const data = new Map();
  return {
    get length() { return data.size; },
    key: (i) => Array.from(data.keys())[i] || null,
    getItem: (k) => data.has(k) ? data.get(k) : null,
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    keys: () => Array.from(data.keys()),
  };
}

const storage = makeStorage();
writeUserCache(storage, { id: 'a1', email: 'UserA@example.com', role: 'admin' }, 1000);
assert.equal(readCurrentUserCache(storage).email, 'usera@example.com');
writeUserCache(storage, { id: 'b1', email: 'userb@example.com', role: 'user' }, 2000);
assert.equal(readCurrentUserCache(storage).id, 'b1');
assert.equal(readCurrentUserCache(storage).role, 'user');
storage.setItem('sr_cached_user_profile_current_key', JSON.stringify({ id: 'a1', email: 'usera@example.com', key: 'sr_cached_user_profile:b1' }));
assert.equal(readCurrentUserCache(storage), null);
clearUserCaches(storage);
assert.deepEqual(storage.keys(), []);

console.log('auth cache isolation tests passed');