const CACHE_NAME = 'xp-arena-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/result.html',
  '/verify.html',
  '/styles.css',
  '/app.js',
  '/devices.js',
  '/translations.js',
  '/audio.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.includes('/vendor_panel.html') || url.pathname.includes('/vendor_dashboard.html') || url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    const network = fetch(event.request).then(async resp => {
      if (resp && resp.status === 200 && resp.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, resp.clone());
      }
      return resp;
    }).catch(() => cached);
    return cached || network;
  })());
});
