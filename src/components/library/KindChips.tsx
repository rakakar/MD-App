import { Chip } from "@/components/ui/Segmented";
import { findHref, type FindState } from "@/lib/find";
import type { FileKind } from "@/lib/types";

/** One chip in the row: "All", or a kind — what it shows and the kinds it selects. */
export interface KindChoice {
  key: string;
  label: string;
  count: number;
  /** what the chip writes into the find; undefined for All, which writes none */
  kinds: FileKind[] | undefined;
}

/**
 * **The Type axis, promoted to a row of counted chips** — Media's All · Audios ·
 * Videos, and the Library shelves' All · PDFs · Images (desktop revision, 1 Oct
 * 2026). On these pages it is not one filter among six: what kind of thing the
 * reader wants is the first question, so it stands under the search rather than
 * in the rail.
 *
 * Counts come from the facet, which the endpoint computes ignoring the axis's
 * own selection — so "Images 171" stays honest while PDFs is the one showing.
 * Solid for the chosen chip, since one always is: "All" is a real option here
 * rather than the absence of one.
 *
 * Draws nothing for fewer than two kinds — one option is not a choice.
 */
export function KindChips({
  label,
  choices,
  active,
  state,
  basePath,
}: {
  /** the group's accessible name */
  label: string;
  /** "All" first, then each kind */
  choices: KindChoice[];
  /** the key of the chosen chip */
  active: string;
  state: FindState;
  basePath: string;
}) {
  if (choices.filter((c) => c.key !== "all" && c.count > 0).length < 2) return null;

  return (
    /* Scrolls sideways rather than wrapping. At the largest text size the
       chips and the layout toggle do not fit a phone, and a second row of
       chips would push the first collection down. */
    <div
      role="group"
      aria-label={label}
      className="-my-1 flex min-w-0 flex-1 gap-1 overflow-x-auto py-1 [scrollbar-width:none]"
    >
      {choices.map((c) => (
        <Chip
          key={c.key}
          label={c.label}
          count={c.count}
          selected={active === c.key}
          variant="solid"
          // Links, not state: a filtered shelf that is a real URL can be
          // shared, bookmarked and prerendered.
          href={findHref(basePath, {
            ...state,
            selection: { ...state.selection, kind: c.kinds },
          })}
        />
      ))}
    </div>
  );
}
