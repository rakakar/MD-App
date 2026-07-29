import Link from "next/link";
import { WORKSPACE_ORDER, WORKSPACES, type WorkspaceId } from "@/lib/workspaceConfig";

/**
 * "Explore workspaces" (design 1A, scrolled) — the other four workspaces as
 * tiles, each in its own identity hue.
 *
 * The switcher in the app bar already changes workspace, but it is a menu:
 * nothing on Home says the other four exist until you open it. These tiles are
 * the discovery surface for readers who never touch the switcher, which on a
 * phone is most of them.
 *
 * Each tile carries its hue as a swatch and its Hindi name, never colour
 * alone — the name and description do the work if the hue is invisible.
 */
export function ExploreWorkspaces({ current }: { current: WorkspaceId }) {
  const others = WORKSPACE_ORDER.filter((id) => id !== current);

  return (
    <ul className="grid grid-cols-2 gap-3">
      {others.map((id) => {
        const ws = WORKSPACES[id];
        return (
          <li key={id}>
            <Link
              href={ws.home}
              className="flex h-full items-center gap-3 rounded-2xl border border-rule bg-white p-4 transition-shadow hover:shadow-md"
            >
              <span
                aria-hidden
                className="h-8 w-8 shrink-0 rounded-lg"
                style={{ background: ws.color }}
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{ws.name}</span>
                <span lang="hi" className="hi block truncate text-xs text-ink-soft">
                  {ws.nameHi}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
