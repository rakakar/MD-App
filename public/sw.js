/*
 * Service worker (PRD §10): offline shell + downloaded books; structured so
 * Web Push subscribe is a v2 addition, not a rewrite — push handlers are
 * already wired below, only the subscribe UI is missing by design.
 */
const VERSION = "md-sw-v3";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline";
/* Chapter audio the reader explicitly saved (src/lib/audioCache.ts). Named
   outside the VERSION namespace on purpose: a worker upgrade sweeps its own
   caches, and 70 MB a reader chose to download must survive a deploy. */
const AUDIO_CACHE = "md-audio-v1";

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
          keys
            .filter((k) => !k.startsWith(VERSION) && k !== AUDIO_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* A saved chapter, answered from the device.
 *
 * Media elements ask for byte ranges — that is how a seek works — and what we
 * can do about it depends on how the file was saved. A copy fetched with CORS
 * is readable, so it gets a real 206 with the slice it asked for, which is
 * what iOS requires before it will let a scrub bar move at all. A copy saved
 * through the `no-cors` fallback is opaque: this worker may not read its bytes
 * any more than the page could, so the whole file goes back and the browser
 * takes what it needs. Everything not saved is handed to the network
 * untouched. */
async function servedAudio(req, url) {
  let hit;
  try {
    const cache = await caches.open(AUDIO_CACHE);
    hit = await cache.match(url.href);
  } catch {
    return fetch(req);
  }
  if (!hit) return fetch(req);

  const range = req.headers.get("range");
  if (!range || hit.type === "opaque") return hit;

  const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!match) return hit;
  try {
    const body = await hit.arrayBuffer();
    const size = body.byteLength;
    let start;
    let end;
    if (match[1]) {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : size - 1;
    } else if (match[2]) {
      start = Math.max(size - Number(match[2]), 0); // suffix range
      end = size - 1;
    } else {
      return hit;
    }
    end = Math.min(end, size - 1);
    if (start > end || start >= size) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes" },
      });
    }
    return new Response(body.slice(start, end + 1), {
      status: 206,
      headers: {
        "Content-Type": hit.headers.get("Content-Type") || "audio/mpeg",
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
        "Accept-Ranges": "bytes",
      },
    });
  } catch {
    // reading the cached body failed — the whole file is still a valid answer
    return hit;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* Saved chapter audio, from the BE's media host. Cache-first, and *only*
     for files already saved — a miss is handed straight back to the browser
     rather than proxied, so streaming and range requests for everything else
     behave exactly as they do without a worker. */
  if (url.origin !== self.location.origin) {
    if (req.destination === "audio" || /\.(wav|mp3|m4a|ogg|opus|aac)$/i.test(url.pathname)) {
      event.respondWith(servedAudio(req, url));
    }
    // API responses are cached in IndexedDB by the app, not here
    return;
  }

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
