"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookmarkIcon, ChevronDown, ShareIcon, SunIcon } from "@/components/shell/icons";
import { track } from "@/lib/analytics";
import { SUTRA } from "@/lib/labels";
import { citationText, refToHref } from "@/lib/refs";
import { ACTIVE_SUTRA_SOURCE } from "@/lib/sutra";
import type { SutraOfTheDay } from "@/lib/types";

/**
 * Sutra of the day (design 1A) — the one tinted surface on Home, so the verse
 * reads as the day's ceremony rather than as the first of several white cards.
 *
 * The arrows walk the curated sequence (contract §2.6) rather than shuffling:
 * ← then → has to land back where it started, or the arrows are lying. The
 * card always *opens* on today's pick — the server renders offset 0 — so
 * however far a reader browsed yesterday, today's verse is the same one
 * everyone else sees. The spec draws no arrows; they live as small chevrons in
 * the label row so browsing stays available without competing with Share,
 * which is the action the design puts its weight behind.
 */
/** "2026-07-29" → "29 July". Returns "" on anything unparseable. */
function sutraDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long" }).format(d);
}

export function SutraCard({ sutra: initial }: { sutra: SutraOfTheDay }) {
  const [sutra, setSutra] = useState(initial);
  const [busy, setBusy] = useState(false);
  const browsing = sutra.offset !== 0;

  useEffect(() => {
    track("sutra_view");
  }, []);

  const go = async (offset: number) => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await ACTIVE_SUTRA_SOURCE.getAt(offset);
      // null = walked off the end; keep the verse on screen rather than blank it
      if (next) {
        setSutra(next);
        track("sutra_browse", { offset });
      }
    } catch {
      // network hiccup — leave the current verse up, arrows stay usable
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const text = citationText(sutra.text_hi, sutra.canonical_ref);
    track("sutra_share");
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // user cancelled share sheet
    }
  };

  const arrow =
    "flex h-7 w-7 items-center justify-center rounded-full text-(--sutra-soft) transition " +
    "hover:bg-(--sutra-chip) disabled:opacity-25 disabled:hover:bg-transparent";

  return (
    <figure
      className="rounded-3xl p-5"
      style={{
        // the spec's own peach ramp (1A) — a warm surface of its own rather
        // than a wash of the workspace hue, because the sutra belongs to the
        // day, not to whichever workspace the reader happens to be in
        background: "var(--sutra-bg)",
      }}
    >
      <div className="flex items-center gap-2">
        <span aria-hidden style={{ color: "var(--color-accent-deep)" }}>
          <SunIcon />
        </span>
        <figcaption
          className="text-xs font-bold uppercase tracking-[0.09em]"
          style={{ color: "var(--color-accent-deep)" }}
        >
          {browsing ? SUTRA : `${SUTRA} of the day`}
        </figcaption>

        <span className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => go(sutra.offset - 1)}
            disabled={!sutra.has_prev || busy}
            aria-label={`Previous ${SUTRA}`}
            className={arrow}
          >
            <ChevronDown className="h-4 w-4 rotate-90" />
          </button>
          <span className="text-xs font-semibold text-[#B08968]">
            {sutraDate(sutra.sutra_date)}
          </span>
          <button
            type="button"
            onClick={() => go(sutra.offset + 1)}
            disabled={!sutra.has_next || busy}
            aria-label={`Next ${SUTRA}`}
            className={arrow}
          >
            <ChevronDown className="h-4 w-4 -rotate-90" />
          </button>
        </span>
      </div>

      <div aria-live="polite" className={busy ? "opacity-50 transition-opacity" : "transition-opacity"}>
        {/* On desktop the verse grows but the measure is capped at the spec's
            46ch (1A desktop). Across a 1088px page an uncapped line of
            Devanagari is unreadable however large the type is. */}
        <blockquote
          lang="hi"
          className="hi mt-3 max-w-[46ch] text-[1.1875rem] leading-[1.75] text-(--sutra-ink) lg:text-2xl"
        >
          {sutra.text_hi}
        </blockquote>

        <div
          aria-hidden
          className="my-4 h-px"
          style={{ background: "var(--sutra-rule)" }}
        />

        <div className="flex items-center gap-3">
          <Link
            href={refToHref(sutra.canonical_ref)}
            className="min-w-0 flex-1 text-xs font-medium text-(--sutra-soft) underline-offset-2 hover:underline"
          >
            <span lang="hi" className="hi">{sutra.book_title}</span> · {sutra.canonical_ref}
          </Link>

          {browsing ? (
            <button
              type="button"
              onClick={() => go(0)}
              disabled={busy}
              className="flex h-9 items-center rounded-xl bg-(--sutra-chip) px-3 text-xs font-semibold text-(--sutra-soft) transition hover:brightness-105"
            >
              {`${SUTRA} of the day`}
            </button>
          ) : (
            <Link
              href="/me/bookmarks"
              aria-label="Saved"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--sutra-chip) text-(--sutra-soft) transition hover:brightness-105"
            >
              <BookmarkIcon className="h-4 w-4" />
            </Link>
          )}

          <button
            type="button"
            onClick={share}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--color-accent)" }}
          >
            <ShareIcon className="h-3.5 w-3.5" />
            Share
          </button>
        </div>
      </div>
    </figure>
  );
}
