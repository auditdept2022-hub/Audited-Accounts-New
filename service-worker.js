/* service-worker.js
 * No manual "version" to bump — every cached file is refreshed
 * automatically in the background whenever the user is online
 * (stale-while-revalidate), so a new deploy just shows up next load.
 */
const APP_CACHE = 'audited-accounts-app';
const RUNTIME_CACHE = 'audited-accounts-runtime';

// Core "app shell" — everything this PWA needs to boot while offline.
// Paths are relative, so this works whatever folder the app is served from.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
];

// Third-party libraries the app depends on (loaded from CDN in index.html).
// Cached up front so xlsx/pdf/screenshot export still work offline.
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_CACHE);
      // Precache the app shell first — if this fails, install should fail.
      await cache.addAll(APP_SHELL);

      // Precache CDN assets too, but don't let a single failed fetch
      // (e.g. offline during install, or a CORS hiccup) block install.
      await Promise.all(
        CDN_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url, { mode: 'cors' });
            if (res.ok) await cache.put(url, res);
          } catch (err) {
            // Ignore — will be fetched (and cached) at runtime instead.
          }
        })
      );

      // Activate this new service worker as soon as it finishes installing.
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop any caches that aren't one of the two we use — handles the
      // one-time cleanup for anyone who had the old versioned caches.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== APP_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
      // Take control of any already-open pages immediately.
      await self.clients.claim();
    })()
  );
});

// Shared stale-while-revalidate helper: return the cached response
// instantly if we have one, and always kick off a network fetch in the
// background to refresh the cache for next time. If there's no cached
// response yet, wait for the network.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      // Cache "ok" responses (same-origin) and opaque cross-origin
      // responses (status 0, which is what no-cors CDN requests return).
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  return cached || (await networkFetch) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests; let everything else (POST, etc.) pass through.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1) Page navigations: try the network first (so users get the very
  //    latest HTML while online), fall back to the cached shell offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(APP_CACHE);
          cache.put('./index.html', networkResponse.clone());
          return networkResponse;
        } catch (err) {
          const cache = await caches.open(APP_CACHE);
          const cached = await cache.match('./index.html');
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // 2) Everything else this app cares about — app shell files, CDN
  //    libraries, and Google Fonts — all use stale-while-revalidate, so
  //    they update automatically in the background with no version bump.
  const isAppShell = APP_SHELL.some((path) =>
    request.url.endsWith(path.replace('./', ''))
  );
  const isCdnAsset = CDN_ASSETS.includes(request.url);
  const isGoogleFont =
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (isAppShell || isCdnAsset || isGoogleFont) {
    event.respondWith(staleWhileRevalidate(request, isAppShell || isCdnAsset ? APP_CACHE : RUNTIME_CACHE));
    return;
  }

  // 3) Any other same-origin request: same stale-while-revalidate
  //    treatment via the runtime cache, so nothing needs special-casing.
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});
