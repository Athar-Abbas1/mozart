// Mozart Service Worker
const CACHE_NAME = 'mozart-v1';

// Assets to pre-cache on install (app shell)
const SHELL_ASSETS = [
  './',
  './index.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// ——— Install: pre-cache the app shell ———
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ——— Activate: clean up old caches ———
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ——— Fetch: network-first for API calls, cache-first for assets ———
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Always go network-first for Groq API and Google Fonts (no caching)
  if (
    url.hostname === 'api.groq.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first strategy for same-origin assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          // Only cache valid same-origin GET responses
          if (!response || response.status !== 200 || request.method !== 'GET') {
            return response;
          }
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, toCache));
          return response;
        });
      })
    );
    return;
  }

  // Default: just fetch for cross-origin (CDN, etc.)
  event.respondWith(fetch(request));
});
