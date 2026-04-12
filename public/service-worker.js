const CACHE_NAME = 'axp-vault-v3.0.0-final';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/verify.html',
  '/result.html',
  '/stats.html',
  '/generator.html',
  '/lab.html',
  '/design-system.css',
  '/app.js',
  '/vendor_logic.js',
  '/notifications.js',
  '/devices.js',
  '/translations.js',
  '/settings.js',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('✅ [PWA] ASSETS_ENCODED_IN_CACHE');
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
            console.log('🗑️ [PWA] PURGING_LEGACY_BUFFER:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache if the request is for a local asset and uses http(s)
  if (event.request.url.startsWith(self.location.origin) && event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) return response; // Return from cache
        
        return fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Optimization: Dynamically cache certain pages/assets retrieved during the session
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          // Fallback logic for offline requests (optional)
          if (event.request.destination === 'document') {
             return caches.match('/index.html');
          }
        });
      })
    );
  }
});
