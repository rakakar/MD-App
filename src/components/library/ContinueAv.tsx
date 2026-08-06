"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AV_KINDS, AV_PAGE } from "@/components/library/AvShelf";
import { formatDuration } from "@/components/library/format";
import { usePlayer } from "@/components/player/PlayerProvider";
import { HeadphonesIcon, PlayIcon, VideoIcon } from "@/components/shell/icons";
import { findLibrary } from "@/lib/api";
import { getProgress } from "@/lib/me";
import { itemIdFromResumeKey, syncPersonal } from "@/lib/personal";
import { contentLang } from "@/lib/script";
import { getPlayheads } from "@/lib/storage";
import type { FileKind, LibraryFile } from "@/lib/types";

/**
 * Under this, nobody left off — they tapped the wrong row, or changed their
 * mind in the first breath. The album player applies the same floor to the
 * "Resume" it offers per track.
 */
const MIN_RESUME_MS = 5_000;

/** How near the end counts as finished; resuming here is worse than not. */
const DONE_TAIL_MS = 15_000;

interface ResumeRow {
  itemId: number;
  kind: "audio" | "video";
  title: string;
  /** the folder it lives in — a file called "भाग 3" names nothing alone */
  subtitle: string;
  positionMs: number;
  durationMs: number | null;
  updatedAt: string;
  /** the folder page, where it plays; null when nothing has said where */
  nodeId: number | null;
  /** present only for a file this page already fetched — then it plays in place */
  file: LibraryFile | null;
}

/**
 * **Continue listening / Continue watching.**
 *
 * The two rows the whole progress-wiring exists for: a ninety-minute shivir is
 * not finished in one sitting, and until now the only way back into the middle
 * of one was to remember which part you were on and scroll to it.
 *
 * **Drawn from the device first, in both states**, exactly as `ContinueReading`
 * is — the playheads are already in localStorage, so the row is on screen in
 * the first paint rather than after a round trip, and it survives being
 * offline. Signing in adds a sync that folds in what was played elsewhere; it
 * does not change where this reads from.
 *
 * A playhead knows seconds and nothing else, so the naming comes from two
 * places. For a file this page already fetched — which is most of them, the
 * shelf being one request — it is joined locally and costs nothing. For
 * anything else (played on another device, or beyond this page) the account's
 * own rows carry the title, the folder and the length, which is exactly what
 * they were given for.
 *
 * When neither can — a signed-out reader on the Video segment who was part-way
 * through a recording, or this row on a page that fetched nothing at all — the
 * library itself is asked, once, for the same A/V list `/av` is built from.
 * That request is the reason this component works anywhere rather than only
 * where the files happen to be on screen, and it is skipped entirely whenever
 * the page or the account has already answered.
 *
 * Audio the page holds **plays where it stands**, through the app's one player,
 * because that is the whole gesture: tap the card, hear the next word. Anything
 * else opens its folder, where the same playhead is waiting — including every
 * video, which plays in its own embed rather than through the audio player.
 */
export function ContinueAv({
  sources,
  limit = 4,
}: {
  /**
   * The page's collections — every A/V file on screen, still under the folder
   * it came from. Both halves are needed to name a playhead: the file for its
   * title and length, the folder for the line above it, since "भाग 3" on its
   * own says nothing about which shivir it is part three of.
   */
  sources: { name: string; files: LibraryFile[] }[];
  limit?: number;
}) {
  const { user, loading } = useAuth();
  const player = usePlayer();
  const [rows, setRows] = useState<ResumeRow[]>([]);

  const onPage = useMemo(
    () =>
      new Map(
        sources.flatMap((source) =>
          source.files.map((file) => [file.id, { file, folder: source.name }] as const)
        )
      ),
    [sources]
  );

  const render = useCallback(
    async (withAccount: boolean) => {
      const heads = getPlayheads();
      if (heads.length === 0) {
        setRows([]);
        return;
      }

      const wanted = heads
        .map((head) => itemIdFromResumeKey(head.key))
        .filter((id): id is number => id !== null);
      if (wanted.length === 0) {
        setRows([]);
        return;
      }

      // What the account can name that this page cannot. Only asked for when
      // there is a playhead the page could not place — a reader whose listening
      // is all on this shelf never pays for the call.
      const missing = (ids: number[], have: (id: number) => boolean) =>
        ids.filter((id) => !have(id));

      const remote =
        withAccount && missing(wanted, (id) => onPage.has(id)).length > 0
          ? await getProgress().catch(() => [])
          : [];
      const named = new Map(
        remote
          .map((p) => [Number(/^item:(\d+)$/.exec(String(p.target ?? ""))?.[1]), p] as const)
          .filter(([id]) => Number.isSafeInteger(id) && id > 0)
      );

      // Last resort, and the thing that lets this row live on a page holding no
      // files at all: the library's own A/V list, which is one request and the
      // very same one `/av` is built from — so it is usually already cached.
      const fetched = new Map<number, { file: LibraryFile; folder: string }>();
      const stillUnnamed = missing(
        wanted,
        (id) => onPage.has(id) || named.has(id)
      );
      if (stillUnnamed.length > 0) {
        const found = await findLibrary({
          workspace: "originals",
          state: { q: "", raw: false, selection: { kind: [...AV_KINDS] } },
          limit: AV_PAGE,
        }).catch(() => null);
        for (const row of found?.results ?? []) {
          if (row.type !== "file") continue;
          // A file's breadcrumb ends with its own folder, which is the line the
          // card wants above the title.
          const { breadcrumb, ...file } = row;
          fetched.set(row.id, { file, folder: breadcrumb.at(-1)?.name ?? "" });
        }
      }

      const built: ResumeRow[] = [];
      for (const head of heads) {
        const itemId = itemIdFromResumeKey(head.key);
        if (itemId === null) continue;

        const here = onPage.get(itemId) ?? fetched.get(itemId);
        const file = here?.file ?? null;
        const meta = named.get(itemId);
        const kind = (file?.kind ?? meta?.kind) as FileKind | undefined;
        // Only the two this row is about. A playhead on anything else is not a
        // bug — nothing else writes one — but the guard is what keeps this
        // honest if something ever does.
        if (kind !== "audio" && kind !== "video") continue;

        const title = file?.title ?? meta?.title ?? "";
        if (!title) continue; // unnamed by both — a card with no name is not a card

        const durationSeconds = file?.duration_seconds ?? meta?.duration_seconds ?? null;
        const durationMs = durationSeconds ? durationSeconds * 1000 : null;
        if (head.position_ms < MIN_RESUME_MS) continue;
        if (durationMs !== null && head.position_ms >= durationMs - DONE_TAIL_MS) continue;

        built.push({
          itemId,
          kind,
          title,
          subtitle: here?.folder ?? meta?.subtitle ?? "",
          positionMs: head.position_ms,
          durationMs,
          updatedAt: head.updated_at,
          nodeId: file?.node ?? meta?.node ?? null,
          file,
        });
      }

      setRows(built.slice(0, limit));
    },
    [onPage, limit]
  );

  useEffect(() => {
    if (loading) return;
    void render(Boolean(user));
    // The pull is what brings another device's listening down into the local
    // playheads; re-rendering after it is what puts it on screen.
    if (user) void syncPersonal().then(() => render(true));
  }, [user, loading, render]);

  if (rows.length === 0) return null;

  // The verb names what the reader was actually doing. A rail of nothing but
  // recordings says "listening"; anything with a video in it says "watching",
  // which is the phrase every player has taught them and which no listener
  // reads as wrong.
  const heading = rows.every((row) => row.kind === "audio")
    ? "Continue listening"
    : "Continue watching";

  const play = (row: ResumeRow) => {
    if (!row.file) return;
    player.playTrack(
      {
        id: `library-file:${row.itemId}`,
        title: row.title,
        subtitle: row.subtitle || undefined,
        url: row.file.url,
        durationMs: row.durationMs ?? undefined,
        coverImage: row.file.thumbnail_url ?? null,
        resumeKey: `library-file:${row.itemId}`,
      },
      { startMs: row.positionMs }
    );
  };

  return (
    <section aria-label={heading} className="mt-5">
      <h2 className="mb-2.5 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
        {heading}
      </h2>
      {/* A bleeding, snapping rail — the card wanted is nearly always the first,
          and stacking four of them would push the collections a reader came for
          off the bottom of a phone. The second card peeking is what says there
          are more without a control saying it. */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0">
        {rows.map((row) => (
          <li key={row.itemId} className="w-[15.5rem] shrink-0 snap-start sm:w-[19rem]">
            <ResumeCard row={row} onPlay={row.kind === "audio" && row.file ? play : null} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResumeCard({
  row,
  onPlay,
}: {
  row: ResumeRow;
  /** null when this card navigates instead of playing */
  onPlay: ((row: ResumeRow) => void) | null;
}) {
  const percent =
    row.durationMs && row.durationMs > 0
      ? Math.min(100, (row.positionMs / row.durationMs) * 100)
      : null;
  const left =
    row.durationMs && row.durationMs > row.positionMs
      ? formatDuration(Math.round((row.durationMs - row.positionMs) / 1000))
      : "";

  const body = (
    <>
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
        style={{
          background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
          color: "var(--ws-ink)",
        }}
        aria-hidden
      >
        {row.kind === "audio" ? (
          <HeadphonesIcon className="h-5 w-5" />
        ) : (
          <VideoIcon className="h-5 w-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        {row.subtitle && (
          <span
            {...contentLang(row.subtitle)}
            className={`${contentLang(row.subtitle).className} block truncate text-xs font-semibold text-ink-soft`}
          >
            {row.subtitle}
          </span>
        )}
        <span
          {...contentLang(row.title)}
          className={`${contentLang(row.title).className} block truncate text-sm font-semibold leading-snug`}
        >
          {row.title}
        </span>
        {percent !== null ? (
          <>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-canvas">
              <span
                role="progressbar"
                aria-valuenow={Math.round(percent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${Math.round(percent)}% ${
                  row.kind === "audio" ? "played" : "watched"
                }`}
                className="block h-full rounded-full"
                style={{
                  width: `${Math.round(percent)}%`,
                  background:
                    "linear-gradient(90deg, var(--color-accent), var(--ws-color))",
                }}
              />
            </span>
            <span className="mt-1.5 block text-xs font-medium text-ink-soft">
              {left ? `${left} left` : "Almost done"}
            </span>
          </>
        ) : (
          <span
            className="mt-2 block text-xs font-semibold"
            style={{ color: "var(--ws-ink)" }}
          >
            {onPlay ? "Resume" : "Open"} →
          </span>
        )}
      </span>
      {onPlay && (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full text-white"
          style={{ background: "var(--ws-color)" }}
          aria-hidden
        >
          <PlayIcon className="h-3.5 w-3.5" />
        </span>
      )}
    </>
  );

  const shell =
    "flex h-full w-full items-start gap-3 rounded-[20px] border border-rule bg-card p-3.5 text-left transition-shadow hover:shadow-md";

  // Audio this page holds plays in place; everything else opens the folder it
  // lives in, where the same playhead is waiting. A row that can do neither —
  // no file and no folder — is not drawn at all rather than rendered dead.
  if (onPlay) {
    return (
      <button
        type="button"
        onClick={() => onPlay(row)}
        className={shell}
        aria-label={`Resume ${row.title}`}
      >
        {body}
      </button>
    );
  }
  if (row.nodeId === null) return null;
  return (
    <Link href={`/library/${row.nodeId}`} className={shell}>
      {body}
    </Link>
  );
}
