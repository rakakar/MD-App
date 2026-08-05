import Link from "next/link";
import { WorkspaceIcon } from "@/components/shell/icons";
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
 * Each tile is a glyph in the workspace's hue plus its name. The glyph is
 * decoration — it is the name that identifies the workspace, so nothing here
 * depends on telling four coloured squares apart.
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
              className="flex h-full flex-col gap-3 rounded-2xl border border-rule bg-card p-3.5 transition-shadow hover:shadow-md"
            >
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-[10px] text-white"
                style={{
                  background: `linear-gradient(150deg, color-mix(in srgb, ${ws.color} 82%, #fff), ${ws.color})`,
                }}
              >
                <WorkspaceIcon id={id} />
              </span>
              <span className="text-sm font-semibold tracking-[-0.01em]">
                {ws.name}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
