import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion } = appParams;

// Expose the saved token so AuthContext can inject it when ready
export const savedAuthToken = token;

// Lazy client factory — defers createClient until first access.
// This prevents the SDK from trying to connect to the server during initial
// module evaluation, which would trigger ErrorScreen.NO_CONNECTION when offline.
let _client = null;

function getOrCreateClient() {
  if (_client) return _client;

  try {
    _client = createClient({
      appId,
      token: null,
      functionsVersion,
      requiresAuth: false,
    });
  } catch (e) {
    // If createClient throws synchronously (unlikely), create a minimal client
    console.warn('[base44Client] createClient failed, using fallback:', e?.message);
    _client = createClient({
      appId,
      token: null,
      functionsVersion: undefined,
      requiresAuth: false,
    });
  }

  return _client;
}

// Proxy that delegates all property access to the lazily-created client.
// This is transparent to all existing imports — `base44.entities.Foo.list()`
// and `base44.auth.me()` all work as before.
export const base44 = new Proxy({}, {
  get(_, prop) {
    return getOrCreateClient()[prop];
  },
  set(_, prop, value) {
    getOrCreateClient()[prop] = value;
    return true;
  },
  has(_, prop) {
    return prop in getOrCreateClient();
  },
  ownKeys() {
    return Reflect.ownKeys(getOrCreateClient());
  },
  getOwnPropertyDescriptor(_, prop) {
    return Reflect.getOwnPropertyDescriptor(getOrCreateClient(), prop);
  },
});