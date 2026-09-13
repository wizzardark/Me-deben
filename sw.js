// MisDeudas - Service Worker
// Estrategia: cache-first para el app shell, con actualización en segundo plano.

const CACHE_NAME = 'misdeudas-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

// ── INSTALL ──────────────────────────────────────────────────────────
// Precarga el app shell para que funcione offline desde la primera visita.
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────────────
// Limpia caches de versiones anteriores.
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

// ── FETCH ────────────────────────────────────────────────────────────
// Cache-first con actualización en segundo plano (stale-while-revalidate).
// Solo maneja peticiones GET del mismo origen; deja pasar todo lo demás.
self.addEventListener('fetch', function (event) {
  var req = event.request;

  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function (cached) {
      var fetchPromise = fetch(req).then(function (networkResp) {
        if (networkResp && networkResp.status === 200) {
          var respClone = networkResp.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(req, respClone);
          });
        }
        return networkResp;
      }).catch(function () {
        // Sin red: si es una navegación y no está en cache, sirve index.html
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return cached;
      });

      return cached || fetchPromise;
    })
  );
});
