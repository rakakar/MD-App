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
    // Rows rather than a two-up grid, as the finished comps draw them. The
    // grid fitted four names and nothing else; a row has space for the line
    // that says what is actually behind the name — which is the difference
    // between a reader guessing what "Resources" holds and knowing.
    <ul className="flex flex-col gap-2.5">
      {others.map((id) => {
        const ws = WORKSPACES[id];
        return (
          <li key={id}>
            <Link
              href={ws.home}
              className="flex items-center gap-3.5 rounded-card border border-rule bg-card p-3.5 shadow-card transition-shadow hover:shadow-raised"
            >
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-tile text-white"
                style={{
                  background: `linear-gradient(150deg, color-mix(in srgb, ${ws.color} 82%, #fff), ${ws.color})`,
                }}
              >
                <WorkspaceIcon id={id} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[1.0625rem] font-semibold leading-tight tracking-[-0.01em]">
                  {ws.name}
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-ink-soft">
                  {ws.tagline}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
