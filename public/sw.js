const CACHE_NAME = 'anexo-cobro-v2';
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
    // Para navegación (HTML), intentar red primero, luego cache (Network First)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

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
