import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion } = appParams;

// Expose the saved token so AuthContext can inject it when ready
export const savedAuthToken = token;

// Create client lazily — deferred until first access to avoid
// SDK connection attempts during module evaluation when offline.
let _client = null;

function getClient() {
  if (_client) return _client;
  _client = createClient({
    appId,
    token: null,
    functionsVersion,
    requiresAuth: false,
  });
  return _client;
}

// Use a simple getter-based lazy proxy — only intercepts top-level access,
// nested property access goes directly to the real SDK client with zero overhead.
export const base44 = {
  get entities() { return getClient().entities; },
  get auth() { return getClient().auth; },
  get functions() { return getClient().functions; },
  get integrations() { return getClient().integrations; },
  get users() { return getClient().users; },
  get analytics() { return getClient().analytics; },
  get agents() { return getClient().agents; },
  get asServiceRole() { return getClient().asServiceRole; },
};