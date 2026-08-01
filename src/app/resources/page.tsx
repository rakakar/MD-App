import type { Metadata } from "next";
import Link from "next/link";
import { YouTubeEmbed } from "@/components/av/YouTubeEmbed";
import { TrackList } from "@/components/av/TrackList";
import { ShelfCard } from "@/components/shelf/BookShelf";
import { ChevronRight } from "@/components/shell/icons";
import { EmptyState, PageContainer, SectionHeading, SegmentedNav } from "@/components/ui";
import {
  getAudioTracks,
  getBooks,
  getFolders,
  getResourceDoors,
  getVideos,
} from "@/lib/api";
import type {
  AudioTrack,
  BookSummary,
  Folder,
  ResourceFacet,
  VideoItem,
} from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Resources · संसाधन",
  description:
    "प्रवचन, शिविर सामग्री, संकलन, अध्ययन व शोध, चित्र व चार्ट — purpose-wise.",
};

/**
 * Which format of the shelf is showing (PRD v2 §5.0.1, prompt §9).
 *
 * A section is a shelf, not a treatment: every section may hold every format,
 * so संसाधन holds collections *and* books *and* audio *and* video. The tabs
 * exist for that, and an empty one is never drawn — a tab that opens onto
 * nothing is worse than the absence of the tab.
 */
type Format = "collections" | "books" | "audio" | "video";

const FORMAT_LABEL: Record<Format, string> = {
  collections: "दस्तावेज़",
  books: "पुस्तकें",
  audio: "ऑडियो",
  video: "वीडियो",
};

function isFormat(v: string | undefined): v is Format {
  return v === "collections" || v === "books" || v === "audio" || v === "video";
}

/**
 * The Resources landing page — **6–7 large purpose doors**, in the order the
 * BE gives them (contract §13.1, PRD v2 §5.6.2).
 *
 * Never a folder tree: nobody arrives thinking "which folder is it in", they
 * arrive thinking "अमरकंटक 2005 वाला शिविर सुनना है". The tree still exists,
 * one link down, for the archivist.
 *
 * The door list is never hardcoded — same rule as the genre chips. It is a
 * manager-editable table precisely so a new door appears without a deploy, and
 * doors with nothing published behind them are already dropped by the BE, so
 * whatever arrives is rendered exactly as it arrives.
 */
export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string }>;
}) {
  const { format } = await searchParams;

  const [doors, books, audio, videos, folders] = await Promise.all([
    getResourceDoors().catch(() => [] as ResourceFacet[]),
    getBooks({ workspace: "resources" }).catch(() => [] as BookSummary[]),
    getAudioTracks({ sectionCode: "resources" }).catch(() => [] as AudioTrack[]),
    getVideos("resources").catch(() => [] as VideoItem[]),
    // Only to decide whether "सभी फ़ाइलें" leads anywhere — a fallback that
    // dead-ends in an empty tree is not a fallback.
    getFolders().catch(() => [] as Folder[]),
  ]);

  // दस्तावेज़ is always present, even with no doors behind it yet: the doors
  // *are* this shelf, and a landing page that silently became a book list the
  // day the migration paused would have told the reader the library does not
  // exist. Empty formats are hidden; the shelf itself is not a format.
  const available: Format[] = [
    "collections",
    ...(books.length > 0 ? (["books"] as const) : []),
    ...(audio.length > 0 ? (["audio"] as const) : []),
    ...(videos.length > 0 ? (["video"] as const) : []),
  ];
  const active: Format =
    isFormat(format) && available.includes(format) ? format : "collections";

  return (
    <PageContainer size="shelf">
      <h1 className="font-display text-[26px] font-medium tracking-[-0.015em] lg:text-4xl">
        <span lang="hi" className="hi">संसाधन</span>
      </h1>
      <p lang="hi" className="hi mt-1 text-sm text-ink-soft">
        शिविर सामग्री, संकलन, प्रवचन, शोध पत्र, चित्र व चार्ट — क्या खोज रहे हैं, उससे शुरू करें।
      </p>

      {/* Only drawn when there is a second format to switch to. One tab is not
          a choice, it is a label for the thing already on screen. */}
      {available.length > 1 && (
        <div className="mt-4">
          <SegmentedNav
            label="Format"
            items={available.map((f) => ({
              label: (
                <span lang="hi" className="hi">
                  {FORMAT_LABEL[f]}
                </span>
              ),
              href: f === available[0] ? "/resources" : `/resources?format=${f}`,
              active: f === active,
            }))}
          />
        </div>
      )}

      {active === "collections" && (
        <>
          {doors.length > 0 ? (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {doors.map((d) => (
                <li key={d.code}>
                  <DoorCard door={d} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="संसाधन अभी आ रहे हैं"
                hint="The library is being curated collection by collection; doors appear here as material is published."
              />
            </div>
          )}
        </>
      )}

      {active === "books" && (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((b) => (
            <li key={b.code}>
              <ShelfCard book={b} />
            </li>
          ))}
        </ul>
      )}

      {active === "audio" && (
        <div className="mt-5">
          <TrackList tracks={audio} />
        </div>
      )}

      {active === "video" && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {videos.map((v) => (
            <YouTubeEmbed key={v.id} video={v} />
          ))}
        </div>
      )}

      {/*
        The archivist's way in. Deliberately a quiet link at the foot and never
        the default view: the folder tree is the librarian's structure, and a
        seeker who is shown it first has to learn our filing system before they
        can find anything.
      */}
      {folders.length > 0 && (
        <>
          <SectionHeading tier="title">Archive</SectionHeading>
          <Link
            href="/resources/files"
            className="flex items-center gap-3 rounded-2xl border border-rule bg-white p-4 transition-shadow hover:shadow-md"
          >
            <span className="min-w-0 flex-1">
              <span lang="hi" className="hi block text-[15px] font-medium">
                सभी फ़ाइलें
              </span>
              <span className="mt-0.5 block text-xs text-ink-soft">
                Browse the library the way it is filed — folder by folder.
              </span>
            </span>
            <span aria-hidden className="shrink-0 text-muted">
              <ChevronRight />
            </span>
          </Link>
        </>
      )}
    </PageContainer>
  );
}

/** One purpose door (PRD v2 §5.6.2) — large, labelled in Hindi, counted. */
function DoorCard({ door }: { door: ResourceFacet }) {
  return (
    <Link
      href={`/resources/doors/${encodeURIComponent(door.code)}`}
      className="group flex h-full items-start gap-3 rounded-[18px] border border-rule bg-white p-5 transition-shadow hover:shadow-md"
    >
      <span className="min-w-0 flex-1">
        <span
          lang="hi"
          className="hi block text-[19px] font-semibold leading-snug group-hover:underline"
        >
          {door.name_hi}
        </span>
        {door.description && (
          <span lang="hi" className="hi mt-1 block text-[13px] leading-relaxed text-ink-soft">
            {door.description}
          </span>
        )}
        <span
          lang="hi"
          className="hi mt-2 block text-[11.5px] font-semibold"
          style={{ color: "var(--ws-ink)" }}
        >
          {/* संग्रह, not संकलन: संकलन is one of the three provenance badges,
              and the same word counting the cards would read as "12 verbatim
              compilations" on a door that holds nothing of the sort. */}
          {door.collection_count} संग्रह
        </span>
      </span>
      <span aria-hidden className="mt-1 shrink-0 text-muted">
        <ChevronRight />
      </span>
    </Link>
  );
}
