import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl, serverUrl } = appParams;

// ALWAYS create the client WITHOUT a token first.
// This prevents the SDK/platform from showing ErrorScreen.NO_CONNECTION when offline.
// The token is injected later via base44.auth.setToken() in AuthContext once we confirm
// the user has a valid session (or restored from cache).
export const base44 = createClient({
  appId,
  token: null,
  functionsVersion,
  serverUrl: serverUrl || '',
  requiresAuth: false,
  appBaseUrl: appBaseUrl || serverUrl
});

// Expose the saved token so AuthContext can inject it when ready
export const savedAuthToken = token;