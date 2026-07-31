"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AvatarMenu, EventChip, WorkspaceSwitcher } from "./Header";
import { useWorkspace } from "./WorkspaceProvider";
import { BrandMark, Icon } from "./icons";
import type { NavItem } from "@/lib/workspaceConfig";

function isActive(item: NavItem, pathname: string): boolean {
  const base = item.href.split("?")[0];
  if (base === "/") return pathname === "/";
  if (base === "/me") return pathname === "/me";
  if (base === "/connect") return pathname === "/connect" || pathname.startsWith("/connect/events");
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Mobile bottom nav — per-workspace slots in one flat, evenly-split row.
 *
 * The assistant slot (PRD §7) used to be a raised circular button in the
 * centre. It is an ordinary tab now, last in the row, as the designer draws
 * it: a floating action button says "do a thing here", and this one only ever
 * navigated to another screen like its neighbours — while costing the row its
 * even rhythm and forcing a 1fr–auto–1fr split that put the tabs at odd
 * distances in the three-slot workspaces.
 */
export function BottomNav() {
  const { workspace } = useWorkspace();
  const pathname = usePathname() ?? "/";

  const item = (nav: NavItem) => {
    const active = isActive(nav, pathname);
    return (
      <li key={nav.href} className="flex-1">
        <Link
          href={nav.href}
          aria-current={active ? "page" : undefined}
          className="flex min-h-14 flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2 text-[11.5px] font-medium transition-colors active:bg-black/5"
          style={{ color: active ? "var(--ws-ink)" : "var(--color-ink-soft)" }}
        >
          <Icon name={nav.icon} className="h-6 w-6" strokeWidth={active ? 2.1 : 1.7} />
          <span className="max-w-full truncate">{nav.label}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav
      aria-label={`${workspace.name} navigation`}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex items-stretch">{workspace.nav.map(item)}</ul>
    </nav>
  );
}

/** Desktop ≥1024px: persistent sidebar — selector top, nav, avatar bottom. */
export function Sidebar() {
  const { workspace } = useWorkspace();
  const pathname = usePathname() ?? "/";

  return (
    // 256px, the width every desktop panel in the spec is drawn against
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-rule bg-white lg:flex">
      {/* brand row, then the switcher under its own label (design 10A desktop):
          the pill alone read as a filter on the nav below it rather than as the
          thing that changes what the nav is */}
      <div className="flex items-center gap-2.5 border-b border-rule px-4 py-4">
        <BrandMark className="h-7.5 w-7.5" />
        <span className="text-sm font-semibold tracking-[-0.01em]">MD Study</span>
      </div>
      <div className="flex flex-col gap-1.5 border-b border-rule p-3">
        <p className="px-2 text-[10px] font-bold uppercase tracking-[0.09em] text-ink-soft">
          Workspace
        </p>
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
