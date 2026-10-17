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

/* How long each cache may grow, and how long a page may keep a reader waiting.
 *
 * Without limits both caches only ever grew. Every deploy ships a new set of
 * hashed chunks (~1 MB), this worker cached each set as it was asked for, and
 * nothing removed the last one — VERSION is bumped by hand, so months of
 * builds piled up under one name. Every page visited was kept the same way,
 * up to ~600 KB of HTML for a long chapter. On iOS, a site that holds that
 * much is the one the system clears under storage pressure, and it clears all
 * of it: the downloaded books and saved audio go with the build debris. */
const STATIC_MAX_AGE = 30 * 24 * 3600 * 1000; // unused this long → removed
const STATIC_RESTAMP = 7 * 24 * 3600 * 1000; // in use → re-stamped about weekly
const STAMP = "x-md-cached-at";
const PAGE_LIMIT = 120; // pages kept for offline, least recently visited go first
const NAV_TIMEOUT = 4000; // ms before a cached page is shown instead of waiting

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

  // immutable build assets + fonts: cache-first, stamped so that a chunk no
  // build has asked for in a month can be told apart from one in use.
  //
  // `/brand/` is in here for the app mark. It used to be an inline SVG, so it
  // was offline by construction; the designer's real logo is a file, and
  // without this line an offline reader gets a broken image in the app bar of
  // every screen. It is versioned by name, like the rest of this branch.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) {
          // Still in use: move its stamp forward, at most once a week, so the
          // sweep below never takes a chunk the current build depends on.
          if (Date.now() - stampOf(hit) > STATIC_RESTAMP) {
            event.waitUntil(cache.put(req, stamped(hit.clone())).catch(() => undefined));
          }
          return hit;
        }
        const res = await fetch(req);
        if (res.ok) event.waitUntil(cache.put(req, stamped(res.clone())).catch(() => undefined));
        return res;
      })
    );
    return;
  }

  // navigations: network-first, fall back to cached page, then offline shell.
  //
  // With a deadline when there is something to fall back to. A connection
  // that is up but barely moving — a train, a weak signal indoors — never
  // *fails*; it just takes thirty seconds, and network-first meant a chapter
  // already on the device waited the whole thirty. After NAV_TIMEOUT the saved
  // copy is shown and the network answer, when it comes, refreshes the cache
  // for next time. A page never visited has nothing to show early, so it waits
  // as before.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        const network = fetch(req).then((res) => {
          if (res.ok) {
            event.waitUntil(
              cache
                .put(req, res.clone())
                .then(() => tidy(cache))
                .catch(() => undefined)
            );
          }
          return res;
        });
        event.waitUntil(network.catch(() => undefined));
        const saved = cache.match(req, { ignoreSearch: true });
        const late = new Promise((resolve) => setTimeout(resolve, NAV_TIMEOUT, "late"));
        try {
          const first = await Promise.race([network, late]);
          if (first !== "late") return first;
          const hit = await saved;
          return hit || (await network);
        } catch {
          const hit = await saved;
          return hit || (await cache.match(OFFLINE_URL));
        }
      })()
    );
  }
});

/** A copy of a response carrying the time it was cached. */
function stamped(res) {
  const headers = new Headers(res.headers);
  headers.set(STAMP, String(Date.now()));
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** When an entry was cached; 0 for one cached before stamps existed. */
function stampOf(res) {
  return Number(res.headers.get(STAMP)) || 0;
}

/* Keeping both caches in bounds. Run only after a page has just arrived from
 * the network — online, by definition — so anything swept that turns out to
 * be wanted is fetched again straight away rather than missed offline.
 * Throttled to once an hour per worker; it walks every entry. */
let tidiedAt = 0;
async function tidy(pages) {
  if (Date.now() - tidiedAt < 3600 * 1000) return;
  tidiedAt = Date.now();

  // Pages: a put moves an entry to the end of the list, so the front is
  // whatever was visited longest ago. The offline shell is never counted out.
  const keys = (await pages.keys()).filter((k) => new URL(k.url).pathname !== OFFLINE_URL);
  for (const k of keys.slice(0, Math.max(0, keys.length - PAGE_LIMIT))) await pages.delete(k);

  // Build assets: whatever no page has asked for in STATIC_MAX_AGE.
  const statics = await caches.open(STATIC_CACHE);
  const cutoff = Date.now() - STATIC_MAX_AGE;
  for (const k of await statics.keys()) {
    const hit = await statics.match(k);
    if (hit && stampOf(hit) < cutoff) await statics.delete(k);
  }
}

/* ---- Push lives in public/firebase-messaging-sw.js ----
 *
 * The placeholder handlers that used to sit here are gone, not moved. Push
 * arrived as FCM (Push Notifications PRD §2), and an FCM subscription belongs
 * to the registration that created it — src/lib/push.ts registers a second
 * worker at `/firebase-cloud-messaging-push-scope` and subscribes there, so
 * nothing would ever have reached a `push` listener in this file. Two workers,
 * because this one owns scope `/` and everything cached under it; a push
 * worker registered at the same scope would replace it and take offline
 * reading and saved audio down with it.
 */
