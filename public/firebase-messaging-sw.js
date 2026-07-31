/*
 * Push service worker (Push Notifications PRD §5).
 *
 * Registered by src/lib/push.ts at its own scope,
 * `/firebase-cloud-messaging-push-scope`, never at `/` — the app's offline
 * worker (`/sw.js`) owns that, and a second registration there would replace
 * it and take offline reading and saved audio with it. Firebase's own SDK uses
 * this same scope for the same reason. A push event goes to whichever
 * registration holds the subscription, so the narrow scope costs nothing.
 *
 * No `importScripts` of the Firebase SDK. It would only be doing two things —
 * parsing the payload and calling showNotification — and both are written out
 * below, in exchange for: no CDN fetch on the install of a worker that has to
 * survive being offline, no version to keep in step with package.json, and
 * full control over the foreground case (the SDK's `onMessage` depends on its
 * own worker forwarding, which is what `postMessage` below replaces).
 *
 * The Django sender (apps/notifications/services.py) puts everything in the
 * `data` payload as well as the notification block, so this file reads `data`
 * and never depends on FCM's envelope shape.
 */

const FALLBACK_TITLE = "MD Study";
const ICON = "/icon-192.png";
const BADGE = "/icon-192.png";

/** FCM's push body varies by message type; take whichever half is present. */
function readPayload(event) {
  let raw = {};
  try {
    raw = event.data ? event.data.json() : {};
  } catch {
    return { title: FALLBACK_TITLE, body: event.data ? event.data.text() : "", clickUrl: "/" };
  }
  const data = raw.data || {};
  const notification = raw.notification || {};
  return {
    title: data.title || notification.title || FALLBACK_TITLE,
    body: data.body || notification.body || "",
    imageUrl: data.image_url || notification.image || "",
    clickUrl: data.click_url || (raw.fcmOptions && raw.fcmOptions.link) || "/",
  };
}

/** Windows of this app that the reader can actually see right now. */
async function visibleClients() {
  const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  return all.filter((client) => client.visibilityState === "visible");
}

self.addEventListener("push", (event) => {
  const payload = readPayload(event);

  event.waitUntil(
    (async () => {
      // App open and on screen: hand it to the page, which shows an in-app
      // banner. A system notification here would slide over the very screen
      // the reader is already looking at. (The spec permits skipping
      // showNotification while a client is visible — this is that case.)
      const open = await visibleClients();
      if (open.length > 0) {
        for (const client of open) {
          client.postMessage({
            type: "push-message",
            title: payload.title,
            body: payload.body,
            imageUrl: payload.imageUrl,
            clickUrl: payload.clickUrl,
          });
        }
        return;
      }

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: ICON,
        badge: BADGE,
        // Android and desktop render this; iOS ignores it, which is fine —
        // it is decoration, never the message.
        image: payload.imageUrl || undefined,
        data: { clickUrl: payload.clickUrl },
        // One tag per message id would stack; a single tag means a second
        // broadcast replaces the first rather than piling up on a lock screen
        // somebody has not looked at since yesterday.
        tag: "md-study-push",
        renotify: true,
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.clickUrl) || "/";

  event.waitUntil(
    (async () => {
      const url = new URL(target, self.location.origin);
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      // Focus what is already open rather than opening a second copy of the
      // app — on Android an installed PWA gets its own task, and a second
      // window is a confusing thing to hand someone who just tapped a
      // notification.
      for (const client of clients) {
        if (new URL(client.url).origin !== url.origin) continue;
        await client.focus();
        if ("navigate" in client && client.url !== url.href) {
          await client.navigate(url.href).catch(() => undefined);
        }
        return;
      }
      await self.clients.openWindow(url.href);
    })()
  );
});

// Push is useless from a worker that is still waiting: there is no page to
// interrupt and nothing cached to protect, so unlike /sw.js this one takes
// over immediately.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
