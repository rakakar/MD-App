"use client";

import { useEffect, useState } from "react";
import { BookRail } from "@/components/home/BookRail";
import { CoverTile } from "@/components/shelf/CoverTile";
import {
  CheckIcon,
  ChevronRight,
  HeadphonesIcon,
  TocIcon,
  VideoIcon,
  WaveformIcon,
  WorkspaceIcon,
} from "@/components/shell/icons";
import { KindTile } from "@/components/ui/KindTile";
import { getBooks } from "@/lib/api";
import { LEVELS, STAGES } from "@/lib/journey";
import type { OnboardingCardId } from "@/lib/onboarding";
import type { BookSummary } from "@/lib/types";
import { WORKSPACES, WORKSPACE_ORDER } from "@/lib/workspaceConfig";

/**
 * The half of each first-run card that is above the line.
 *
 * **Built from the app, not drawn of it.** Every fragment here uses the real
 * components and the real data: `BookRail` is Home's own carousel, `KindTile`
 * and the row around it are the library's list view, the switcher rows are
 * `Header`'s `sheetRow`, and the journey card reads `STAGES` and `LEVELS`. A
 * picture of the switcher goes stale the day a workspace is renamed and nobody
 * notices until a reader does.
 *
 * **Nothing blocks on the network, and one thing asks it politely.** The book
 * rail fetches the shelf so it can show the real covers, and until that lands —
 * or if it never does, offline — `CoverTile` draws the same designed fallback
 * it draws anywhere else. The deck opens on the first frame either way.
 *
 * Everything here is inert, and the `inert` attribute does that rather than a
 * convention: these are real components, so they contain real links, and six
 * screens' worth of them in the tab order is the accessibility failure this
 * pattern usually ships with. Each card's own `aria-label` says what the
 * picture is.
 */

/**
 * One height for every fragment, so the sentence under it does not move.
 *
 * The cards hold different amounts — five switcher rows against two rails
 * against a passage — and with the stage sized to its contents the title and
 * body stepped up and down as the reader swiped, which reads as the page
 * settling rather than as a deck advancing. Fixed here and centred inside, so
 * the only thing that changes between cards is the picture.
 *
 * 424px is the tallest of the six measured at their natural heights — the
 * switcher's five rows and the shelf's two rails, both at 420 — with four
 * pixels over. If a fragment outgrows it, it clips: the height is the contract
 * and the fragment is what gives way. Measure the six again before raising it,
 * because every pixel here comes off the bottom of a small phone.
 */
const STAGE_H = "h-[26.5rem]";

/** The frame every fragment sits in. */
function Stage({
  children,
  tone = "paper",
}: {
  children: React.ReactNode;
  tone?: "paper" | "tint";
}) {
  const skin = tone === "tint" ? "border border-rule" : "border border-rule bg-card";
  return (
    <div
      inert
      className={`flex ${STAGE_H} flex-col justify-center overflow-hidden rounded-card p-4 ${skin}`}
      style={
        tone === "tint"
          ? { background: "color-mix(in srgb, var(--ws-color) 5%, var(--color-card))" }
          : undefined
      }
    >
      {children}
    </div>
  );
}

const LABEL = "text-xs font-bold uppercase tracking-[0.09em] text-ink-soft";

/* ---- 1. the switcher ------------------------------------------------- */

/**
 * The switcher's five rows, exactly as the bottom sheet draws them.
 *
 * `Header`'s `sheetRow` is the original and this follows it: the gradient tile
 * in the workspace's own hue with a white glyph on it, the name over its
 * tagline, and the row you are standing in marked the way the sheet marks it —
 * its own accent as a border, a 7% wash of that accent behind, and a check.
 *
 * It was a filled dark row before, which is a shape the app does not have.
 * Selection is not colour alone here either: the check carries it for anyone
 * who cannot separate a 7% wash from the paper.
 *
 * The comps draw a different five — Explore, Originals, Resources, Community,
 * My Journey — an earlier naming this app has not had for some time. A card
 * teaching a reader five names has to teach the five that are there, so the
 * rows are read out of `WORKSPACES` and follow the next rename on their own.
 */
function Switcher() {
  return (
    <Stage tone="tint">
      <p className={LABEL}>Switch by what you came for</p>
      <ul className="mt-3 flex flex-col gap-2">
        {WORKSPACE_ORDER.map((id) => {
          const ws = WORKSPACES[id];
          const here = id === "originals";
          return (
            <li
              key={id}
              className="flex min-h-14 items-center gap-3 rounded-2xl border bg-card p-3"
              style={
                here
                  ? {
                      borderColor: ws.color,
                      boxShadow: `inset 0 0 0 1px ${ws.color}`,
                      background: `color-mix(in srgb, ${ws.color} 7%, var(--color-card))`,
                    }
                  : { borderColor: "var(--color-rule)" }
              }
            >
              <span
                className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-control text-white"
                style={{
                  background: `linear-gradient(150deg, color-mix(in srgb, ${ws.color} 78%, #fff), ${ws.color})`,
                }}
              >
                <WorkspaceIcon id={id} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-tight">{ws.name}</span>
                <span className="mt-0.5 block truncate text-xs leading-snug text-ink-soft">
                  {ws.tagline}
                </span>
              </span>
              {here && (
                <span className="shrink-0" style={{ color: ws.color }}>
                  <CheckIcon className="h-4.5 w-4.5" />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Stage>
  );
}

/* ---- 2. the shelf, and what you left in it --------------------------- */

/**
 * Written-down books as the floor, the shelf itself as soon as it answers.
 *
 * The codes are real because `CoverTile` derives a book's fallback hue from its
 * code — an invented one would colour the tile differently here than everywhere
 * else in the app.
 */
const FALLBACK_SHELF = [
  { code: "JVEP", title_hi: "जीवन विद्या एक परिचय", page_count: 110 },
  { code: "ABVP", title_hi: "विकल्प एवं अध्ययन बिंदु", page_count: 60 },
  { code: "MKD", title_hi: "मानव कर्म दर्शन", page_count: 178 },
  { code: "MABD", title_hi: "मानव अभ्यास दर्शन", page_count: 195 },
] as unknown as BookSummary[];

function useShelf(): BookSummary[] {
  const [books, setBooks] = useState<BookSummary[]>(FALLBACK_SHELF);
  useEffect(() => {
    let live = true;
    // One `books/` call — the same one Home makes, so it is usually already in
    // the browser's cache by the time the deck asks. A failure needs no
    // handling: the fallback is already on screen and is a designed object
    // rather than a placeholder.
    void getBooks({ workspace: "originals" })
      .then((rows) => {
        if (live && rows.length > 0) setBooks(rows.slice(0, 6));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return books;
}

/**
 * The shelf as a carousel, and under it the recordings you stopped in.
 *
 * This was a dark stage of six cover tiles under Books / Audio / Video tabs —
 * the shelf as an object. It shows what the shelf holds and what a reader does
 * with it instead: `BookRail`, which is Home's own carousel, over `ContinueAv`'s
 * resume cards.
 *
 * **Both drawn as rails**, with the next card peeking — that peek is what says
 * there are more without a control saying so.
 *
 * The resume card is 15.5rem where the real one is 17.5, and copying the number
 * was the mistake worth recording: the real rail bleeds to the edge of the
 * screen and shows 51px of the next card, while this one sits in a stage inside
 * the page gutters, where the same 280px left a 30px sliver that read as a
 * clipped card rather than as a rail. What has to match is the proportion.
 */
function Shelf() {
  const books = useShelf();
  const card = "w-[15.5rem] shrink-0 rounded-card border border-rule bg-card px-4 py-3";

  return (
    <Stage>
      <p className={LABEL}>Books</p>
      <div className="mt-2.5">
        <BookRail books={books} />
      </div>

      <p className={`${LABEL} mt-4`}>Resume</p>
      <div className="-mx-4 mt-2.5 flex gap-3 px-4">
        {[
          {
            kind: "audio" as const,
            title: "जीवन विद्या शिविर — भाग 3",
            where: "Amarkantak · 2011",
            pct: 38,
            left: "42 min left",
          },
          {
            kind: "video" as const,
            title: "मानव व्यवहार दर्शन — प्रश्नोत्तर",
            where: "Achoti · संवाद",
            pct: 64,
            left: "18 min left",
          },
        ].map((r) => (
          <div key={r.kind} className={card}>
            <span className="flex w-full items-start gap-3">
              {/* The glyph tile rather than a poster or a still: both are URLs
                  the card would have to wait on, and this is the real card's
                  own fallback — warm for audio, blue for video, the pair the
                  Library shelf uses. */}
              <span
                aria-hidden
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  r.kind === "audio"
                    ? "bg-kind-audio text-kind-audio-ink"
                    : "bg-kind-video text-kind-video-ink"
                }`}
              >
                {r.kind === "audio" ? (
                  <WaveformIcon className="h-5 w-5" />
                ) : (
                  <VideoIcon className="h-5 w-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span lang="hi" className="hi hi-tight block truncate text-sm font-semibold">
                  {r.title}
                </span>
                <span className="ui-hi mt-1 block truncate text-xs font-medium leading-snug text-ink-soft">
                  {r.where}
                </span>
              </span>
            </span>
            <span className="mt-2.5 flex w-full items-center gap-3">
              <span className="block h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-canvas">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${r.pct}%`, background: "var(--progress-fill)" }}
                />
              </span>
              <span className="shrink-0 text-xs font-medium tabular-nums text-ink-soft">
                {r.left}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Stage>
  );
}

/* ---- 3. Resources, as the list a reader lands on --------------------- */

/**
 * Three rows of the shelf's own list view.
 *
 * It was a chip row over three flat cards — a sketch of a list rather than the
 * list. This is `CollectionListRow`'s shape, which is what `/resources` draws:
 * the kind tile at `xl` on the left, the name, a line of what it is, then the
 * accent-tinted chip with the file's own facts beside it, and a chevron at the
 * end. A reader who has seen this recognises the screen when they arrive on
 * it, which is the whole reason a fragment is a fragment and not a drawing.
 */
const MATERIAL = [
  {
    kind: "pdf" as const,
    name: "शिक्षा में मानवीय मूल्यों का समावेश",
    chip: "PDF",
    note: "Shodh patra · 18 pages",
  },
  {
    kind: "pdf" as const,
    name: "ग्राम स्वराज्य योजना — कार्य विवरण",
    chip: "PDF",
    note: "Yojana · 42 pages",
  },
  {
    kind: "folder" as const,
    name: "अभ्यास शिविर — अध्ययन क्रम",
    chip: "12 items",
    note: "Study guides",
  },
];

function Material() {
  return (
    <Stage tone="tint">
      <p className={LABEL}>Student materials</p>
      <ul className="mt-2.5 flex flex-col gap-2.5">
        {MATERIAL.map((m) => (
          <li
            key={m.name}
            className="flex items-center gap-3.5 rounded-card border border-rule bg-card p-2.5"
          >
            <KindTile kind={m.kind} size="xl" />
            <span className="min-w-0 flex-1">
              <span lang="hi" className="hi hi-tight line-clamp-2 text-sm font-semibold">
                {m.name}
              </span>
              {/* No description line. `DoorRow` takes one only when the caller
                  asks (`withDescription`), and the shelf's top level does not:
                  seven descriptions there would be a paragraph where a list was
                  wanted. This is that level. */}
              <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-bold"
                  style={{
                    background: "var(--color-accent-tint)",
                    color: "var(--ws-ink)",
                  }}
                >
                  {m.chip}
                </span>
                <span className="text-sm text-ink-soft">{m.note}</span>
              </span>
            </span>
            <span aria-hidden className="shrink-0 text-muted">
              <ChevronRight />
            </span>
          </li>
        ))}
      </ul>
    </Stage>
  );
}

/* ---- 4. the reader, with both languages ------------------------------ */

/**
 * A page of a translation, with the reader's own bottom chrome under it.
 *
 * The toggle used to float in the middle of the card over an invented "Original
 * and translation together" chip, which is not a control this app has. It sits
 * where the designer put it: docked at the foot, above the page-number row and
 * under its own hairline — the two are different questions and the rule is what
 * says so (`ReaderChrome`'s `ReaderBottomBar`).
 *
 * The app's `--color-rule` stands in for `--reader-rule`. The reader's tokens
 * only resolve inside a book, and this fragment is on the app's paper.
 */
function Languages() {
  const seg = "flex min-h-9 flex-1 items-center justify-center rounded-control px-3 text-sm";
  return (
    <Stage>
      <div className="flex flex-1 flex-col justify-center">
        <p lang="hi" className="hi hi-note text-title">
          मानव का सहज आचरण ही मानवीयता है। यह आचरण मूल्य, चरित्र और नैतिकता के
          रूप में प्रकट होता है।
        </p>
        <p className="mt-3.5 text-sm leading-relaxed text-ink-soft">
          Humaneness is the natural conduct of a human being. This conduct
          expresses itself as values, character and ethics.
        </p>
      </div>

      {/* Drawn to the stage's own edges, the way the real bar is drawn to the
          screen's. */}
      <div className="-mx-4 -mb-4 mt-4 border-t border-rule">
        <div className="border-b border-rule px-4 py-2">
          <div className="flex items-stretch gap-1 rounded-control border border-rule p-1">
            <span
              lang="hi"
              className={`${seg} font-semibold text-white`}
              style={{ background: "var(--ws-color)" }}
            >
              हिन्दी
            </span>
            <span className={`${seg} text-ink-soft`}>English</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-soft"
          >
            <TocIcon className="h-5 w-5" />
          </span>
          <span className="flex h-11 min-w-0 flex-1 items-center justify-center rounded-control border border-rule px-3 text-sm font-medium tabular-nums">
            42 / 164
          </span>
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-soft"
          >
            <HeadphonesIcon className="h-5 w-5" />
          </span>
        </div>
      </div>
    </Stage>
  );
}

/* ---- 5. mark a line, and find it again ------------------------------- */

/**
 * The selection bar over a painted line, and the card it becomes.
 *
 * Both halves are real and the pairing is the point: the dark pill is what
 * appears when you hold a line (`SelectionBar` — three colour swatches, then
 * the word actions, on its own dark surface in every theme), and the card under
 * it is the row that turns up in Highlights & Notes, down to the book and the
 * `पृष्ठ N · date` line. That card used to be an invented "YOUR NOTE" panel,
 * which taught a screen this app does not have.
 */
function Marking() {
  return (
    <Stage>
      <p lang="hi" className="hi hi-note text-title">
        जीने की आवश्यकता के अर्थ में{" "}
        <span className="box-decoration-clone rounded-md bg-hl-amber px-1">
          समाधान, समृद्धि, अभय और सह-अस्तित्व
        </span>{" "}
        — यही मानव की अपेक्षा है।
      </p>

      {/* `bg-overlay` with white on it, fixed in every theme, because the real
          bar is: it floats over a page whose surface the reader chooses. */}
      <div className="mt-4 flex w-fit max-w-full items-center gap-1 overflow-hidden rounded-full bg-overlay px-2 py-1.5 text-white shadow-raised">
        {["bg-hl-amber", "bg-hl-sage", "bg-hl-sky"].map((c) => (
          <span key={c} className={`h-8 w-8 shrink-0 rounded-full ring-1 ring-white/25 ${c}`} />
        ))}
        <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-white/20" />
        {/* Note and Share, not the real bar's Note · Share · Copy. That bar
            scrolls when it runs out of room and this one cannot, so the third
            word came out sliced down its middle at the stage's edge — which
            reads as a rendering fault rather than as a bar with more in it. */}
        {["Note", "Share"].map((a) => (
          <span
            key={a}
            className="inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium"
          >
            {a}
          </span>
        ))}
      </div>

      <p className={`${LABEL} mt-5`}>Highlights &amp; Notes</p>
      <div className="mt-2.5 rounded-card border border-rule bg-card p-4 shadow-card">
        <p lang="hi" className="hi hi-tight line-clamp-2 text-title leading-relaxed">
          <span className="box-decoration-clone rounded-md bg-hl-amber px-1">
            समाधान, समृद्धि, अभय और सह-अस्तित्व
          </span>
        </p>
        <p className="ui-hi mt-2.5 text-xs leading-snug text-ink-soft">
          मानव कर्म दर्शन · पृष्ठ 93 · 9 Sep 2026
        </p>
      </div>
    </Stage>
  );
}

/* ---- 6. the journey -------------------------------------------------- */

/** "Level One" — the level's number said as a word, as `StageCard` draws it. */
const LEVEL_WORD: Record<number, string> = { 1: "One", 2: "Two", 3: "Three", 4: "Four" };

/**
 * Stage one, drawn as the dashboard's own card draws it.
 *
 * `StageCard` is the original: the level named above nine segments grouped into
 * their four levels, the stage's name, what happens in it and how long it
 * usually takes, then the one next step. The segments take that card's three
 * tones exactly — the stage you declared is the accent, the rest of its level a
 * wash of it, every other level fainter still, and none of the three means
 * "done", because this is a position and not a score.
 *
 * Read out of `STAGES` and `LEVELS`, so a stage renamed in the source is
 * renamed here.
 */
function Journey() {
  const stage = STAGES[0];
  const level = LEVELS[0];
  return (
    <Stage tone="tint">
      <div className="flex items-baseline justify-between gap-3">
        <p className={LABEL} style={{ color: "var(--ws-ink)" }}>
          Level {LEVEL_WORD[level.id]}
        </p>
        <p className="shrink-0 text-sm text-ink-soft">
          Stage {stage.id} of {STAGES.length}
        </p>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        {LEVELS.map((l) => (
          <div key={l.id} className="flex flex-1 gap-1">
            {l.stages.map((id) => (
              <span
                key={id}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  background:
                    id === stage.id
                      ? "var(--ws-color)"
                      : l.id === stage.level
                        ? "color-mix(in srgb, var(--ws-color) 35%, var(--color-card))"
                        : "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <p lang="hi" className="hi hi-tight mt-3 text-xl font-semibold">
        {stage.hi}
      </p>
      {/* The note alone. `StageCard` follows it with the duration sentence,
          and both together clamped mid-phrase — "1–2 camps over 6 months t…" —
          which is worse than not saying it. The card is a picture of the
          screen, not a copy of its every line. */}
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed">{stage.note}</p>

      <p className={`${LABEL} mt-4`}>Your next step</p>
      <div className="mt-1.5 flex items-center gap-3 rounded-card border border-rule bg-card p-2.5">
        <CoverTile
          book={{ code: "JVEP", title_hi: "जीवन विद्या एक परिचय", cover_image: null }}
          size="resume"
          caption="dash"
        />
        <span className="min-w-0 flex-1">
          <span lang="hi" className="hi hi-tight block truncate text-sm font-semibold">
            जीवन विद्या एक परिचय
          </span>
          <span lang="hi" className="hi hi-tight mt-0.5 block text-xs text-ink-soft">
            अध्याय 1 · पृष्ठ 24
          </span>
          <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-canvas">
            <span
              className="block h-full rounded-full"
              style={{ width: "22%", background: "var(--progress-fill)" }}
            />
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-muted">
          <ChevronRight className="h-5 w-5" />
        </span>
      </div>
    </Stage>
  );
}

const FRAGMENTS: Record<OnboardingCardId, () => React.ReactElement> = {
  workspaces: Switcher,
  originals: Shelf,
  resources: Material,
  translations: Languages,
  highlights: Marking,
  journey: Journey,
};

export function Fragment({ id }: { id: OnboardingCardId }) {
  const Draw = FRAGMENTS[id];
  return <Draw />;
}
