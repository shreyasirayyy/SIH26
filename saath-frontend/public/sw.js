// Minimal offline shell cache. Deliberately does NOT cache any API responses,
// case data, check-in data, or anything under /survivor, /counsellor, /admin routes,
// since those may contain sensitive mental-health information.
const CACHE = "saath-shell-v1";
const SHELL_ASSETS = ["/welcome", "/icons/icon-192.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isSensitiveRoute = ["/survivor", "/counsellor", "/admin", "/api"].some((p) =>
    url.pathname.startsWith(p)
  );
  if (event.request.method !== "GET" || isSensitiveRoute) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
