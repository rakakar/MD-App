"use client";

import { SwitcherIcon } from "@/components/shell/icons";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { WORKSPACES, WORKSPACE_ORDER } from "@/lib/workspaceConfig";
import { CoachMark } from "./CoachMark";

/**
 * **"Switch workspaces here" — the one mark left after the deck.**
 *
 * The deck could say the app has five workspaces; it could not point at the
 * control, because the control was not on screen. This is the half that has to
 * happen over the live chrome, and it is why it is a coach mark and not a
 * seventh card. The spotlight and card are `CoachMark`'s, which this was the
 * first of.
 */
export function SwitcherHint({ onDone }: { onDone: () => void }) {
  const { workspace } = useWorkspace();

  /** The five, named the way a reader would recognise them on the rows. */
  const others = WORKSPACE_ORDER.filter((id) => id !== workspace.id)
    .map((id) => WORKSPACES[id].name);

  return (
    <CoachMark
      anchor="[data-ws-switcher]"
      icon={<SwitcherIcon className="h-5 w-5" />}
      title="Switch workspaces here"
      onDone={onDone}
    >
      You are in {workspace.name}. Tap this to move between{" "}
      {others.slice(0, -1).join(", ")} and {others[others.length - 1]}{" "}
      — each one remembers where you left off.
    </CoachMark>
  );
}
