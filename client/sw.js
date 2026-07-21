var CACHE = 'chaminda-drop-v1';
var ASSETS = ['/', '/index.html', '/css/theme.css', '/css/main.css', '/js/device.js', '/js/signaling.js', '/js/webrtc.js', '/js/transfer.js', '/js/qr.js', '/js/ui.js', '/js/app.js', '/js/particles.js', '/js/hero.js'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (e.request.url.includes('/health')) return;
  e.respondWith(caches.match(e.request).then(function(r) {
    return r || fetch(e.request).then(function(resp) {
      var clone = resp.clone();
      caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
      return resp;
    });
  }).catch(function() { return caches.match('/index.html'); }));
});
