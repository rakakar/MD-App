import type { Metadata } from "next";
import { AV_KINDS, AV_PAGE, AvShelf } from "@/components/library/AvShelf";
import { WorkspaceScope } from "@/components/shell/WorkspaceProvider";
import { PageContainer } from "@/components/ui";
import { findLibrary, getTopics } from "@/lib/api";
import { lockAxis, readFind } from "@/lib/find";
import { shelfMap } from "@/lib/library";
import type { LibraryFindResponse, Topic } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Audio/Video · Originals",
  description:
    "A. Nagraj ji's recorded discourses, satsangs and shivir sessions — every recording in Originals, in one place.",
};

/**
 * **Audio/Video — Originals' door onto its own recordings.**
 *
 * The workspace holds some forty hours of his voice, and until now it sat two
 * taps below a tile grid on a shelf whose largest collection by count is
 * photographs. This is that material addressed directly.
 *
 * It is a door and not a room, and the difference is the whole design: no
 * folder was moved, no field was added, nothing here owns a file. The page is
 * `workspace=originals` + `kind=audio|video` over the same tree the Library tab
 * browses. That is what lets it stay right without anyone maintaining it — a
 * folder holding a recording, its transcript and its photographs appears here
 * for the recording and on the Library shelf for the rest, and nobody files it
 * twice.
 *
 * Scoped to Originals because that is where the recordings are, and because
 * this is an Originals tab. The scope is the one line to change if another
 * workspace ever holds them.
 */
export default async function AvPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // The Type axis is this page rather than a filter on it, so it is read from
  // the URL and then clamped to what the page can honestly show.
  const state = lockAxis(readFind(params), "kind", AV_KINDS);
  const offset = pageOffset(params.offset);

  const [find, topics, shelves] = await Promise.all([
    findLibrary({ workspace: "originals", state, limit: AV_PAGE, offset }).catch(
      () => null
    ),
    getTopics().catch(() => [] as Topic[]),
    shelfMap(),
  ]);

  // A find that failed is the page failing — unlike a shelf, which drops back
  // to its browse, there is nothing else here to draw. An empty envelope keeps
  // the controls and the explanation on screen instead of a crash.
  const found: LibraryFindResponse = find ?? {
    q: state.q,
    searched_as: "",
    scope: { workspace: "originals", under: null },
    count: 0,
    results: [],
    facets: {},
    rollup: {},
  };

  return (
    <PageContainer size="shelf">
      <WorkspaceScope ws="originals" />
      {/* No "Originals" eyebrow. The workspace is named in the app bar at the
          top of the screen and again in the switcher inside it, and a third
          naming above the title was answering a question the reader had not
          asked on the way to a page they chose from the tab bar. */}
      <h1 className="font-display text-[1.625rem] font-medium leading-tight tracking-[-0.015em] lg:text-4xl">
        Audio/Video
      </h1>
      <p className="mt-0.5 text-sm text-ink-soft">
        Discourses, satsangs and shivir sessions of Shri A. Nagraj.
      </p>

      <AvShelf
        find={found}
        state={state}
        topics={topics}
        shelves={shelves}
        basePath="/av"
        offset={offset}
      />
    </PageContainer>
  );
}

/** `?offset=` as a whole page boundary, or 0 for anything that is not one */
function pageOffset(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isSafeInteger(value) || value <= 0) return 0;
  return Math.floor(value / AV_PAGE) * AV_PAGE;
}
