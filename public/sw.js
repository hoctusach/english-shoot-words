// Game Bắn Từ service worker: lets the installed app open and play offline.
// Pages are network-first (so a new deploy shows up right away), hashed build
// files are cache-first (their names change with every build).
const CACHE = 'shootwords-v1';
const SCOPE = new URL(self.registration.scope).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([SCOPE, `${SCOPE}manifest.webmanifest`])).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheKey) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(cacheKey, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(cacheKey, { ignoreSearch: true });
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;

  if (request.mode === 'navigate' || url.pathname === SCOPE || url.pathname === `${SCOPE}index.html`) {
    event.respondWith(networkFirst(request, SCOPE));
  } else if (url.pathname.startsWith(`${SCOPE}assets/`)) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request, request));
  }
});
