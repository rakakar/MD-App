import { SegmentedNav } from "@/components/ui";

export type ConnectSection = "events" | "centers" | "library";

/**
 * The two sections of the Connect workspace.
 *
 * Connect's home stays the upcoming-events feed (PRD §8), and Centres is the
 * directory beside it — that is the whole workspace a reader navigates.
 *
 * **The folder shelf is no longer one of them.** It had a third segment here
 * and a fourth tab in the bottom bar, and both pointed at four folders that
 * are published but empty (केंद्र · कार्यक्रम · संपर्क सूत्र · सहभागिता, all
 * 0 items). Two controls advertising an empty room is worse than not
 * advertising it: a reader who takes the tab learns the app has nothing, and
 * learns it in the one workspace whose job is to tell them where to go.
 *
 * The shelf itself is untouched and still lives at `/connect/library` — links
 * to it work, and `active="library"` is still a valid state so the page can
 * draw this nav as its way back. When there is material in those folders, the
 * segment and the tab both come back; nothing else has to change.
 */
export function ConnectNav({ active }: { active: ConnectSection }) {
  return (
    <SegmentedNav
      label="Connect sections"
      items={[
        { label: "Events", href: "/connect", active: active === "events" },
        { label: "Centres", href: "/connect/centers", active: active === "centers" },
      ]}
    />
  );
}
