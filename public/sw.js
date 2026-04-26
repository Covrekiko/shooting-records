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

const CACHE_NAME = 'shooting-records-v4';
const SHELL_CACHE = 'shell-v4';

// Core app shell files to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
];

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Individual failures are OK — don't block install
      })
    ).then(() => self.skipWaiting())
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

async function networkFirstShell(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Last resort: return root index for navigation
    const root = await caches.match('/');
    return root || new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    // Update cache in background
    fetchAndCache(request, cacheName).catch(() => {});
    return cached;
  }
  return fetchAndCache(request, cacheName);
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
