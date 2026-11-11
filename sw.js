/* Pencil Markup service worker: keeps the app and its libraries on the device so it opens offline.
   Bump CACHE whenever any file below changes (keep it in step with APP_VERSION in index.html). */
'use strict';
var CACHE = 'pencil-markup-3.23.0';
var APP_SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/apple-touch-icon.png',
  'icons/icon.svg',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'vendor/pdf.min.js?v=3.11.174',
  'vendor/pdf.worker.min.js?v=3.11.174',
  'vendor/pdf-lib.min.js?v=1.17.1',
  'vendor/pako.min.js?v=2.1.0'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function (cache) { return cache.addAll(APP_SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k.indexOf('pencil-markup-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

/* The page itself: try the network first so updates arrive, but fall back to the stored copy
   when offline or when the network takes more than a few seconds. */
function pageRequest(request) {
  return caches.open(CACHE).then(function (cache) {
    var fromCache = function () {
      return cache.match(request, { ignoreSearch: true }).then(function (r) { return r || cache.match('index.html'); });
    };
    // no-cache: ask the server every time (GitHub Pages lets browsers keep pages for 10 minutes otherwise).
    var network = fetch(request, { cache: 'no-cache' }).then(function (res) {
      if (res && res.ok) cache.put('index.html', res.clone());
      return res;
    });
    var timeout = new Promise(function (resolve) { setTimeout(resolve, 3500); });
    return Promise.race([network.catch(function () { return null; }), timeout]).then(function (res) {
      if (res && res.ok) return res;
      return fromCache().then(function (cached) { return cached || network; });
    });
  });
}

/* Libraries and icons: stored copy first (their URLs carry the version), network as backup. */
function assetRequest(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (res) {
        if (res && res.ok) cache.put(request, res.clone());
        return res;
      });
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\/version\.json$/.test(url.pathname)) return; // update checks always go to the network
  if (req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname)) { event.respondWith(pageRequest(req)); return; }
  event.respondWith(assetRequest(req));
});
