/* ANU Production — offline shell with allowlist + TTL (Phase 12) */
const CACHE = "anu-production-shell-v2";
const SHELL_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const ICON_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const SHELL_ALLOWLIST = new Set([
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
]);

function ttlForPath(pathname) {
  if (pathname.startsWith("/icons/")) return ICON_TTL_MS;
  return SHELL_TTL_MS;
}

function isAllowlisted(url) {
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (SHELL_ALLOWLIST.has(url.pathname)) return true;
  if (url.pathname.startsWith("/icons/")) return true;
  return false;
}

async function putWithExpiry(cache, request, response, ttlMs) {
  const headers = new Headers(response.headers);
  headers.set("sw-cached-at", String(Date.now()));
  headers.set("sw-ttl-ms", String(ttlMs));
  const body = await response.clone().arrayBuffer();
  await cache.put(request, new Response(body, { status: response.status, statusText: response.statusText, headers }));
}

async function matchFresh(cache, request) {
  const cached = await cache.match(request);
  if (!cached) return null;
  const cachedAt = Number(cached.headers.get("sw-cached-at") || 0);
  const ttl = Number(cached.headers.get("sw-ttl-ms") || SHELL_TTL_MS);
  if (!cachedAt || Date.now() - cachedAt > ttl) {
    await cache.delete(request);
    return null;
  }
  return cached;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        [...SHELL_ALLOWLIST].map(async (path) => {
          try {
            const res = await fetch(path, { cache: "no-store" });
            if (res.ok) {
              await putWithExpiry(cache, path, res, ttlForPath(path));
            }
          } catch {
            /* ignore preload miss */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never touch API traffic
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network first → offline.html only (do not cache arbitrary HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => res)
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (
            (await matchFresh(cache, "/offline.html")) ||
            (await caches.match("/offline.html")) ||
            new Response("Offline", { status: 503, statusText: "Offline" })
          );
        }),
    );
    return;
  }

  if (!isAllowlisted(url)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const fresh = await matchFresh(cache, request);
      if (fresh) return fresh;

      try {
        const res = await fetch(request);
        if (res.ok) {
          await putWithExpiry(cache, request, res, ttlForPath(url.pathname));
        }
        return res;
      } catch {
        return (
          (await caches.match(request)) ||
          (await matchFresh(cache, "/offline.html")) ||
          new Response("Offline", { status: 503, statusText: "Offline" })
        );
      }
    })(),
  );
});
