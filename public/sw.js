// MyDroneMap service worker
// - Precaches app shell + /db/* on install (so the app loads offline).
// - Same-origin GETs: cache-first (network fallback for updates).
// - Raster base tiles (OSM + Topo + Esri + CARTO): stale-while-revalidate with an LRU cap.
// - Bumping CACHE_VERSION forces the old caches to be purged on activate.

const CACHE_VERSION = 'v3';
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const TILE_CACHE = `tiles-${CACHE_VERSION}`;

const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/db/rules.json',
  '/db/protected_areas.geojson',
  '/db/aerodromes.csv',
];

const TILE_CAP = 1500; // ~1500 tiles ≈ 30 MB on disk across all providers

// Allow-list of tile hostnames to cache. Single shared TILE_CACHE; LRU is
// shared across providers (a heavily-used satellite base can evict street
// tiles). Acceptable trade-off vs per-provider complexity.
const TILE_HOSTS = [
  'tile.openstreetmap.org',
  'tile.opentopomap.org',
  'server.arcgisonline.com',
  // CARTO Voyager served via legacy Fastly CDN; subdomains a-d below.
  'cartodb-basemaps-a.global.ssl.fastly.net',
  'cartodb-basemaps-b.global.ssl.fastly.net',
  'cartodb-basemaps-c.global.ssl.fastly.net',
  'cartodb-basemaps-d.global.ssl.fastly.net',
];

const matchesTileHost = (hostname) =>
  TILE_HOSTS.includes(hostname) ||
  TILE_HOSTS.some((h) => hostname.endsWith('.' + h));

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);

      // Precache known shell URLs individually so one 404 doesn't abort
      // the whole install.
      await Promise.all(
        SHELL_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'reload' });
            if (res.ok) await cache.put(url, res);
          } catch (err) {
            console.warn('[sw] precache failed for', url, err);
          }
        }),
      );

      // Precache hashed /assets/* via the build-time asset manifest.
      try {
        const manifestRes = await fetch('/asset-manifest.json', {
          cache: 'reload',
        });
        if (manifestRes.ok) {
          const manifest = await manifestRes.json();
          const assetUrls = Object.values(manifest).filter(
            (u) => typeof u === 'string',
          );
          await Promise.all(
            assetUrls.map(async (url) => {
              try {
                const res = await fetch(url, { cache: 'reload' });
                if (res.ok) await cache.put(url, res);
              } catch (err) {
                console.warn('[sw] precache failed for asset', url, err);
              }
            }),
          );
        }
      } catch (err) {
        console.warn('[sw] no asset manifest, skipping asset precache', err);
      }

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== TILE_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Raster base tiles — stale-while-revalidate, LRU-bounded
  if (matchesTileHost(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, TILE_CACHE, TILE_CAP));
    return;
  }

  // Same-origin GETs — cache-first, network fallback for fresh data
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Cross-origin (other CDNs) — pass through.
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (
      response &&
      (response.ok || response.type === 'opaque') &&
      response.status !== 206
    ) {
      cache.put(request, response.clone()).then(() => undefined);
    }
    return response;
  } catch (err) {
    // Last-ditch: if the request is a navigation, return the cached shell
    if (request.mode === 'navigate') {
      const shell = await cache.match('/index.html');
      if (shell) return shell;
    }
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

async function staleWhileRevalidate(request, cacheName, cap) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      // Cache OK responses AND opaque cross-origin (no-cors) responses —
      // Leaflet loads OSM tiles via <img>, so the browser fetches them
      // as no-cors. An opaque response has status 0 but its body is still
      // readable by the cache for subsequent <img> requests.
      if (response && (response.ok || response.type === 'opaque')) {
        cache
          .put(request, response.clone())
          .then(() => trimCache(cache, cap))
          .catch(() => undefined);
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

async function trimCache(cache, cap) {
  const keys = await cache.keys();
  if (keys.length <= cap) return;
  const excess = keys.length - cap;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}