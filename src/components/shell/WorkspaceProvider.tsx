"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { track } from "@/lib/analytics";
import { getPrefs, setPrefs } from "@/lib/storage";
import {
  APP_ACCENT,
  WORKSPACES,
  workspaceForPath,
  type Workspace,
  type WorkspaceId,
} from "@/lib/workspaceConfig";

interface WorkspaceState {
  workspace: Workspace;
  /** explicit dropdown choice (browsing) */
  select: (id: WorkspaceId) => void;
  /** derived from a content page's section (PRD §2 canonical URLs rule) */
  derive: (id: WorkspaceId) => void;
  /**
   * The tab to light on a route that is not itself a tab — see `NavScope`.
   * Carries the path it was declared for, so a stale claim can never outlive
   * the page that made it.
   */
  tab: { path: string; href: string } | null;
  claimTab: (claim: { path: string; href: string }) => void;
}

const WorkspaceContext = createContext<WorkspaceState>({
  workspace: WORKSPACES.originals,
  select: () => {},
  derive: () => {},
  tab: null,
  claimTab: () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // chosen = last explicit dropdown selection (restored per device);
  // derived = content-section override while on a content route.
  const [chosen, setChosen] = useState<WorkspaceId>("originals");
  const [derived, setDerived] = useState<WorkspaceId | null>(null);

  useEffect(() => {
    setChosen(getPrefs().lastWorkspace);
  }, []);

  // route-owned workspaces (translations home, /me, /connect …) always win;
  // content routes (/books/…) fall back to derived-from-section, then chosen.
  const routeWs = workspaceForPath(pathname ?? "/");
  const active: WorkspaceId = routeWs ?? derived ?? chosen;

  // leaving a content route clears the derived override
  useEffect(() => {
    if (routeWs) setDerived(null);
  }, [routeWs, pathname]);

  const select = useCallback(
    (id: WorkspaceId) => {
      if (id !== active) track("workspace_switch", { from: active, to: id });
      setChosen(id);
      setDerived(null);
      setPrefs({ lastWorkspace: id });
    },
    [active]
  );

  const derive = useCallback((id: WorkspaceId) => {
    setDerived(id);
  }, []);

  // A claim is only honoured on the path that made it, so nothing has to be
  // torn down on the way out: the next route either files its own claim or
  // this one stops matching and the bar goes back to reading the URL. Clearing
  // on unmount instead would depend on whether the old page's cleanup runs
  // before or after the new page's effect, which is not a thing to bet a lit
  // tab on.
  const [tab, setTab] = useState<{ path: string; href: string } | null>(null);
  const claimTab = useCallback((claim: { path: string; href: string }) => {
    setTab((prev) =>
      prev && prev.path === claim.path && prev.href === claim.href ? prev : claim
    );
  }, []);

  const value = useMemo(
    () => ({ workspace: WORKSPACES[active], select, derive, tab, claimTab }),
    [active, select, derive, tab, claimTab]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {/* data-ws is what globals.css hangs --ws-ink off: the accent as *text*
          has to be derived here, where the workspace's own colour is in scope */}
      <div
        data-ws={active}
        style={{ "--ws-color": WORKSPACES[active].color } as React.CSSProperties}
        className="min-h-dvh"
      >
        {children}
      </div>
    </WorkspaceContext.Provider>
  );
}

/** Rendered by content pages to derive workspace chrome from their section. */
export function WorkspaceScope({ ws }: { ws: WorkspaceId }) {
  const { derive } = useWorkspace();
  useEffect(() => {
    derive(ws);
  }, [ws, derive]);
  return null;
}

/**
 * "This page belongs under that tab" — for routes no tab's href can match.
 *
 * `/library/<id>` is the case it was built for: one workspace-neutral URL for
 * a tree that four tabs lead into, so the bar had nothing to light and lit
 * nothing. The page knows the answer (the node's workspace, and whether it is
 * a collection of recordings); the nav cannot work it out from the path. This
 * is how the one tells the other.
 */
/**
 * Holds its subtree at the app's own accent, whatever workspace is active.
 *
 * For the screens that belong to no shelf — Settings, My feedback. They used to
 * sit under `/me`, which made them wear My Journey's gold; now that they are
 * global they would otherwise take the colour of whichever workspace the reader
 * came from, so a password field turned green on the way in from Translations
 * and purple from Resources. A screen about the account should look the same
 * every time it is opened.
 *
 * **`data-ws` is what makes this work**, and it has to be here rather than a
 * bare style: `--ws-ink` is declared on `[data-ws]` in globals.css and a custom
 * property substitutes at the element it is declared on, so without a fresh
 * `[data-ws]` the ink would stay frozen at the outer workspace's hue while the
 * fills changed underneath it. The attribute is matched on presence and never
 * on value, so nesting one inside the provider's own costs nothing and the
 * dark-mode and reading-surface rules keep applying.
 *
 * Deliberately *not* `WorkspaceScope`: that would switch the whole app —
 * switcher label, tab bar, the lot — and send a reader leaving Settings into
 * Originals rather than back where they were. Only the colour is pinned; the
 * chrome still names where they will return to.
 */
export function AppAccent({ children }: { children: ReactNode }) {
  return <AccentScope color={APP_ACCENT}>{children}</AccentScope>;
}

/**
 * The same trick as `AppAccent`, for a caller that knows its own colour.
 *
 * **What this is really for is portals.** Anything rendered through
 * `createPortal(…, document.body)` — a sheet, a full-screen layover — lands
 * *outside* the provider's `[data-ws]` wrapper, so `var(--ws-color)` there
 * resolves to the `:root` default rather than to the workspace the reader is
 * actually in. The symptom is quiet and easy to miss: a My Journey overlay
 * paints its buttons in Originals terracotta and simply looks like someone
 * chose the wrong colour.
 *
 * Wrapping the portal's own content puts a workspace back in scope for it.
 * `data-ws` is what does the work — see `AppAccent` for why a bare style is
 * not enough.
 */
export function AccentScope({
  color,
  children,
}: {
  color: string;
  children: ReactNode;
}) {
  return (
    <div data-ws="scope" style={{ "--ws-color": color } as React.CSSProperties}>
      {children}
    </div>
  );
}

export function NavScope({ href }: { href: string }) {
  const { claimTab } = useWorkspace();
  const path = usePathname() ?? "/";
  useEffect(() => {
    claimTab({ path, href });
  }, [claimTab, path, href]);
  return null;
}
