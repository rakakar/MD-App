"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ShareIcon, SunIcon } from "@/components/shell/icons";
import { ShareSutraSheet } from "./ShareSutraSheet";
import { FormattedText } from "@/components/reader/blocks";
import { ctaPrimaryCompact } from "@/components/ui";
import { track } from "@/lib/analytics";
import { setPrefs } from "@/lib/storage";
import { dayMonth, parseDay } from "@/lib/dates";
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
/** "2026-07-29" → "29 Jul". Returns "" on anything unparseable. */
function sutraDate(iso: string): string {
  const d = parseDay(iso);
  return d ? dayMonth(d) : "";
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

  /**
   * Share opens a sheet now rather than going straight to the OS.
   *
   * It used to hand the system `citationText` — the verse and its reference as
   * a line of text. What actually gets forwarded is a picture: the sheet draws
   * the card, shows it, and lets the reader choose where it goes. The text path
   * survives inside the sheet as the fallback for a browser that cannot share
   * files.
   */
  const [sharing, setSharing] = useState(false);

  /**
   * **Hide / Show** — the designer's mock, 26 Sep 2026. Folded, the card keeps
   * its label row and the verse's first line, ending in an ellipsis; the rule,
   * the book and Share go.
   *
   * The resting state is `data-sutra-collapsed` on <html>, not this state:
   * the pre-hydration script paints it from prefs, so a folded card never
   * opens and snaps shut on load. This mirror exists for `aria-expanded`, and
   * starts open to match what the server rendered.
   *
   * The fold is measured, not transitioned. Height to and from `auto` is
   * something CSS can only animate in Chromium, and iOS is where this is read.
   * Both heights are taken with the page in its real end state, then the body
   * is tweened between them with the Web Animations API while it clips — so
   * the verse's lower lines slide under the edge rather than vanishing, and
   * everything below the card rides up with it.
   */
  const [collapsed, setCollapsed] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const more = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setCollapsed(document.documentElement.hasAttribute("data-sutra-collapsed"));
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = !collapsed;
    const rest = () => {
      if (next) root.setAttribute("data-sutra-collapsed", "1");
      else root.removeAttribute("data-sutra-collapsed");
    };
    setCollapsed(next);
    setPrefs({ sutraCollapsed: next });
    track("sutra_fold", { state: next ? "hidden" : "shown" });

    const el = body.current;
    const foot = more.current;
    if (!el || !foot || !el.animate || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      rest();
      return;
    }

    // From wherever it is now — mid-fold, if the reader pressed twice.
    const from = el.getBoundingClientRect().height;
    el.getAnimations().forEach((a) => a.cancel());
    foot.getAnimations().forEach((a) => a.cancel());

    // Where it ends: put the page in its end state and read the height.
    rest();
    el.style.height = "";
    const to = el.getBoundingClientRect().height;
    // Folding, the verse and the footer stay laid out until the edge has
    // passed them; the clamp and the `display: none` land when it finishes.
    if (next) root.removeAttribute("data-sutra-collapsed");

    el.style.overflow = "hidden";
    const fold = el.animate([{ height: `${from}px` }, { height: `${to}px` }], {
      duration: 420,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)",
    });
    foot.animate(
      next ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 1 }],
      next
        ? { duration: 200, easing: "ease-out", fill: "forwards" }
        : { duration: 260, delay: 140, easing: "ease-out", fill: "backwards" }
    );
    fold.onfinish = () => {
      rest();
      el.style.overflow = "";
      foot.getAnimations().forEach((a) => a.cancel());
    };
  };

  // 44px targets (design-system.md), laid out smaller: the negative margins
  // keep the label row the height of its text, and let neighbouring hit areas
  // overlap sideways so the arrows, date and Hide fit a phone's row in one line.
  const arrow =
    "-mx-3 -my-2 flex h-11 w-11 items-center justify-center rounded-full text-(--sutra-soft) transition " +
    "hover:bg-(--sutra-chip) disabled:opacity-25 disabled:hover:bg-transparent";

  return (
    <figure
      // The hairline is in the comp and was not in the code. It matters most
      // in the theme the comp is not drawn in: on the sepia paper the peach
      // ramp sits close enough to the page that without an edge the card stops
      // being a card.
      className="rounded-card border border-(--sutra-border) p-4"
      style={{
        // the spec's own peach ramp (1A) — a warm surface of its own rather
        // than a wash of the workspace hue, because the sutra belongs to the
        // day, not to whichever workspace the reader happens to be in
        background: "var(--sutra-bg)",
      }}
    >
      <div className="flex items-center gap-1">
        <span aria-hidden className="me-0.5" style={{ color: "var(--color-accent-deep)" }}>
          <SunIcon />
        </span>
        <figcaption
          className="min-w-0 truncate text-xs font-bold uppercase tracking-[0.09em]"
          style={{ color: "var(--color-accent-deep)" }}
        >
          {browsing ? SUTRA : `${SUTRA} of the day`}
        </figcaption>

        <span className="ml-auto flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => go(sutra.offset - 1)}
            disabled={!sutra.has_prev || busy}
            aria-label={`Previous ${SUTRA}`}
            className={arrow}
          >
            <ChevronDown className="h-5 w-5 rotate-90" />
          </button>
          <span className="whitespace-nowrap text-xs font-semibold text-[#B08968]">
            {sutraDate(sutra.sutra_date)}
          </span>
          <button
            type="button"
            onClick={() => go(sutra.offset + 1)}
            disabled={!sutra.has_next || busy}
            aria-label={`Next ${SUTRA}`}
            className={arrow}
          >
            <ChevronDown className="h-5 w-5 -rotate-90" />
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls="sutra-body"
            className="group relative -my-2 -me-1.5 flex min-h-11 items-center ps-1 pe-1.5"
          >
            <span
              // Both words stacked in one cell, the idle one invisible, so the
              // pill is the width of the wider word in both states and the
              // label row does not shift when it is pressed.
              className="grid rounded-control border border-(--sutra-border) bg-(--sutra-chip) px-2 py-1 text-center text-xs font-semibold transition group-hover:brightness-105"
              style={{ color: "var(--color-accent-deep)" }}
            >
              <span className="sutra-label-hide [grid-area:1/1]">Hide</span>
              <span className="sutra-label-show [grid-area:1/1]">Show</span>
            </span>
          </button>
        </span>
      </div>

      <div
        ref={body}
        id="sutra-body"
        aria-live="polite"
        // pt-3 here rather than a margin on the verse: a margin collapses out
        // through this box while it is plain and stays inside it while the
        // fold clips it, so the verse jumped 12px at both ends of the fold.
        className={`pt-3 transition-opacity ${busy ? "opacity-50" : ""}`}
      >
        {/* On desktop the verse grows but the measure is capped at the spec's
            46ch (1A desktop). Across a 1088px page an uncapped line of
            Devanagari is unreadable however large the type is. */}
        <blockquote
          lang="hi"
          className="hi sutra-verse max-w-[46ch] text-[1.1875rem] leading-[1.75] text-(--sutra-ink) lg:text-2xl"
        >
          <FormattedText text={sutra.text_hi} rich={sutra.text_rich} />
        </blockquote>

        <div ref={more} className="sutra-more">
        <div
          aria-hidden
          className="my-4 h-px"
          style={{ background: "var(--sutra-rule)" }}
        />

        <div className="flex items-center gap-3">
          {/* The book, and only the book. The canonical ref used to ride along
              as "· MKD 2.40.7" — an internal address, in Latin letters and
              digits, at the end of a Devanagari title on the one card that is
              meant to be read rather than navigated. The link still lands on
              the exact verse; it just no longer recites its own coordinates. */}
          <Link
            href={refToHref(sutra.canonical_ref)}
            className="min-w-0 flex-1 text-xs font-medium text-(--sutra-soft) underline-offset-2 hover:underline"
          >
            <span lang="hi" className="hi">{sutra.book_title}</span>
          </Link>

          {/* Saved is reachable from the account menu, and the bookmark that
              used to sit here is gone with the designer's revision: on a card
              whose whole job is Share, a second control of equal weight was
              splitting the one action the card exists for. It survives only
              as the way back from browsing. */}
          {browsing && (
            <button
              type="button"
              onClick={() => go(0)}
              disabled={busy}
              className="flex min-h-11 items-center rounded-control bg-(--sutra-chip) px-3 text-xs font-semibold text-(--sutra-soft) transition hover:brightness-105"
            >
              {`${SUTRA} of the day`}
            </button>
          )}

          {/* The workspace's terracotta, the same fill Sign in wears, rather
              than `--color-accent`. The card keeps its own peach surface for
              the reason it always did — the verse belongs to the day — but the
              button on it is a call to action like any other, and a reader
              learns "this colour is the thing to press" from every screen at
              once or from none of them. */}
          <button
            type="button"
            onClick={() => setSharing(true)}
            className={ctaPrimaryCompact}
            style={{ background: "var(--ws-color)" }}
          >
            <ShareIcon className="h-3.5 w-3.5" />
            Share
          </button>
        </div>
        </div>
      </div>

      <ShareSutraSheet
        open={sharing}
        onClose={() => setSharing(false)}
        text={sutra.text_hi}
        source={sutra.book_title}
        citation={citationText(sutra.text_hi, sutra.canonical_ref)}
        date={sutra.sutra_date}
      />
    </figure>
  );
}
