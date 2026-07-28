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
}

const WorkspaceContext = createContext<WorkspaceState>({
  workspace: WORKSPACES.originals,
  select: () => {},
  derive: () => {},
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

  const value = useMemo(
    () => ({ workspace: WORKSPACES[active], select, derive }),
    [active, select, derive]
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
