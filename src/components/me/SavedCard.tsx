"use client";

import { useState } from "react";
import { ShareIcon, TrashIcon } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";

/**
 * **The foot of a saved row — which book, which page, and the two things you
 * can do with it.**
 *
 * Shared by the highlight card and the note card because it is the same
 * footer: they differ above the rule and agree below it, and the pair reads
 * as one list when the feet line up.
 *
 * What it replaces is a `canonical_ref` — "JVEP 4.40.2" — printed where the
 * book's name belongs. That string is how the app files a passage, not how
 * anyone holds one in mind; a reader looking for what they marked in
 * जीवन विद्या एक परिचय was reading codes and counting.
 *
 * `पृष्ठ` rather than "page", and it is the same call the book's own
 * Highlights tab makes: the line sits under Devanagari and beside a Devanagari
 * title, and an English "page" there is the join showing.
 */
export function SavedCardFooter({
  bookTitle,
  page,
  date,
  shareTitle,
  href,
  onDelete,
  deleteLabel,
}: {
  bookTitle: string;
  /** printed page from the ref; front matter gives a roman numeral */
  page: string;
  /** already formatted, or empty where the row carries no date */
  date: string;
  /** what the share sheet is offered as */
  shareTitle: string;
  /** the passage's own address, for the share */
  href: string;
  onDelete: () => void;
  deleteLabel: string;
}) {
  const t = contentLang(bookTitle);
  return (
    <div className="mt-3.5 flex items-end justify-between gap-3 border-t border-rule pt-3">
      <div className="min-w-0">
        <p {...t} className={`${t.className} truncate text-sm font-semibold`}>
          {bookTitle}
        </p>
        <p lang="hi" className="hi mt-0.5 truncate text-xs text-ink-soft">
          {page ? `पृष्ठ ${page}` : ""}
          {page && date ? " · " : ""}
          {date}
        </p>
      </div>
      {/* Above the card's stretched link, or neither would be pressable. */}
      <div className="relative z-10 flex shrink-0 items-center">
        <RowShare title={shareTitle} href={href} />
        <RowButton onClick={onDelete} label={deleteLabel} destructive>
          <TrashIcon className="h-5 w-5" />
        </RowButton>
      </div>
    </div>
  );
}

/** A 44px icon button, bare — the card is already a bordered surface and two
 *  outlined controls inside it would be a box in a box. */
function RowButton({
  onClick,
  label,
  destructive = false,
  children,
}: {
  onClick: () => void;
  label: string;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors active:bg-ink/[.06]"
      /* `--color-danger`, declared per theme in globals.css. It was
         `text-red-700`, which is a fine red on a white card and 1.61:1 on the
         dark one — the bin all but vanished in the theme a reader is most
         likely to be reading in. */
      style={destructive ? { color: "var(--color-danger)" } : undefined}
    >
      {children}
    </button>
  );
}

/**
 * Share one saved passage.
 *
 * The passage's own address rather than the page the reader is standing on —
 * `ui/ShareButton` shares `window.location`, which from this list would send
 * everybody the list. Falls back to the clipboard where the browser has no
 * share sheet, which is every desktop one.
 */
function RowShare({ title, href }: { title: string; href: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = new URL(href, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // cancelled, or a browser that refuses both — neither is worth a dialog
    }
  };
  return (
    <RowButton onClick={share} label={copied ? "Link copied" : "Share this passage"}>
      {copied ? <span className="text-xs font-semibold">✓</span> : <ShareIcon className="h-5 w-5" />}
    </RowButton>
  );
}

/**
 * "12 Aug 2026". `Intl` rather than a month table of our own — `SutraCard`
 * already dates this way, and a second list of twelve strings is a second
 * place for them to go stale.
 */
export function savedDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}
