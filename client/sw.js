const CACHE_NAME = 'file-share-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/theme.css',
  '/css/main.css',
  '/js/device.js',
  '/js/particles.js',
  '/js/hero.js',
  '/js/signaling.js',
  '/js/webrtc.js',
  '/js/transfer.js',
  '/js/qr.js',
  '/js/ui.js',
  '/js/app.js',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        event.waitUntil(
          caches.open(CACHE_NAME).then(cache => cache.put(request, fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })))
        );
        return cached;
      }
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
