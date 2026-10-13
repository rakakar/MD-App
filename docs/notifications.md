# Notifications inbox

The bell on desktop, the dot on the avatar, the Notifications row in the
account menu and the `/notifications` screen all show one list: what this
device has been sent. Designer's comps, 13 Oct 2026.

**For signed-in readers only.** Signed out there is no bell, and the page
asks the reader to sign in. Pushes are still saved while signed out, so they
are waiting after sign-in.

## Where the list comes from: this device

There is no inbox on the server yet, so the app keeps one itself, in its own
IndexedDB database `md-inbox` (store `items`). `src/lib/inbox.ts` owns the
shape. Two things write to it:

| Writer | When |
|---|---|
| `public/firebase-messaging-sw.js` | Every web push, app open or closed. It saves the push *before* deciding between a system notification and the in-app banner, so it is never missed and never saved twice. |
| `PushProvider` (page) | The Android and iOS shells, where pushes come through the native plugin and no service worker sees them: on arrival while the app is open, and when a tray notification is tapped (saved as read). |

Every write is announced on the `md-inbox` BroadcastChannel, which is how a
badge updates the moment a push lands, in any tab.

What this costs:

- **One device only.** A phone and a laptop each have their own list, and
  their own read state.
- **In the shells, a push that arrives while the app is closed and is never
  tapped is not kept.** The OS shows it, but no app code runs.
- **Icons are guessed.** A push carries a title, body, image and link. The
  icon is taken from `data.kind` when the sender sets one (`stage`,
  `feedback`, `event`, `highlight`), otherwise from the link's path
  (`/feedback…` → feedback, `/events…` → event, and so on), otherwise a bell.

The last 100 are kept. Opening the list does not mark anything read. Opening a
row, or "Mark all read", does.

## For the backend: a synced inbox

What would make the list follow a reader between devices. Proposed, not
built. The FE switch is contained in `src/lib/inbox.ts`.

```
GET  /api/v1/me/notifications/?unread=1&cursor=…
  → { results: [{ id, kind, title, body, click_url, image_url,
                  created_at, read_at }], next, unread_count }

POST /api/v1/me/notifications/read/      { ids: [...] } | { all: true }
```

- One row per reader per sent message, written by the same sender that calls
  FCM (`apps/notifications/services.py`), so the list and the push never
  disagree.
- `kind` is one of `stage · feedback · event · highlight · general`. Please
  also add it to the push's `data` payload. The local inbox already reads it.
- Feedback replies, shivir reminders and stage updates would be written by
  their own features, not only by the panel's broadcast.
- The inbox is signed-in only, so `me` covers every reader who can see it.
  The local store can go once this exists.
