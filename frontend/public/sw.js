// Digital Stylist — Service Worker
// Strategy:
//   • Static assets & app shell  → Network-first, cache fallback
//   • Backend images (/uploads/) → Cache-first (images don't change)
//   • API calls (backend)        → Network only (never cache user data)
//   • External (CDN, analytics)  → Network only

const CACHE_VERSION = 'ds-v1';
const IMAGE_CACHE = 'ds-images-v1';

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ──────────────────────────────────────────────────────────
// Install — pre-cache the app shell
// ──────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ──────────────────────────────────────────────────────────
// Activate — purge stale caches
// ──────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const keep = new Set([CACHE_VERSION, IMAGE_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ──────────────────────────────────────────────────────────
// Fetch
// ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (external APIs, CDNs)
  if (url.origin !== self.location.origin) return;

  // Backend images: cache-first (content-addressed via UUID filename)
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Next.js API routes — never cache
  if (url.pathname.startsWith('/api/')) return;

  // App shell + pages: network-first, fallback to cache, then offline page
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match('/')))
  );
});
