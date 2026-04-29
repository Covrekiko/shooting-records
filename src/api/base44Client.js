import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const base44 = createClient({
  appId: appId || '',
  token: token || undefined,
  functionsVersion: functionsVersion || '',
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl: appBaseUrl || ''
});

export { base44 };