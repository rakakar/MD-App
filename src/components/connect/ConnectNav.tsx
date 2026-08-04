import { SegmentedNav } from "@/components/ui";
import { getWorkspaces } from "@/lib/api";

export type ConnectSection = "events" | "centers" | "library";

/**
 * The three sections of the Connect workspace.
 *
 * Connect's home stays the upcoming-events feed (PRD §8), so the shelf is a
 * third segment here rather than a set of doors on the home page the way
 * `/resources` opens — Resources *is* its shelf, Connect is a feed that also
 * has one.
 *
 * The Library segment is drawn only when the shelf's root is published: a tab
 * onto a 404 is worse than a tab fewer. `root_node_id` is the flag for that
 * (contract §10.1) — it is null while the root is unpublished.
 */
export async function ConnectNav({ active }: { active: ConnectSection }) {
  const workspaces = await getWorkspaces().catch(() => []);
  const hasShelf = workspaces.find((w) => w.code === "connect")?.root_node_id != null;

  return (
    <SegmentedNav
      label="Connect sections"
      items={[
        { label: "Events", href: "/connect", active: active === "events" },
        { label: "Centres", href: "/connect/centers", active: active === "centers" },
        ...(hasShelf
          ? [
              {
                label: (
                  <span lang="hi" className="hi">
                    Library
                  </span>
                ),
                href: "/connect/library",
                active: active === "library",
              },
            ]
          : []),
      ]}
    />
  );
}
