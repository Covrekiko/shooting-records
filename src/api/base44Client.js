import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

console.log('[APP DEBUG] Creating Base44 client with appId:', appId);

let base44;
try {
  base44 = createClient({
    appId,
    token,
    functionsVersion,
    serverUrl: '',
    requiresAuth: false,
    appBaseUrl
  });
  console.log('[APP DEBUG] Base44 client created successfully');
} catch (error) {
  console.error('[APP CRASH] Base44 client init failed:', error);
  throw error;
}

export { base44 };