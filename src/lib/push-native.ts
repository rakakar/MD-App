// Push inside the native shells — the Capacitor half of the boundary that
// `lib/push.ts` promised to keep.
//
// Why a second file at all: web push and native push agree on nothing except
// the string they produce. The web asks a browser for a permission, registers
// a service worker and calls Firebase's JS SDK; the native app asks the OS for
// a permission and gets its token back through an *event*, from a plugin whose
// code lives in the APK rather than in this bundle. Only the last step — hand
// the token to `/api/push/register/` — is shared, and that step stays in
// push.ts. Nothing here talks to the backend.
//
// The one non-obvious fact about this app: the shells load the deployed web
// app over the network (`server.url` in capacitor.config.ts), so this module
// is served from Vercel to a browser and to a WebView alike. Every function
// below therefore has to decide at *runtime* which one it is in — there is no
// native build of this bundle to branch on at compile time. `isNativePush()`
// is that decision, and everything else is behind it.

import { Capacitor } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

/** True only inside the Android/iOS shell. False in every browser, including
 *  an installed PWA — a PWA does web push and must keep doing it. */
export function isNativePush(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

/** What `platform` to register the token under. Null off-native. */
export function nativePlatform(): "android" | "ios" | null {
  if (!isNativePush()) return null;
  return Capacitor.getPlatform() === "ios" ? "ios" : "android";
}

/**
 * The plugin, loaded only when it is going to be used.
 *
 * A dynamic import for the same reason the Firebase SDK gets one in push.ts:
 * this bundle is downloaded by far more browsers than shells, and a browser
 * has no use for a module whose only job is to call across a native bridge
 * that isn't there.
 */
async function plugin() {
  const { PushNotifications } = await import("@capacitor/push-notifications");
  return PushNotifications;
}

/** Capacitor's four-state permission, flattened to the three the UI knows. */
function flatten(state: string): NotificationPermission {
  if (state === "granted") return "granted";
  if (state === "denied") return "denied";
  // "prompt" and "prompt-with-rationale" both mean: we may still ask.
  return "default";
}

/** Has this device already been asked, and what did it say? */
export async function nativePermission(): Promise<NotificationPermission> {
  try {
    const { receive } = await (await plugin()).checkPermissions();
    return flatten(receive);
  } catch {
    // A shell built before the plugin was added has no native side to answer.
    // Treating that as "denied" is right: there is nothing the reader could do
    // here, and offering an Enable button that cannot work is worse than
    // offering none.
    return "denied";
  }
}

const TOKEN_TIMEOUT_MS = 20_000;

/**
 * Register with FCM and wait for the token.
 *
 * `register()` resolves as soon as the *request* is made — the token arrives
 * later, on the `registration` event, so the promise has to be built around
 * the listeners rather than around the call. Both listeners are attached
 * before `register()` runs: `addListener` crosses the bridge and is genuinely
 * async, and a token that arrives before anyone is listening is a token lost
 * with no error anywhere.
 *
 * The timeout exists because the failure mode without one is an Enable button
 * that spins forever — which is what a missing `google-services.json` looks
 * like from up here, and the commonest way this feature is misconfigured.
 */
function tokenFromRegistration(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const handles: PluginListenerHandle[] = [];

    const finish = (act: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      handles.forEach((handle) => void handle.remove());
      act();
    };

    const timer = setTimeout(
      () =>
        finish(() =>
          reject(
            new Error(
              "FCM did not return a device token. The app build may be missing google-services.json."
            )
          )
        ),
      TOKEN_TIMEOUT_MS
    );

    void (async () => {
      try {
        const push = await plugin();
        handles.push(
          await push.addListener("registration", (token) => finish(() => resolve(token.value)))
        );
        handles.push(
          await push.addListener("registrationError", (error) =>
            finish(() => reject(new Error(String(error.error ?? "FCM registration failed"))))
          )
        );
        await push.register();
      } catch (error) {
        finish(() => reject(error));
      }
    })();
  });
}

export type NativeTokenResult =
  | { ok: true; token: string }
  | { ok: false; reason: "denied" | "failed"; error?: unknown };

/**
 * Ask the reader, then get the token. This is the Enable button's native half.
 *
 * On Android 13+ `requestPermissions()` is what raises the system dialog —
 * before 13 it returns granted without showing anything, which is correct: the
 * OS granted it at install time.
 */
export async function requestNativeToken(): Promise<NativeTokenResult> {
  try {
    const { receive } = await (await plugin()).requestPermissions();
    if (flatten(receive) !== "granted") return { ok: false, reason: "denied" };
    return { ok: true, token: await tokenFromRegistration() };
  } catch (error) {
    return { ok: false, reason: "failed", error };
  }
}

/**
 * The current token when permission is already granted — the app-start
 * refresh. Silent: nothing is requested and nothing is shown, so a failure
 * here (offline, Play Services updating) is not worth a word to the reader.
 */
export async function currentNativeToken(): Promise<string | null> {
  if ((await nativePermission()) !== "granted") return null;
  try {
    return await tokenFromRegistration();
  } catch {
    return null;
  }
}

/** Stop this install receiving. Deletes the FCM token on the device, which is
 *  the native counterpart of `deleteToken()` on the web. */
export async function deleteNativeToken(): Promise<void> {
  try {
    await (await plugin()).unregister();
  } catch {
    // The backend deactivation in push.ts is what actually stops delivery.
  }
}

/** The shape both native listeners hand back, matching `ForegroundMessage`. */
function fromData(data: Record<string, unknown> | undefined, fallbackTitle = "", fallbackBody = "") {
  const value = (key: string) => {
    const raw = data?.[key];
    return typeof raw === "string" ? raw : "";
  };
  return {
    title: value("title") || fallbackTitle,
    body: value("body") || fallbackBody,
    imageUrl: value("image_url") || undefined,
    clickUrl: value("click_url") || "/",
  };
}

export interface NativePushMessage {
  title: string;
  body: string;
  imageUrl?: string;
  clickUrl: string;
}

/**
 * A notification that arrived while the app was in the foreground.
 *
 * Android does not put these in the tray — the OS suppresses a notification
 * for an app the user is already looking at — so without this handler they
 * would vanish entirely. The in-app toast is the whole delivery.
 */
export function onNativePushReceived(
  handler: (message: NativePushMessage) => void
): () => void {
  return listen("pushNotificationReceived", (event) => {
    const push = event as { title?: string; body?: string; data?: Record<string, unknown> };
    handler(fromData(push.data, push.title ?? "", push.body ?? ""));
  });
}

/**
 * The reader tapped a notification in the tray.
 *
 * Fires for a warm app and for a cold start alike; on a cold start it arrives
 * once this bundle has loaded and attached the listener, which is why the
 * navigation it triggers can be a beat behind the splash screen.
 */
export function onNativePushTapped(handler: (message: NativePushMessage) => void): () => void {
  return listen("pushNotificationActionPerformed", (event) => {
    const action = event as { notification?: { title?: string; body?: string; data?: Record<string, unknown> } };
    const push = action.notification ?? {};
    handler(fromData(push.data, push.title ?? "", push.body ?? ""));
  });
}

/**
 * Attach a plugin listener from synchronous React code.
 *
 * `addListener` is async and an effect's cleanup is not, so the handle is
 * captured in a closure and removed when it turns up. The `removed` flag
 * covers the case that matters: an effect that unmounts before the bridge has
 * answered, which would otherwise leave a listener behind for good.
 */
function listen(event: string, handler: (payload: unknown) => void): () => void {
  if (!isNativePush()) return () => undefined;
  let removed = false;
  let handle: PluginListenerHandle | null = null;

  void (async () => {
    try {
      const attached = await (await plugin()).addListener(
        event as "pushNotificationReceived",
        handler as never
      );
      if (removed) void attached.remove();
      else handle = attached;
    } catch {
      // Shell without the native plugin — nothing to listen to.
    }
  })();

  return () => {
    removed = true;
    void handle?.remove();
  };
}
