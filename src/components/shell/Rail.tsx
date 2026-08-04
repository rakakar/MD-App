"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/**
 * The left rail's **per-route slot** — where a page hangs its own controls
 * under the global nav (designer, "Desktop UI").
 *
 * The rail is app chrome: it is mounted once by {@link AppShell}, above the
 * router, and it survives navigation. A page's facets are the opposite — they
 * belong to one route and are fetched by it on the server. So the two have to
 * meet somewhere, and a portal is the only join that lets the *page* own the
 * markup while the *shell* owns the position.
 *
 * A context alone would not do: the shelf is a Server Component, and pushing
 * rendered output *up* into a client provider means an effect, a state write
 * and a render of the whole shell on every navigation. Here the children are
 * server-rendered exactly where they are written and only the DOM node they
 * land in is different.
 *
 * **The host is a piece of DOM, not a piece of state.** `RailSlot` renders
 * nothing until the sidebar has mounted and handed its element over, which is
 * why the rail is empty on the server and fills in at hydration. That is not a
 * loss: the same facets are also in the document in the main column (see
 * `WorkspaceShelf`), so no link is missing from the HTML — it is the *desktop
 * placement* that needs the client, and desktop is where JavaScript is least in
 * doubt.
 */
const RailHostContext = createContext<{
  host: HTMLElement | null;
  setHost: (el: HTMLElement | null) => void;
}>({ host: null, setHost: () => {} });

export function RailProvider({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const value = useMemo(() => ({ host, setHost }), [host]);
  return <RailHostContext.Provider value={value}>{children}</RailHostContext.Provider>;
}

/**
 * The empty container the sidebar draws for whatever the route sends it.
 *
 * `empty:hidden` is what keeps every other route honest: `/books`,
 * `/library/[id]`, `/search`, `/translations` and `/connect` send nothing, and
 * an untouched slot then has no border, no padding and no height — the rail
 * looks exactly as it did before this existed. A portal's children are real DOM
 * children, so the moment a shelf fills the slot the `:empty` match is lost and
 * the rule and spacing appear with it.
 */
export function RailHost() {
  const { setHost } = useContext(RailHostContext);
  return (
    <div
      ref={setHost}
      className="border-t border-rule px-3 py-4 empty:hidden empty:border-0 empty:p-0"
    />
  );
}

/**
 * Send this route's controls to the rail.
 *
 * Renders `null` where it is written — the children appear only in the rail, or
 * not at all. Below `lg` the rail itself is `display:none`, so a page that also
 * draws these controls in its main column on a phone must hide *that* copy at
 * `lg` rather than gate this one: CSS decides the breakpoint, and no JavaScript
 * has to know what the breakpoint is.
 */
export function RailSlot({ children }: { children: ReactNode }) {
  const { host } = useContext(RailHostContext);
  if (!host) return null;
  return createPortal(children, host);
}
