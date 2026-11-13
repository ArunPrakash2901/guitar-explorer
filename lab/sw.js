/* Guitar Explorer install shell. Audio samples intentionally remain network-only. */
const CACHE_PREFIX = "guitar-explorer-install-";
const CACHE_NAME = CACHE_PREFIX + "v1";
const CORE_FILES = [
  "./",
  "./progression.html",
  "./triad-trainer.html",
  "./arpeggio-trainer.html",
  "./instrument-desk.html",
  "./progression.css",
  "./trainers.css",
  "./manifest.webmanifest",
  "./app-icons/icon-192.png",
  "./app-icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_FILES.map((path) => new URL(path, self.registration.scope).href));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("Range")) return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  // Guitar samples are large, and offline playback has not been validated.
  if (url.pathname.includes("/samples/") || /\\.(?:ogg|wav|flac|mp3)$/i.test(url.pathname)) return;
  if (request.destination === "audio" || request.destination === "video") return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Ignore shared-progression query data for HTML cache keys.
    const isNavigation = request.mode === "navigate";
    const cacheKey = isNavigation ? new URL(url.pathname, url.origin).href : request;
    try {
      const response = await fetch(request);
      if (response.ok && response.type === "basic") {
        await cache.put(cacheKey, response.clone()).catch(() => {});
      }
      return response;
    } catch (error) {
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
      if (isNavigation) {
        const fallback = await cache.match(new URL("./", scope).href);
        if (fallback) return fallback;
      }
      throw error;
    }
  })());
});
