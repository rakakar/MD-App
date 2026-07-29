"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { citationText, refToHref } from "@/lib/refs";
import { ACTIVE_SUTRA_SOURCE } from "@/lib/sutra";
import type { SutraOfTheDay } from "@/lib/types";

/**
 * Sutra of the day — verse gets typographic ceremony (PRD §5 verse styling).
 *
 * The arrows walk the curated sequence (contract §2.6) rather than shuffling:
 * ← then → has to land back where it started, or the arrows are lying. The
 * card always *opens* on today's pick — the server renders offset 0 — so
 * however far a reader browsed yesterday, today's verse is the same one
 * everyone else sees.
 */
/** "2026-07-29" → "२९ जुलाई". Returns "" on anything unparseable. */
function hindiDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("hi-IN", { day: "numeric", month: "long" }).format(d);
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
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rule " +
    "text-ink-soft transition hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <figure
      className="rounded-2xl border border-rule px-6 py-8 text-center shadow-sm"
      style={{
        borderTopColor: "var(--ws-color)",
        borderTopWidth: 3,
        // The hero is the one tinted surface on Home (design 1A) — a wash of
        // the workspace hue over paper, so the सूत्र reads as the day's
        // ceremony rather than as the first of several white cards.
        background:
          "linear-gradient(180deg, color-mix(in srgb, var(--ws-color) 7%, #fff) 0%, #fff 60%)",
      }}
    >
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => go(sutra.offset - 1)}
          disabled={!sutra.has_prev || busy}
          aria-label="पिछला सूत्र"
          className={arrow}
        >
          ←
        </button>
        <p className="text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: "var(--ws-ink)" }}>
          <span lang="hi" className="hi">{browsing ? "सूत्र" : "आज का सूत्र"}</span>
        </p>
        <button
          type="button"
          onClick={() => go(sutra.offset + 1)}
          disabled={!sutra.has_next || busy}
          aria-label="अगला सूत्र"
          className={arrow}
        >
          →
        </button>
      </div>
      {/* The date comes from the payload, not a client clock: the pick belongs
          to an IST date, and a device in another timezone must not relabel it. */}
      <p lang="hi" className="hi mt-1 text-xs text-ink-soft">
        {hindiDate(sutra.sutra_date)}
      </p>

      <div aria-live="polite" className={busy ? "opacity-50 transition-opacity" : "transition-opacity"}>
        <blockquote lang="hi" className="hi mx-auto mt-4 max-w-xl text-xl leading-loose">
          {sutra.text_hi}
        </blockquote>
        <figcaption className="mt-4 text-xs text-ink-soft">
          <Link href={refToHref(sutra.canonical_ref)} className="underline-offset-2 hover:underline">
            <span lang="hi" className="hi">{sutra.book_title}</span> · {sutra.canonical_ref}
          </Link>
          <button
            type="button"
            onClick={share}
            className="ml-3 rounded-full border border-rule px-2.5 py-0.5 text-xs font-medium hover:bg-black/5"
          >
            Share
          </button>
          {browsing && (
            <button
              type="button"
              onClick={() => go(0)}
              disabled={busy}
              className="ml-2 rounded-full border border-rule px-2.5 py-0.5 text-xs font-medium hover:bg-black/5"
            >
              आज का सूत्र
            </button>
          )}
        </figcaption>
      </div>
    </figure>
  );
}
