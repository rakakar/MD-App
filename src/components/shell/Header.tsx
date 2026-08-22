"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { ctaPrimary } from "@/components/ui";
import { Sheet } from "@/components/ui/Sheet";
import { track } from "@/lib/analytics";
import { getEvents } from "@/lib/api";
import { eventStart, shortDate, upcomingEvents } from "@/lib/events";
import type { EventItem } from "@/lib/types";
import { WORKSPACES, WORKSPACE_ORDER, type WorkspaceId } from "@/lib/workspaceConfig";
import { DisplaySheet } from "./DisplaySheet";
import { useWorkspace } from "./WorkspaceProvider";
import {
  CalendarChipIcon,
  CheckIcon,
  ChevronDown,
  CloseIcon,
  FeedbackIcon,
  FeedbackListIcon,
  PaletteIcon,
  SettingsIcon,
  UserIcon,
  WorkspaceIcon,
} from "./icons";

/**
 * Workspace picker (PRD §2, design 10A). Two variants rather than one
 * component that swaps at a breakpoint: the header renders `sheet`, the
 * desktop sidebar renders `popover`.
 *
 * The trigger is the design's app-bar pill — a tinted tile, the name, a
 * chevron. The tile's tint is the only part that carries the workspace hue;
 * 10A holds terracotta on shared chrome and moves the hue through the
 * switcher, hero and selection state, and it cross-fades over 180ms rather
 * than cutting.
 *
 * The sheet is portalled to <body> on purpose. The header sets backdrop-blur,
 * and a backdrop-filter makes an element the containing block for its
 * fixed-position descendants — inline, the sheet's `fixed inset-0` resolved to
 * the 48px header instead of the viewport, so it opened as a sliver of itself.
 */
function WorkspaceSwitcher({ variant = "sheet" }: { variant?: "sheet" | "popover" }) {
  const { workspace, select } = useWorkspace();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    // The sheet closes on its own backdrop; a document-level listener would
    // fire on mousedown and unmount the row before its click could navigate.
    const onClick =
      variant === "popover"
        ? (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
          }
        : null;
    if (onClick) window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (onClick) window.removeEventListener("mousedown", onClick);
    };
  }, [open, variant]);

  // the page behind a sheet must not scroll with it
  useEffect(() => {
    if (!open || variant !== "sheet") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, variant]);

  function choose(id: WorkspaceId) {
    select(id);
    setOpen(false);
  }

  /**
   * Sheet row (10A): the workspace's own glyph on a gradient tile, its name
   * with the Devanagari, and the one line on what is inside. Selection is
   * never colour-only — the check and the 2px ring carry it too — and the ring
   * is drawn as a border plus an inset shadow so selecting a row cannot shift
   * the rows below it by a pixel.
   */
  function sheetRow(id: WorkspaceId) {
    const ws = WORKSPACES[id];
    const active = ws.id === workspace.id;
    return (
      <li key={id}>
        <Link
          href={ws.home}
          role="radio"
          aria-checked={active}
          aria-label={`${ws.name} — ${ws.tagline}`}
          onClick={() => choose(id)}
          className="flex min-h-14 items-center gap-3 rounded-2xl border bg-card p-3 transition-colors active:bg-ink/[0.03]"
          style={
            active
              ? {
                  borderColor: ws.color,
                  boxShadow: `inset 0 0 0 1px ${ws.color}`,
                  background: `color-mix(in srgb, ${ws.color} 7%, var(--color-card))`,
                }
              : { borderColor: "var(--color-rule)" }
          }
        >
          <span
            aria-hidden
            className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-control text-white"
            style={{
              background: `linear-gradient(150deg, color-mix(in srgb, ${ws.color} 78%, #fff), ${ws.color})`,
            }}
          >
            <WorkspaceIcon id={id} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-tight">{ws.name}</span>
            <span className="mt-0.5 block text-xs leading-snug text-ink-soft">
              {ws.tagline}
            </span>
          </span>

          {active && (
            <span className="shrink-0" style={{ color: ws.color }} aria-hidden>
              <CheckIcon className="h-4.5 w-4.5" />
            </span>
          )}
        </Link>
      </li>
    );
  }

  /** Popover row (10A desktop): dot, name, check — the compact form. */
  function popoverRow(id: WorkspaceId) {
    const ws = WORKSPACES[id];
    const active = ws.id === workspace.id;
    return (
      <li key={id}>
        <Link
          href={ws.home}
          role="option"
          aria-selected={active}
          aria-label={`${ws.name} — ${ws.tagline}`}
          onClick={() => choose(id)}
          className={`flex items-center gap-2.5 rounded-control px-2.5 py-2.5 text-xs transition-colors ${
            active ? "font-semibold" : "font-medium text-ink-soft hover:bg-canvas/60"
          }`}
          style={
            active
              ? { background: `color-mix(in srgb, ${ws.color} 8%, var(--color-card))` }
              : undefined
          }
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: ws.color }}
            aria-hidden
          />
          <span className="flex-1 truncate">{ws.name}</span>
          {active && (
            <span style={{ color: ws.color }} aria-hidden>
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </Link>
      </li>
    );
  }

  const sheet = (
    <div
      // portalled out of the header, so it needs the header's own breakpoint:
      // otherwise a resize to desktop leaves it open over the sidebar layout
      className="fixed inset-0 z-60 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ws-sheet-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="ws-sheet-backdrop absolute inset-0 bg-black/40"
        onClick={() => setOpen(false)}
      />
      {/* five rows fit any phone held upright; in landscape they do not, and a
          row you cannot reach is a row you cannot choose */}
      <div className="ws-sheet absolute inset-x-0 bottom-0 max-h-[calc(100dvh-2.5rem)] overflow-y-auto overscroll-contain rounded-t-[26px] border-t border-rule bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-20px_44px_-20px_rgba(26,22,19,.4)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-rule" aria-hidden />
        <div className="mt-4 flex items-start justify-between gap-3">
          <p id="ws-sheet-title" className="text-title font-semibold tracking-[-0.01em]">
            Choose a workspace
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="-mr-2 -mt-1 shrink-0 rounded-full p-2 text-ink-soft active:bg-ink/5"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <ul role="radiogroup" aria-label="Workspaces" className="mt-4 flex flex-col gap-2">
          {WORKSPACE_ORDER.map(sheetRow)}
        </ul>
      </div>
    </div>
  );

  // 10A pins the current workspace to the top of the desktop dropdown, with a
  // divider before the rest — on a menu you reopen all day, the row you last
  // chose should be where you last saw it.
  const rest = WORKSPACE_ORDER.filter((id) => id !== workspace.id);

  return (
    <div
      ref={rootRef}
      /* `flex-1` on the phone: with the brand mark gone this is the only thing
         on the left of the bar, and a control sized to its own label left a
         third of the row empty. It now runs from the gutter to the account
         button, which is both the most prominent it can be without changing
         how it is drawn and a far bigger target than a content-width chip.
         The rail's copy is already `w-full` inside a 256px column. */
      className={`relative min-w-0 ${variant === "sheet" ? "flex-1" : ""}`}
    >
      <button
        type="button"
        aria-haspopup={variant === "sheet" ? "dialog" : "listbox"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex min-h-12 items-center gap-2.5 rounded-control border bg-card pl-2 pr-3 text-left shadow-[0_1px_2px_rgba(26,22,19,.04)] transition-colors ${
          variant === "popover" ? "w-full" : "w-full max-w-full"
        } ${open ? "" : "hover:bg-accent-tint"}`}
        style={
          open
            ? {
                borderColor: "var(--ws-color)",
                boxShadow: `0 0 0 3px color-mix(in srgb, var(--ws-color) 12%, transparent)`,
              }
            : { borderColor: "var(--color-rule)" }
        }
      >
        {/* **The workspace's own glyph, not a generic one.** The comps draw an
            open book in this tile on Originals; the code had `SwitcherIcon`,
            three flat lines that said "this is a menu" and — worse — were the
            same three lines `WorkspaceIcon` gives Resources, so one workspace's
            mark was standing in for all five. The tile keeps the comp's light
            tint and accent-coloured glyph; only what is inside it changes, and
            it is bigger now that the bar has the room. */}
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control transition-colors duration-[180ms]"
          style={{
            background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
            color: "var(--ws-ink)",
          }}
        >
          <WorkspaceIcon id={workspace.id} className="h-4.5 w-4.5" />
        </span>
        {/* min-w, not just min-w-0: at the largest text size the actions beside
            this pushed the label to zero width, so the bar showed a tinted
            square and a chevron and the reader could no longer tell which
            workspace they were in. It may truncate; it may not vanish. */}
        {/* Name over what is inside the workspace. The tagline was already
            written for the picker sheet, and putting it here too means a reader
            does not have to open the sheet to learn what a shelf holds — the
            one line that was missing from the bar. `text-xs` is 13px, which
            globals.css calls "the floor"; going under it to fit a longer line
            would be trading legibility for copy nobody asked to be longer.
            It truncates rather than wraps: two lines of supporting copy in an
            app bar is a paragraph, and the sheet says it in full. */}
        <span className="flex min-w-[4.5ch] flex-1 flex-col justify-center">
          <span className="truncate text-title font-semibold leading-tight tracking-[-0.01em]">
            {workspace.name}
          </span>
          <span className="truncate text-xs leading-snug text-ink-soft">
            {workspace.tagline}
          </span>
        </span>
        {/* Bigger than the 12px it was: against a 32px tile and a two-line
            label, a 12px chevron read as a speck rather than as the thing
            saying this control opens. */}
        <ChevronDown
          className={`h-4.5 w-4.5 shrink-0 text-ink-soft transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && variant === "popover" && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-56 rounded-[14px] border border-rule bg-card p-1.5 shadow-[0_20px_44px_-16px_rgba(26,22,19,.35)]">
          <ul role="listbox" aria-label="Workspaces" className="flex flex-col gap-0.5">
            {popoverRow(workspace.id)}
            <li aria-hidden className="my-1 h-px bg-rule" />
            {rest.map(popoverRow)}
          </ul>
        </div>
      )}

      {open && variant === "sheet" && typeof document !== "undefined"
        ? createPortal(sheet, document.body)
        : null}
    </div>
  );
}

/**
 * Upcoming-event chip (PRD §2): next event's date, deep-links to the event.
 * Hidden when no upcoming events. Mitigates Connect being 2 taps away.
 */
function EventChip() {
  const [next, setNext] = useState<EventItem | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEvents()
      .then((events) => {
        if (!cancelled) setNext(upcomingEvents(events)[0] ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!next) return null;
  const date = eventStart(next);
  return (
    <Link
      href={`/connect/events/${next.id}`}
      onClick={() => track("header_event_chip_tap")}
      className="flex min-h-11 items-center gap-1.5 rounded-full border border-rule bg-card px-3 text-xs font-medium text-ink transition-colors hover:border-ws-connect hover:text-ws-connect"
      aria-label={`Upcoming event${date ? ` on ${shortDate(date)}` : ""}`}
    >
      <CalendarChipIcon className="h-3.5 w-3.5" />
      {date ? shortDate(date) : "Event"}
    </Link>
  );
}

function AvatarMenu() {
  const { user, loading } = useAuth();
  const { open: openFeedback } = useFeedback();
  const [open, setOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);

  if (loading) {
    return <div className="h-10 w-10 rounded-control bg-ink/5" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className={ctaPrimary}
        style={{ background: "var(--ws-color)" }}
      >
        Sign in
      </Link>
    );
  }

  /* Gap and a fixed icon column, so five glyphs of different widths still put
     five labels on one line. `text-ink-soft` on the glyph and full ink on the
     label: the icon is there to be found at a glance, not to be read. */
  const row =
    "flex min-h-14 w-full items-center gap-3 rounded-card px-3 text-start text-title font-medium transition-colors active:bg-ink/[.04]";
  const glyph = "flex h-5 w-5 shrink-0 items-center justify-center text-ink-soft";

  return (
    <>
      {/* 10A draws this as a bordered white square with a person glyph, not a
          coloured initial: the app bar already carries the workspace hue on
          the switcher tile, and a second hue-filled circle next to it read as
          a second piece of chrome competing for the same meaning. */}
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-control border border-rule bg-card text-ink-soft shadow-[0_1px_2px_rgba(26,22,19,.04)] transition-colors hover:bg-accent-tint"
      >
        <UserIcon className="h-4.5 w-4.5" />
      </button>

      {/*
        **A sheet, not a dropdown.**
        
        Everything else this app asks of a reader comes up from the floor —
        Display, the filters, the contents, Audio Mode — and this one menu
        dropped from the top right in a 48-unit panel, with rows a third the
        height of the ones in every sheet. On a phone that is the corner a thumb
        reaches least and the target it hits worst; on any screen it was the one
        control that behaved unlike the rest of the app.
      */}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Account"
        /* Under the title, not as the first row of the list: standing where a
           row stands, in a column of things that open, an email address reads
           as something to tap. */
        subtitle={user.email as string}
      >
        {/* No "My Journey" row. It is a *workspace* — one tap away in the
            switcher that sits in this same bar, with its own tab bar and its
            own colour — and a second door to it from the account menu said
            that reading history and the password field are the same kind of
            thing. They are not: the journey is content, this menu is the app.
            That conflation is also why Settings used to live at `/me/settings`
            and hijacked the chrome; see the redirect left at that path. */}
        <Link href="/settings" onClick={() => setOpen(false)} className={row}>
          <span aria-hidden className={glyph}>
            <SettingsIcon className="h-5 w-5" />
          </span>
          Settings
        </Link>
        {/* Theme, text size and weight — moved here from its own button in the
            app bar, which is where the designer wanted it: one row in the menu
            that already holds Settings rather than a second icon competing
            with the workspace tile beside it.

            It keeps the palette it had, so the control a reader has been
            tapping is the same mark in its new home. The sheet it opens is
            unchanged, and `/me/settings` still lays the same controls out
            flat — this is a third door onto them, not a fourth copy.

            `DisplayButton` survives for signed-out readers; see its own note. */}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setDisplayOpen(true);
          }}
          className={row}
        >
          <span aria-hidden className={glyph}>
            <PaletteIcon className="h-5 w-5" />
          </span>
          Display
        </button>
        {/* Feedback lives here rather than behind a floating button: this menu
            is on every screen, and a bubble over the text is the one piece of
            chrome a reading app cannot afford. */}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            openFeedback({ source: "menu" });
          }}
          className={row}
        >
          <span aria-hidden className={glyph}>
            <FeedbackIcon className="h-5 w-5" />
          </span>
          Send feedback
        </button>
        <Link href="/feedback" onClick={() => setOpen(false)} className={row}>
          <span aria-hidden className={glyph}>
            <FeedbackListIcon className="h-5 w-5" />
          </span>
          My feedback
        </Link>
        {/* No "Sign out" row. Signing out is not a thing to be one careless
            tap from a menu a reader opens for the theme: it costs them their
            synced bookmarks and notes on this device, and it is the one action
            here that cannot be undone by tapping again. It lives on the
            Settings screen instead, in the Account card beside the address it
            would be signing out of — a deliberate walk rather than a slip. */}
      </Sheet>

      {/* Sibling of the account sheet, not a child of it: the account sheet
          closes on the way here, and a sheet unmounting its own replacement
          mid-transition leaves nothing on screen. */}
      <DisplaySheet open={displayOpen} onClose={() => setDisplayOpen(false)} />
    </>
  );
}

/**
 * Theme, text size and weight — for a reader who has no account menu to find
 * them in.
 *
 * Display now lives as a row inside the account sheet, at the designer's
 * request, and for a signed-in reader that is the only place it is. **This
 * button is what stops that from stranding everyone else.** The account menu
 * exists only once you are signed in, and most of this audience reads signed
 * out; text size and bold text are accessibility settings, and the alternative
 * route — the workspace switcher, My Journey, Settings, Appearance — is four
 * taps and no reader in need of larger text will find it.
 *
 * So: absent where the sheet can carry it, present where nothing else can. The
 * app bar a signed-in reader sees is the decluttered one; the signed-out bar
 * keeps its palette next to Sign in.
 *
 * A palette rather than "Aa", as the designer draws it. "Aa" is the convention
 * every reading app uses and needed no learning, which is why it was here — but
 * this button stopped being a type control when the theme moved out of the
 * reader, and "Aa" was quietly promising one of the three things behind it. The
 * reader's own type button, inside a book, keeps its "Aa".
 */
export function DisplayButton() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  // Nothing while auth is resolving, so the button cannot appear and then be
  // taken away again a beat later on a signed-in reader's first paint.
  if (loading || user) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Display settings"
        aria-haspopup="dialog"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-rule bg-card text-ink-soft shadow-[0_1px_2px_rgba(26,22,19,.04)] transition-colors hover:bg-accent-tint"
      >
        <PaletteIcon />
      </button>
      <DisplaySheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function Header() {
  return (
    // pt-safe: installed as a PWA the viewport is viewport-fit=cover, so
    // without it the bar sits under the status bar / notch.
    <header
      /* The bar takes a trace of the workspace so the chrome belongs to the
         shelf under it — see `--ws-chrome`. Still translucent, because the
         blur behind it is what makes content scrolling under the bar read as
         *under* it: the mix is taken to 85% against transparent rather than
         being written as a `/85` utility, which cannot reach inside a
         `color-mix`. */
      className="sticky top-0 z-40 border-b border-rule pt-[env(safe-area-inset-top)] backdrop-blur-lg lg:hidden"
      style={{ background: "color-mix(in srgb, var(--ws-chrome) 85%, transparent)" }}
    >
      {/* Two or three items now, and they fit one row at every text size. */}
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-2">
        {/* No brand mark. It was identity *and* a way home — "from four levels
            deep in a book list, the tab bar's Home is the only other route
            back" — and the second half of that is what made it worth its width.
            It is not the only route: every workspace's tab bar carries a tab
            pointing at that workspace's own home (Originals' Home, Resources'
            Student Materials, Connect's Events), so the way back survives the
            mark. The identity half is still said twice over by the switcher
            beside it and by the app icon on the home screen. The rail keeps
            its mark, where it heads a sidebar rather than competing for a
            phone's one row. */}
        <WorkspaceSwitcher />
        {/*
          The next-shivir date chip used to sit here and no longer does, as the
          designer draws it.

          Its job was mitigation — Connect is two taps away, so the bar carried
          a date. But a bare date is the least it could have said, and paying
          for it were the four things beside it: at Larger and Largest the row
          wrapped to two, and the workspace name squeezed to a tinted square and
          a chevron. The shivirs are on Home instead, under a heading, with a
          place and a name — which is what a reader needed to decide whether to
          go, and what a chip could never fit.
        */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <DisplayButton />
          <AvatarMenu />
        </div>
      </div>
    </header>
  );
}

export { AvatarMenu, EventChip, WorkspaceSwitcher };
