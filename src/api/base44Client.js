import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl, serverUrl } = appParams;

// When offline, skip the token so the SDK doesn't try to validate it against the server.
// Our AuthContext handles the offline fallback (restores from cache) independently.
const effectiveToken = typeof navigator !== 'undefined' && !navigator.onLine ? null : token;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token: effectiveToken,
  functionsVersion,
  serverUrl: serverUrl || '',
  requiresAuth: false,
  appBaseUrl: appBaseUrl || serverUrl
});