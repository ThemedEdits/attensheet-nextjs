const CACHE_NAME = 'attensheet-v1';
const OFFLINE_URL = '/offline.html';

const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  '/favicon-96x96.png',
  '/apple-touch-icon.png',
  '/site.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Handle HTML document / navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cachedOffline = await cache.match(OFFLINE_URL);
          if (cachedOffline) return cachedOffline;
        } catch (_) {}
        return new Response(
          '<!DOCTYPE html><html><body style="background:#07110d;color:#fff;font-family:sans-serif;text-align:center;padding:40px 20px;"><h2>AttenSheet is Reconnecting...</h2><p>Please check your connection and tap reload.</p><button onclick="window.location.reload()" style="background:#16A66A;color:#fff;border:none;padding:12px 24px;border-radius:12px;font-size:16px;cursor:pointer;">Reload</button></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })
    );
    return;
  }

  // Network-first for other requests, fallback to cache if available
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
