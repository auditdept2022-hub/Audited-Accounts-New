const CACHE_NAME = 'audited-accounts-app';
const RUNTIME_CACHE = 'audited-accounts-runtime';

// Core "app shell" — everything this PWA needs to boot while offline.
// Paths are relative, so this works whatever folder the app is served from.
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
];

// Third-party libraries the app depends on (loaded from CDN in index.html).
// Cached up front so xlsx/PDF/screenshot export still work offline.
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
];

// Hosts that serve LIVE DATA (Google Sheet records, reports, the AI
// round-trip), not static assets. Anything on these hosts must NEVER be
// cached or read from cache — always go straight to the network. This is
// the exact fix for edits/records reverting after refresh: once a
// getRecords-style response got cached, every later load would keep
// returning that same stale snapshot instead of the current Sheet data.
const NEVER_CACHE_HOSTS = [
  'script.google.com',
  'script.googleusercontent.com', // Apps Script sometimes redirects through this
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Individual cache.add() calls with their own catch, instead of one
      // cache.addAll(). addAll() is all-or-nothing — if even one URL 404s
      // (a renamed icon, a path typo), the WHOLE install fails and the
      // service worker never activates. One at a time means a single
      // missing asset just gets skipped, everything else still precaches.
      await Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn('Precache skipped for', url, err))
        )
      );

      await Promise.all(
        CDN_ASSETS.map(async (url) => {
          try {
            const res = await fetch(url, { mode: 'cors' });
            if (res.ok) await cache.put(url, res);
          } catch (err) {
            console.warn('CDN precache skipped for', url, err);
          }
        })
      );

      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Stale-while-revalidate: serve the cached copy instantly if we have one,
// and always refresh it from the network in the background. This is how
// static assets (app shell, CDN libs, fonts) stay up to date automatically
// after a new deploy, with no manual cache-version bump required.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  return cached || (await networkFetch) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Page navigations: network-first (latest dashboard while online),
  //    falling back to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', res.clone());
          return res;
        } catch (err) {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match('./index.html');
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // 2) Never cache the Apps Script backends (records, reports, the AI
  //    round-trip). These are live data calls, not static assets — always
  //    go to the network, no cache read, no cache write.
  if (NEVER_CACHE_HOSTS.includes(url.hostname)) {
    event.respondWith(fetch(req));
    return;
  }

  // 3) Everything else this app cares about — precached app shell files,
  //    CDN libraries, Google Fonts — all use stale-while-revalidate.
  const isPrecached = PRECACHE_URLS.some((path) =>
    req.url.endsWith(path.replace('./', ''))
  );
  const isCdnAsset = CDN_ASSETS.includes(req.url);
  const isGoogleFont =
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (isPrecached || isCdnAsset || isGoogleFont) {
    event.respondWith(
      staleWhileRevalidate(req, isPrecached || isCdnAsset ? CACHE_NAME : RUNTIME_CACHE)
    );
    return;
  }

  // 4) Any other same-origin request: same stale-while-revalidate
  //    treatment via the runtime cache.
  event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
});
