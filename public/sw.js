/**
 * Minimal hand-rolled service worker (kein Serwist — bewusst schlank).
 * Network-first für Navigationen, cache-first für statische Next-Assets.
 * CACHE_VERSION bei Breaking Changes hochzählen, alte Caches werden aufgeräumt.
 */
const CACHE_VERSION = "pitchflow-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Immutable build assets: cache-first. includes() statt startsWith(), damit
  // es auch unter einem basePath (z.B. /pitchflow) greift.
  if (url.pathname.includes("/_next/static/") || url.pathname.includes("/icons/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_VERSION);
          cache.put(request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  // Navigationen & Rest: network-first mit Cache-Fallback (offline).
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok && request.mode === "navigate") {
          const cache = await caches.open(CACHE_VERSION);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Error("offline und nicht im Cache");
      }
    })()
  );
});
