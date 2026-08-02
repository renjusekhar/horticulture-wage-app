const CACHE = "horticulture-wage-v15";
const CACHE_PREFIX = "horticulture-wage-";
const FILES = [
  "./",
  "index.html",
  "styles.css?v=15",
  "app.js?v=15",
  "manifest.webmanifest?v=2",
  "icon.svg",
  "brand-logo-32-v2.png",
  "brand-logo-180-v2.png",
  "brand-logo-192-v2.png",
  "brand-logo-512-v2.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const cacheKeys = await caches.keys();
    const oldCacheKeys = cacheKeys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE);
    await Promise.all(oldCacheKeys.map(key => caches.delete(key)));
    await self.clients.claim();

    // Existing installations may still be running the old alert-based JavaScript.
    // Refresh those windows once when this cache version becomes active.
    if (oldCacheKeys.length) {
      const windows = await self.clients.matchAll({ type: "window" });
      await Promise.all(windows.map(client => client.navigate(client.url)));
    }
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put("index.html", copy));
          return response;
        })
        .catch(() => caches.match("index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => (
      cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      })
    ))
  );
});
