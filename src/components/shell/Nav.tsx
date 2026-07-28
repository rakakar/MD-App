"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AvatarMenu, EventChip, WorkspaceSwitcher } from "./Header";
import { useWorkspace } from "./WorkspaceProvider";
import { Icon } from "./icons";
import type { NavItem } from "@/lib/workspaceConfig";

function isActive(item: NavItem, pathname: string): boolean {
  const base = item.href.split("?")[0];
  if (base === "/") return pathname === "/";
  if (base === "/me") return pathname === "/me";
  if (base === "/connect") return pathname === "/connect" || pathname.startsWith("/connect/events");
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Mobile bottom nav — per-workspace slots, centre slot is Search (the
 * assistant stand-in, PRD §7): same position + raised icon treatment in
 * every workspace.
 */
export function BottomNav() {
  const { workspace } = useWorkspace();
  const pathname = usePathname() ?? "/";

  // The search slot is centred in a 1fr–auto–1fr row and the other items are
  // split around it, so it holds the same position whether the workspace has
  // two ordinary items or three — laying them all out in one evenly-spaced row
  // pushed it to the edge in the shorter workspaces.
  const others = workspace.nav.filter((i) => !i.isSearch);
  const searchItem = workspace.nav.find((i) => i.isSearch);
  const left = others.slice(0, Math.ceil(others.length / 2));
  const right = others.slice(Math.ceil(others.length / 2));

  const item = (nav: NavItem) => {
    const active = isActive(nav, pathname);
    return (
      <li key={nav.href} className="flex-1">
        <Link
          href={nav.href}
          aria-current={active ? "page" : undefined}
          className="flex min-h-13 flex-col items-center justify-center gap-0.5 px-1 pb-1.5 pt-2 text-[11px] font-medium transition-colors active:bg-black/5"
          style={{ color: active ? "var(--ws-ink)" : "var(--color-ink-soft)" }}
        >
          <Icon name={nav.icon} className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
          <span className="max-w-full truncate">{nav.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label={`${workspace.name} navigation`}
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1fr_auto_1fr] items-stretch border-t border-rule bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex items-stretch">{left.map(item)}</ul>
      {searchItem ? (
        <Link
          href={searchItem.href}
          aria-label="Search"
          className="-mt-4 mx-2 flex h-13 w-13 items-center justify-center self-start rounded-full text-white shadow-lg transition-transform active:scale-95"
          style={{ background: "var(--ws-color)" }}
        >
          <Icon name="search" className="h-5.5 w-5.5" />
        </Link>
      ) : (
        <span />
      )}
      <ul className="flex items-stretch">{right.map(item)}</ul>
    </nav>
  );
}

/** Desktop ≥1024px: persistent sidebar — selector top, nav, avatar bottom. */
export function Sidebar() {
  const { workspace } = useWorkspace();
  const pathname = usePathname() ?? "/";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-rule bg-white lg:flex">
      <div className="flex flex-col gap-2 border-b border-rule p-3">
        <WorkspaceSwitcher variant="popover" />
        <EventChip />
      </div>
      <nav aria-label={`${workspace.name} navigation`} className="flex-1 p-3">
        <ul className="flex flex-col gap-1">
          {workspace.nav.map((item) => {
            const active = isActive(item, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "text-white" : "text-ink hover:bg-black/5"
                  }`}
                  style={active ? { background: "var(--ws-color)" } : undefined}
                >
                  <Icon name={item.icon} className="h-4.5 w-4.5" />
                  {item.label}
                  {item.isSearch && (
                    <kbd className="ml-auto rounded border border-rule px-1.5 py-0.5 text-[10px] text-ink-soft">
                      ⌘K
                    </kbd>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-rule p-3">
        <AvatarMenu />
      </div>
    </aside>
  );
}
