const CACHE_NAME = 'stoneworld-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './index.css',
  './manifest.json',
  './img/favicon.svg',
  './img/anime_bg.png',
  './img/scientist.png',
  './img/brawn.png',
  './img/scout.png',
  './js/app.js',
  './js/engine.js',
  './js/reactions.js',
  './js/world.js',
  './js/ui.js',
  './js/audio.js',
  './js/multiplayer.js',
  // These three were missing entirely: game3d.js is the actual 3D engine,
  // so offline mode previously loaded the shell UI and nothing else.
  './js/game3d.js',
  './js/music.js',
  './js/story.js'
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
      .then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          // Runtime-cache same-origin AND cross-origin CDN assets (three.js,
          // nipplejs, peerjs) opportunistically after first successful load,
          // so a second offline session can pull them from cache too.
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        }).catch(() => cached);
      })
  );
});
