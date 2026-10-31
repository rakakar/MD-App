/**
 * Runs once in the browser, before hydration.
 *
 * Only one job: tell the app when a router navigation starts, so the shell
 * can show that a tap landed (`components/shell/NavProgress.tsx`). Next calls
 * this for every `<Link>` and `router.push/replace/back`, and not for the
 * reader's own `pushState` between chapters — which is right, since those
 * never wait on the network the same way.
 *
 * An event rather than an import of the component's state: this file runs
 * before React exists, and must stay tiny (Next warns past 16ms).
 */
export function onRouterTransitionStart(url: string, navigationType: "push" | "replace" | "traverse") {
  window.dispatchEvent(new CustomEvent(NAV_START, { detail: { url, navigationType } }));
}

export const NAV_START = "md:nav-start";
