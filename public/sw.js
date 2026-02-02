const CACHE_NAME = 'anexo-cobro-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});

// Background Sync Logic can be added here for payments
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-payments') {
        event.waitUntil(console.log('Background Sync triggered...'));
    }
});
