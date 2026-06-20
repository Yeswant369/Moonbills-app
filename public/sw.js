// Cherrys Bakery POS — Service Worker
// Strategy:
//   - Static assets (/_next/static/*): cache-first
//   - Pages: network-first with cache fallback
//   - POST/server actions: pass through (not cached)

const CACHE_NAME = 'cherrys-pos-v2';
const OFFLINE_URL = '/';

// Assets to pre-cache on install. Dynamic pages are intentionally not
// pre-cached because settings/catalog changes must be fetched live.
const PRE_CACHE = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRE_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ─────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (server actions, API calls)
  if (request.method !== 'GET') return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // Skip Next.js internal routes
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // Cache-first for static assets (hashed filenames)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network-first for pages with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful GET responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback: serve from cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Last resort: serve the root page
          return caches.match(OFFLINE_URL);
        });
      })
  );
});
