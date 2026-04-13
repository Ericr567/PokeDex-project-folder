const STATIC_CACHE = "pokedex-static-v1";
const RUNTIME_CACHE = "pokedex-runtime-v1";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

const shouldCacheRequest = (request) => {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);

  const isSameOriginAsset = url.origin === self.location.origin;
  const isPokemonApi = url.origin.includes("pokedex.mimo.dev") || url.origin.includes("pokeapi.co");
  const isSpriteCdn = url.origin.includes("raw.githubusercontent.com");

  return isSameOriginAsset || isPokemonApi || isSpriteCdn;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!shouldCacheRequest(request)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match("/index.html");
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    }),
  );
});
