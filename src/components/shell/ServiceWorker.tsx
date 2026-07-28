"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";

/**
 * Service worker registration plus the update handshake.
 *
 * The worker no longer calls skipWaiting() on install, so a new build sits in
 * `waiting` until the reader says go. Without this prompt an installed PWA can
 * sit on a stale build indefinitely — the app is opened from a home-screen
 * icon and may never get a cold start.
 */
export function ServiceWorker() {
  const [waiting, setWaiting] = useState<globalThis.ServiceWorker | null>(null);
  const reloading = useRef(false);

  useEffect(() => {
    const onInstalled = () => track("install_pwa");
    window.addEventListener("appinstalled", onInstalled);

    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
      return () => window.removeEventListener("appinstalled", onInstalled);
    }

    // the new worker took over — bring the page onto it, exactly once
    const onControllerChange = () => {
      if (reloading.current) return;
      reloading.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let cancelled = false;
    void navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (cancelled) return;
        // already waiting when we arrived
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (!next) return;
          next.addEventListener("statechange", () => {
            // a controller already exists → this is an update, not a first install
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              setWaiting(next);
            }
          });
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      window.removeEventListener("appinstalled", onInstalled);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    waiting?.postMessage("SKIP_WAITING");
    setWaiting(null);
  }, [waiting]);

  if (!waiting) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 lg:bottom-6"
    >
      <div className="flex items-center gap-3 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg">
        A new version is ready.
        <button
          type="button"
          onClick={applyUpdate}
          className="font-semibold underline underline-offset-2"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
