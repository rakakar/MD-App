/*
 * Service worker (PRD §10): offline shell + downloaded books; structured so
 * Web Push subscribe is a v2 addition, not a rewrite — push handlers are
 * already wired below, only the subscribe UI is missing by design.
 */
const VERSION = "md-sw-v2";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  // Deliberately no skipWaiting() here. Activating under a live page swaps the
  // asset caches beneath a reader that is mid-chapter, and its already-loaded
  // chunks may no longer exist. The new worker waits; the app notices it and
  // offers a reload, which posts SKIP_WAITING below.
  event.waitUntil(caches.open(PAGE_CACHE).then((cache) => cache.add(OFFLINE_URL)));
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // API responses are cached in IndexedDB by the app, not here
  if (url.origin !== self.location.origin) return;

  // immutable build assets + fonts: cache-first
  if (url.pathname.startsWith("/_next/static/") || url.pathname.endsWith(".woff2")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // navigations: network-first, fall back to cached page, then offline shell
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          const hit = await cache.match(req, { ignoreSearch: true });
          return hit || (await cache.match(OFFLINE_URL));
        }
      })()
    );
  }
});

// ---- Web Push (v2): handlers ready, subscribe UI intentionally absent ----
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "MD Study", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "MD Study", {
      body: payload.body || "",
      icon: "/icon-192.png",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(clients.openWindow(url));
});
