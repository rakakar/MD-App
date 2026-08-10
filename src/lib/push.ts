// Push notifications: acquiring a device token and telling the backend about
// it. This is the whole platform boundary, on purpose.
//
// There are two ways to get a token and they have nothing in common. A browser
// registers a service worker and asks Firebase's JS SDK; the Android/iOS shell
// asks a native plugin and waits for an event. Both end at the same place —
// `sendTokenToServer(token, platform)` — and the three exported verbs below
// (`enablePush`, `refreshPushRegistration`, `disablePush`) each pick a side and
// then converge. Nothing above this file knows which one ran.
//
// The native half lives in `push-native.ts`, and the branch is a *runtime*
// one: the shells load this same deployed bundle over the network rather than
// bundling their own, so there is no build-time platform to switch on.
//
// Permission is never requested on load. Safari on iOS *only* grants it inside
// a user gesture, and a browser that prompts on arrival is a browser people
// deny permanently — the choice is made once and there is no second chance.

import { apiBase } from "./api";
import { sessionToken } from "./me";
import {
  currentNativeToken,
  deleteNativeToken,
  isNativePush,
  nativePermission,
  nativePlatform,
  requestNativeToken,
} from "./push-native";

export type PushPlatform = "web" | "android" | "ios";

/** Where the last successfully registered token is remembered, so an app start
 *  with permission already granted can tell "refresh" from "first time". */
const TOKEN_KEY = "md.push.token";

/**
 * "This reader turned notifications off in the app."
 *
 * Needed because the OS permission and the app's setting are different
 * things. Switching off here does not revoke the browser permission — only the
 * reader can do that, in OS settings — so without this flag the silent
 * re-register on the next app start would helpfully undo the choice they just
 * made.
 */
const OPT_OUT_KEY = "md.push.opted_out";

export interface FirebaseWebConfig {
  apiKey: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

/**
 * The Firebase web config, or null when it is not fully set.
 *
 * All five are public values — they identify the project, they do not
 * authorize sending; the service-account key that does lives only on the
 * server. Returning null rather than throwing is deliberate: an app deployed
 * before Firebase is set up should be an app without a notifications button,
 * not a white screen.
 */
export function firebaseConfig(): FirebaseWebConfig | null {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "",
  };
  return Object.values(config).every(Boolean) ? config : null;
}

// ---- platform questions ----

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/** iPhone/iPad, including iPadOS pretending to be a Mac (touch + Macintosh). */
export function isIos(): boolean {
  if (!isBrowser()) return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/** Running from the home-screen icon rather than inside a browser tab. */
export function isStandalone(): boolean {
  if (!isBrowser()) return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari's own, pre-standard flag — still the only reliable one on iOS
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * True when this is an iPhone in a browser tab, where push is impossible no
 * matter what we do. iOS 16.4+ delivers push only to an *installed* PWA, so
 * the honest answer is an install hint, not an enable button that would ask
 * for a permission the OS will never act on.
 */
export function iosNeedsInstall(): boolean {
  // The native iOS shell is an installed app already, whatever its user agent
  // says — and its user agent says iPhone-in-Safari, so this check has to run
  // before the sniffing does or the app would offer to install itself.
  if (isNativePush()) return false;
  return isIos() && !isStandalone();
}

/** Can this device do push at all, given how the app is currently running? */
export function isPushSupported(): boolean {
  if (!isBrowser()) return false;
  // The shells go through the OS, not the browser. This matters more than it
  // looks: Android's WebView implements neither `PushManager` nor
  // `Notification`, so the check below is false inside the app and the whole
  // feature used to disappear there — no button, no prompt, no explanation.
  if (isNativePush()) return true;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return false;
  }
  return !iosNeedsInstall();
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (!isBrowser() || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * The permission, whichever OS or browser owns it.
 *
 * Async because the native side has to cross the bridge to answer. Callers
 * that only ever run on the web can keep using `permissionState()`; anything
 * that decides what the reader sees has to use this one.
 */
export async function pushPermission(): Promise<NotificationPermission | "unsupported"> {
  if (isNativePush()) return nativePermission();
  return permissionState();
}

export function hasOptedOut(): boolean {
  if (!isBrowser()) return false;
  try {
    return localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

function setOptedOut(value: boolean): void {
  try {
    if (value) localStorage.setItem(OPT_OUT_KEY, "1");
    else localStorage.removeItem(OPT_OUT_KEY);
  } catch {
    // best-effort; the server-side state is what actually gates delivery
  }
}

// ---- the API calls ----

function pushUrl(path: string): string {
  return new URL(`push/${path}`, apiBase()).toString();
}

/**
 * Hand a token to the backend. Idempotent by contract — it is called on every
 * app start where permission is already granted, which is what keeps
 * `last_seen_at` an honest count of live installs.
 *
 * The session token rides along when there is one, so a signed-in reader's
 * device is linked to their account. It is optional: a device that never signs
 * in still receives broadcasts, and must, or most of the audience is excluded.
 */
export async function sendTokenToServer(token: string, platform: PushPlatform): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const session = sessionToken();
  if (session) headers["X-Session-Token"] = session;

  const res = await fetch(pushUrl("register/"), {
    method: "POST",
    headers,
    body: JSON.stringify({ token, platform }),
  });
  if (!res.ok) throw new Error(`Token registration failed: ${res.status}`);
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // private mode / storage full — registration still happened server-side
  }
}

/** Tell the backend to stop sending to this device. */
export async function removeTokenFromServer(token: string): Promise<void> {
  await fetch(pushUrl("unregister/"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).catch(() => undefined);
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing to do
  }
}

// ---- web token acquisition ----

/**
 * Register the push service worker.
 *
 * Its own scope, not `/`. The app already has a service worker at `/sw.js`
 * doing the offline shell and saved audio; registering a second one at the
 * same scope would silently replace it and take offline reading down with it.
 * `/firebase-cloud-messaging-push-scope` is the path Firebase's own SDK uses
 * for exactly this reason. A push event is delivered to whichever registration
 * holds the subscription, so the narrow scope costs nothing.
 *
 * The config travels in the query string because a file in `public/` is copied
 * verbatim and never sees `process.env`.
 */
async function pushServiceWorker(config: FirebaseWebConfig): Promise<ServiceWorkerRegistration> {
  const params = new URLSearchParams({
    apiKey: config.apiKey,
    projectId: config.projectId,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  });
  return navigator.serviceWorker.register(`/firebase-messaging-sw.js?${params}`, {
    scope: "/firebase-cloud-messaging-push-scope",
  });
}

/**
 * Wait for *this* registration's worker to be active.
 *
 * Deliberately not `navigator.serviceWorker.ready`, which resolves for the
 * registration whose scope covers the current page — that is `/sw.js`, and in
 * development `/sw.js` is never registered at all. `ready` then simply never
 * settles: not a rejection, no error, just a promise nobody can catch, and an
 * Enable button that spins forever. Our worker lives at its own scope, so it
 * is its own state we have to watch.
 */
function activated(registration: ServiceWorkerRegistration): Promise<void> {
  if (registration.active) return Promise.resolve();
  const worker = registration.installing ?? registration.waiting;
  if (!worker) return Promise.resolve();
  return new Promise((resolve) => {
    const onChange = () => {
      if (worker.state === "activated" || worker.state === "redundant") {
        worker.removeEventListener("statechange", onChange);
        resolve();
      }
    };
    worker.addEventListener("statechange", onChange);
  });
}

/** Never let a hung browser API leave a button spinning with nothing to say. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

/** The FCM registration token for this browser, or null if none can be had. */
async function getWebToken(config: FirebaseWebConfig): Promise<string | null> {
  // Imported here rather than at module scope so the Firebase SDK is fetched
  // only by readers who actually turn notifications on — it is not small, and
  // most sessions never touch it.
  const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported }] = await Promise.all([
    import("firebase/app"),
    import("firebase/messaging"),
  ]);
  if (!(await isSupported())) return null;

  const app = getApps()[0] ?? initializeApp(config);
  const registration = await pushServiceWorker(config);
  // The worker has to be active before it can hold a subscription; a fresh
  // registration is still `installing` when register() resolves.
  await withTimeout(activated(registration), 10_000, "Service worker activation");

  // getToken talks to the browser's push service and to FCM. Both are network
  // calls that can stall — and a stall here is what the reader sees as a
  // button that never comes back.
  return withTimeout(
    getToken(getMessaging(app), {
      vapidKey: config.vapidKey,
      serviceWorkerRegistration: registration,
    }),
    20_000,
    "Getting a push token"
  );
}

export type EnableResult =
  | { ok: true; token: string }
  | { ok: false; reason: "unsupported" | "denied" | "unconfigured" | "failed"; error?: unknown };

// ---- native token acquisition ----

/**
 * The Android/iOS shell's Enable button.
 *
 * Shorter than its web twin because the plugin does the parts that are hard in
 * a browser — there is no service worker to register, no VAPID key, and the
 * OS remembers the permission for us. What is left is the same three steps:
 * ask, get a token, register it.
 */
async function enableNativePush(): Promise<EnableResult> {
  const platform = nativePlatform();
  if (!platform) return { ok: false, reason: "unsupported" };

  const result = await requestNativeToken();
  if (!result.ok) return result;
  try {
    await sendTokenToServer(result.token, platform);
  } catch (error) {
    return { ok: false, reason: "failed", error };
  }
  setOptedOut(false);
  return { ok: true, token: result.token };
}

/**
 * The shell's app-start refresh. Same contract as the web one: silent, asks
 * for nothing, and exists because FCM rotates tokens — on Android after a
 * Play Services update or an app-data clear, on iOS after a restore to a new
 * device — and this is the only moment we would find out.
 */
async function refreshNativeRegistration(): Promise<void> {
  const platform = nativePlatform();
  if (!platform) return;
  const token = await currentNativeToken();
  if (!token) return;
  try {
    await sendTokenToServer(token, platform);
  } catch {
    // Offline at launch. The next start tries again.
  }
}

/**
 * The button's whole job: ask, get a token, register it.
 *
 * MUST be called synchronously from a click handler. `requestPermission()`
 * outside a user gesture is rejected outright by Safari, which is the one
 * browser where this feature is hardest to get working at all.
 */
export async function enablePush(): Promise<EnableResult> {
  // Native first, and before the config check: the shell's Firebase identity
  // comes from google-services.json inside the APK, not from the web env vars,
  // so a shell whose backend is configured must not be turned away because the
  // *web* app's five NEXT_PUBLIC_ values happen to be missing.
  if (isNativePush()) return enableNativePush();

  const config = firebaseConfig();
  if (!config) return { ok: false, reason: "unconfigured" };
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "denied" };

  try {
    const token = await getWebToken(config);
    if (!token) return { ok: false, reason: "unsupported" };
    await sendTokenToServer(token, "web");
    setOptedOut(false);
    return { ok: true, token };
  } catch (error) {
    return { ok: false, reason: "failed", error };
  }
}

/**
 * Every app start, when permission is already granted: fetch the current token
 * and re-register it.
 *
 * Two reasons this is not optional. FCM rotates tokens — after a browser data
 * clear, a long absence, or a push-service reshuffle the old one silently
 * stops working, and this is the only moment we would notice. And a device
 * that our own dead-token cleanup deactivated by mistake comes back here.
 * Silent by design: no permission is requested, so nothing is shown.
 */
export async function refreshPushRegistration(): Promise<void> {
  if (hasOptedOut()) return;
  if (isNativePush()) return refreshNativeRegistration();
  if (permissionState() !== "granted") return;
  const config = firebaseConfig();
  if (!config || !isPushSupported()) return;
  try {
    const token = await getWebToken(config);
    if (token) await sendTokenToServer(token, "web");
  } catch {
    // Offline, or the push service is unreachable. The next app start tries
    // again; there is nothing here worth telling the reader about.
  }
}

/** Turn it off on this device: drop the FCM token, then tell the backend. */
export async function disablePush(): Promise<void> {
  setOptedOut(true);
  const stored = (() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  })();

  if (isNativePush()) {
    await deleteNativeToken();
    if (stored) await removeTokenFromServer(stored);
    return;
  }

  const config = firebaseConfig();
  if (config) {
    try {
      const [{ initializeApp, getApps }, { getMessaging, deleteToken, isSupported }] =
        await Promise.all([import("firebase/app"), import("firebase/messaging")]);
      if (await isSupported()) {
        const app = getApps()[0] ?? initializeApp(config);
        await deleteToken(getMessaging(app));
      }
    } catch {
      // The server-side deactivation below is what actually stops delivery.
    }
  }
  if (stored) await removeTokenFromServer(stored);
}

/** What the last registration handed us, if anything. */
export function storedToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// ---- foreground messages ----

/**
 * A notification that arrived while the app was open.
 *
 * The service worker forwards these instead of showing a system notification —
 * a banner sliding over the OS while the reader is looking at the app is worse
 * than useless, since they are already here.
 */
export interface ForegroundMessage {
  title: string;
  body: string;
  imageUrl?: string;
  clickUrl: string;
}

export function onForegroundMessage(handler: (message: ForegroundMessage) => void): () => void {
  if (!isBrowser() || !("serviceWorker" in navigator)) return () => undefined;

  const listener = (event: MessageEvent) => {
    const data = event.data;
    if (!data || data.type !== "push-message") return;
    handler({
      title: String(data.title ?? ""),
      body: String(data.body ?? ""),
      imageUrl: data.imageUrl || undefined,
      clickUrl: String(data.clickUrl || "/"),
    });
  };
  navigator.serviceWorker.addEventListener("message", listener);
  return () => navigator.serviceWorker.removeEventListener("message", listener);
}
