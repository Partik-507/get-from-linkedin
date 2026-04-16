/* ITM Hub — Service Worker
 * Strategy:
 *  - App shell precached on install
 *  - Static assets: cache-first
 *  - HTML/navigation: network-first, fallback to cached index.html
 *  - Firestore/Auth/OAuth: never cached (always network)
 *  - PDFs/docs: cached on-demand via the `itm-files-v1` cache (managed by syncEngine)
 */

const SHELL_CACHE = "itm-shell-v1";
const STATIC_CACHE = "itm-static-v1";
const FILE_CACHE = "itm-files-v1";

const SHELL_URLS = ["/", "/index.html", "/manifest.json", "/icon.svg"];

const NEVER_CACHE_HOSTS = [
  "firestore.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "firebaseinstallations.googleapis.com",
  "www.googleapis.com",
  "oauth2.googleapis.com",
  "accounts.google.com",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, STATIC_CACHE, FILE_CACHE]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|webp|gif|ico)$/i.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // Never cache backend / auth / oauth
  if (NEVER_CACHE_HOSTS.some((h) => url.hostname.endsWith(h))) return;
  if (url.pathname.startsWith("/oauth") || url.pathname.startsWith("/api/")) return;

  // HTML / navigation → network-first, fallback to cached shell
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put("/index.html", copy)).catch(() => {});
          return res;
        })
        .catch(async () => (await caches.match("/index.html")) || Response.error()),
    );
    return;
  }

  // Static assets → cache-first
  if (isStaticAsset(url) || url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => hit || Response.error());
      }),
    );
    return;
  }

  // Cross-origin files (PDFs etc) — let syncEngine manage `itm-files-v1`
  // but transparently serve from it if present
  event.respondWith(
    caches.open(FILE_CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        return res;
      } catch {
        return hit || Response.error();
      }
    }),
  );
});

// Allow page to ask SW to skip waiting (for updates)
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});
