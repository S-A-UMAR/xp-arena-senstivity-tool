const CACHE_NAME = 'xp-arena-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/devices.js',
    '/calculator.js',
    '/manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // Only cache GET requests going to our origin
    if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
        return;
    }
    
    // API calls bypass cache
    if (e.request.url.includes('/api/')) {
        return;
    }

    // Network-first for HTML to avoid stale UI after deployments.
    if (e.request.destination === 'document') {
        e.respondWith(
            fetch(e.request)
                .then(res => {
                    const cloned = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, cloned));
                    return res;
                })
                .catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
        );
        return;
    }

    // Stale-while-revalidate for static assets.
    e.respondWith(
        caches.match(e.request).then(cached => {
            const networkFetch = fetch(e.request).then(res => {
                const cloned = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, cloned));
                return res;
            }).catch(() => cached);
            return cached || networkFetch;
        })
    );
});
