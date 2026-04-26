/**
 * Service Worker — Shooting Records App
 * Caches app shell, static assets, and enables full offline access.
 */

const CACHE_NAME = 'shooting-records-v3';
const RUNTIME_CACHE = 'shooting-records-runtime-v3';

// App shell files to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install: pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Pre-cache failed for some URLs:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache, with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, chrome-extension, and base44 API calls (those go to network only)
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // API calls — network only, no caching (data must be fresh or handled by IndexedDB)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('base44')) {
    return; // Let the browser handle it normally
  }

  // For navigation requests (page loads) — always try network first, fallback to cached index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts) — cache first, then network
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Return a fallback for images if completely offline
          return new Response('', { status: 404 });
        });
      })
    );
    return;
  }

  // For all other requests — network first, then cache
  event.respondWith(
    fetch(request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(request).then((cached) => {
        return cached || caches.match('/index.html');
      });
    })
  );
});
