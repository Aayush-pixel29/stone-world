const CACHE_NAME = 'stoneworld-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.css',
  './manifest.json',
  './img/favicon.svg',
  './js/app.js',
  './js/engine.js',
  './js/reactions.js',
  './js/world.js',
  './js/ui.js',
  './js/audio.js',
  './js/multiplayer.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
