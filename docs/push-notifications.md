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

These five are for **browsers only**. The Android and iOS shells take their
Firebase identity from `google-services.json` / `GoogleService-Info.plist`
compiled into the app, so they skip this check entirely — see "The shells"
below.

## The pieces

| File | Job |
|---|---|
| `src/lib/push.ts` | The platform boundary. Picks web or native, then converges on the register/unregister calls. |
| `src/lib/push-native.ts` | The Capacitor half: OS permission, the plugin's registration event, tray-tap and foreground listeners. |
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

**Nothing calls `getToken()` outside `lib/push.ts`.** That is what made the
Capacitor wrap a small change when it came: `push-native.ts` produces a token
and `push.ts` hands it to the same `sendTokenToServer`. The API contract, the
retry rules, the storage keys and every component above those two files are
untouched by the existence of a native app.

## The shells

Android's WebView implements neither `PushManager` nor `Notification`, so web
push cannot work inside the app at all — and for a while it silently didn't:
`isPushSupported()` was false, `NotificationSetting` returned `null`, and a
reader who installed the APK got no button, no prompt and no explanation, while
the same person in Chrome got notifications fine.

So the shells go through the OS instead, via `@capacitor/push-notifications`.
Three things about that are worth knowing:

- **The branch is at runtime, not build time.** The shells load this deployed
  bundle over the network (`server.url` in `capacitor.config.ts`) rather than
  bundling their own, so the same JavaScript runs in a browser and in a
  WebView. `isNativePush()` is the only thing that tells them apart.
- **A token arrives as an event, not a return value.** `register()` resolves
  when the request is made; the token comes later on the `registration`
  listener. `tokenFromRegistration()` wraps that, with a 20-second timeout —
  because the commonest misconfiguration (no `google-services.json` in the
  APK) otherwise presents as a button that spins forever.
- **A tray tap is ours to handle.** On the web `sw.js` owns the notification
  and its click. In the app the tap arrives as
  `pushNotificationActionPerformed`, and `PushProvider` is the only place that
  can route it.

Deploying this to Vercel is half the job: the shell also has to be rebuilt, or
it will keep running with a plugin its native side doesn't have. Build steps
are in `docs/mobile-apps.md` → Android → Push notifications.

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

The shell behaves the same way and for a different reason — Android suppresses
the tray notification for an app that is already in front, and
`onNativePushReceived` turns it into the same in-app banner. Background the app
to see the tray version.
