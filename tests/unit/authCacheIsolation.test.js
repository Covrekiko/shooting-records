import assert from 'node:assert/strict';
import { clearUserCaches, getCurrentCachePointer, readCurrentUserCache, writeUserCache } from '../../src/lib/authCacheIsolation.js';

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
assert.equal(readCurrentUserCache(storage).role, 'admin');
assert.equal(getCurrentCachePointer(storage).id, 'a1');

clearUserCaches(storage);
assert.equal(readCurrentUserCache(storage), null, 'logout must remove cached admin identity');
assert.deepEqual(storage.keys(), []);

writeUserCache(storage, { id: 'a1', email: 'usera@example.com', role: 'admin' }, 1000);
writeUserCache(storage, { id: 'b1', email: 'userb@example.com', role: 'user' }, 2000);
assert.equal(readCurrentUserCache(storage).id, 'b1', 'account switch exposes only current user');
assert.equal(readCurrentUserCache(storage).role, 'user', 'stale admin role is not exposed after account switch');

storage.setItem('sr_cached_user_profile_current_key', JSON.stringify({ id: 'a1', email: 'usera@example.com', key: 'sr_cached_user_profile:b1' }));
assert.equal(readCurrentUserCache(storage), null, 'mismatched pointer cannot expose another account cache');

storage.setItem('sr_cached_user_profile_current_key', '{bad json');
assert.equal(readCurrentUserCache(storage), null, 'corrupt pointer falls back safely');

storage.setItem('sr_cached_user_profile_current_key', JSON.stringify({ id: 'a1', email: 'usera@example.com', key: 'sr_cached_user_profile:a1' }));
storage.setItem('sr_cached_user_profile:a1', '{bad json');
assert.equal(readCurrentUserCache(storage), null, 'corrupt user cache falls back safely');

writeUserCache(storage, { id: 'c1', email: 'userc@example.com', role: 'beta_tester' }, 3000);
storage.setItem('sr_cached_user_profile:other', JSON.stringify({ id: 'other', email: 'other@example.com', role: 'admin' }));
assert.equal(readCurrentUserCache(storage).id, 'c1', 'multiple account keys remain isolated by current pointer');
clearUserCaches(storage);
assert.deepEqual(storage.keys(), []);

console.log('auth cache isolation tests passed');