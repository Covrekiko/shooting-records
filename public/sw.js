// Handle skip-waiting message from client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * Service Worker — App Shell + Asset Caching
 * Strategy:
 *   - App shell (HTML, manifest): Network-first, fall back to cache
 *   - JS/CSS/fonts/images: Cache-first, update in background
 *   - API calls: Network-only (never cached — IndexedDB handles data offline)
 */

const CACHE_NAME = 'shooting-records-v6';
const SHELL_CACHE = 'shell-v6';
const OFFLINE_RESPONSE = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title></head><body><main style="font-family:system-ui;padding:24px"><h1>Offline</h1><p>The app shell is not cached on this device yet. Go online once to finish setup.</p></main></body></html>`;

// Core app shell files to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
];

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => cacheCurrentShellAssets())
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never intercept API calls, auth, or non-GET requests
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.hostname !== self.location.hostname) {
    // External resources (CDN fonts, images): cache-first
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // 2. App shell navigation (HTML pages): network-first → shell cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstShell(request));
    return;
  }

  // 3. Static assets (JS, CSS, fonts, images): cache-first, update in background
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|ico|webp)(\?|$)/)
  ) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // 4. manifest.json: network-first → cache
  if (url.pathname === '/manifest.json') {
    event.respondWith(networkFirstShell(request));
    return;
  }

  // 5. Everything else: network-first
  event.respondWith(networkFirst(request));
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheCurrentShellAssets() {
  try {
    const response = await fetch('/', { cache: 'no-store' });
    if (!response.ok) return;
    const html = await response.clone().text();
    const cache = await caches.open(SHELL_CACHE);
    await cache.put('/', response);
    const assetUrls = Array.from(html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g))
      .map((match) => new URL(match[1], self.location.origin).toString())
      .filter((url) => new URL(url).origin === self.location.origin);
    const assetCache = await caches.open(CACHE_NAME);
    await Promise.allSettled(assetUrls.map(async (url) => {
      const assetResponse = await fetch(url, { cache: 'no-store' });
      if (assetResponse.ok) await assetCache.put(url, assetResponse);
    }));
  } catch {}
}

async function networkFirstShell(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
    if (request.mode === 'navigate') cache.put('/', response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const root = await caches.match('/');
    if (root) return root;
    return new Response(OFFLINE_RESPONSE, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    fetchAndCache(request, cacheName).catch(() => {});
    return cached;
  }
  try {
    return await fetchAndCache(request, cacheName);
  } catch {
    if (request.destination === 'script') {
      const root = await caches.match('/');
      if (root) return new Response('', { status: 503, statusText: 'Chunk unavailable offline' });
    }
    return new Response('', { status: 503, statusText: 'Offline asset unavailable' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function fetchAndCache(request, cacheName) {
  const response = await fetch(request);
  if (response.ok || response.status === 0) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}
