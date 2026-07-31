# Push notifications — FE side

The backend half (panel usage, cron, Firebase console setup) is documented in
the BE repo: `docs/push_notifications_manual.md`. This file is the app's side of
it — what is here, and why it is shaped this way.

## Environment

Five public values in `.env.local` (and in Vercel's environment variables for
the deployed app):

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

The first four come from Firebase console → Project settings → General → your
web app. The VAPID key comes from Project settings → Cloud Messaging → Web Push
certificates → Generate key pair.

**With any of them missing the app has no notifications UI at all** — no button
in Settings, no banner on home, no errors. That is the intended state for a
deploy that happens before the Firebase project exists.

## The pieces

| File | Job |
|---|---|
| `src/lib/push.ts` | The platform boundary. Token acquisition, the register/unregister calls, iOS/standalone detection. |
| `src/components/push/usePush.ts` | One source of truth for "what state is this device in", shared by both controls. |
| `src/components/push/NotificationSetting.tsx` | The Settings row — the permanent home of the control. |
| `src/components/push/NotificationBanner.tsx` | The dismissible home nudge. |
| `src/components/push/PushProvider.tsx` | Silent re-register on app start + the in-app banner for messages that arrive while the app is open. Mounted in `AppShell`. |
| `public/firebase-messaging-sw.js` | Background messages and notification clicks. |

## Three things that are easy to break

**The permission request must be synchronous inside the click handler.** Safari
grants `Notification.requestPermission()` only during a user gesture, and an
`await` before it loses the gesture — the request is then refused with no prompt
ever shown, on the one platform where this is hardest to get working. `enable()`
in `usePush` is wired straight to `onClick` for this reason; do not put an
`await` in front of it.

**Two service workers, two scopes.** `/sw.js` owns scope `/` — the offline shell
and saved chapter audio. The push worker registers at
`/firebase-cloud-messaging-push-scope` (the scope Firebase's own SDK uses).
Registering the push worker at `/` would silently replace the offline worker and
take downloaded books with it.

**Nothing calls `getToken()` outside `lib/push.ts`.** That is what makes the
Capacitor wrap a small change: the native build gets its token from the Push
Notifications plugin and calls `sendTokenToServer(token, "android" | "ios")`.
The API contract, the retry rules, the storage keys and every component above
that file stay exactly as they are.

## iOS

Push on iPhone works only for an **installed** PWA (iOS 16.4+). In Safari as a
tab, no permission prompt will ever do anything, so the app does not show one:
`iosNeedsInstall()` is true and Settings shows an "Add to Home Screen" hint
instead. The manifest already declares `display: standalone` and the app has
apple-touch icons, which is everything iOS needs for the install to produce a
push-capable app. The nudge disappears on its own once the native iOS build
ships.

## Testing it without a phone

Desktop Chrome does the whole flow. Settings → Enable notifications → grant.
Then send from `/panel/notifications/` in the panel. The board's success count
goes to 1 and the notification appears in the OS.

To check the foreground path specifically, keep the app in a visible tab: the
service worker forwards the message to the page and you get the in-app banner
rather than a system notification. Backgrounding the tab gives you the system
one.
