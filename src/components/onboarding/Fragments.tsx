"use client";

import { CoverTile } from "@/components/shelf/CoverTile";
import {
  ChevronRight,
  HeadphonesIcon,
  LanguageIcon,
  ListIcon,
  PathIcon,
  VideoIcon,
  WorkspaceIcon,
} from "@/components/shell/icons";
import { LEVELS, STAGES } from "@/lib/journey";
import type { OnboardingCardId } from "@/lib/onboarding";
import { WORKSPACES, WORKSPACE_ORDER } from "@/lib/workspaceConfig";

/**
 * The half of each first-run card that is above the line.
 *
 * **Built from the app, not drawn of it.** Every fragment here uses the real
 * components and the real data: `CoverTile` renders the same designed
 * gradient it renders on the shelf, the switcher rows come from `WORKSPACES`,
 * and the journey card reads `STAGES` and `LEVELS`. Nothing fetches — the deck
 * has to open instantly, before the first paint of anything else and while
 * offline — so what is shown is what the app already knows without asking the
 * server.
 *
 * That rules out real book covers and real event data, which arrive over the
 * network. It does not rule out real book *titles*, which are the six most
 * likely to be on the shelf, and it costs nothing to keep them honest.
 *
 * Everything in here is inert. A fragment is a picture the app happens to draw
 * with live components, so nothing is a button, nothing is a link, and the
 * whole block is `aria-hidden` — the card's own `aria-label` says what it is,
 * and a screen reader stepping through six decks of decorative controls is the
 * accessibility failure this pattern usually ships with.
 */

/** The frame every fragment sits in: the comps' tall, rounded stage. */
function Stage({
  children,
  tone = "paper",
}: {
  children: React.ReactNode;
  /** `ink` is the dark stage the Originals card is drawn on */
  tone?: "paper" | "ink" | "tint";
}) {
  const skin =
    tone === "ink"
      ? // `.stage-ink`, not `bg-ink text-surface` — see the note beside it in
        // globals.css. Both of those tokens invert with the theme, so the one
        // deliberately dark panel in the deck turned white in dark mode.
        "stage-ink"
      : tone === "tint"
        ? "border border-rule"
        : "border border-rule bg-card";
  return (
    <div
      aria-hidden
      className={`flex min-h-[17rem] flex-col justify-center overflow-hidden rounded-card p-4 ${skin}`}
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

/* ---- 1. the switcher ------------------------------------------------- */

/**
 * The switcher's five rows, in the order the sheet lists them, with Originals
 * standing as the one you are in.
 *
 * The comps draw a different five — Explore, Originals, Resources, Community,
 * My Journey — which is an earlier naming this app has not had for some time.
 * A first-run card teaching a reader five names has to teach the five that are
 * actually there, so the rows are read out of `WORKSPACES` and will follow it
 * if a workspace is ever renamed again.
 */
function Switcher() {
  return (
    <Stage tone="tint">
      <p className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
        Switch by what you came for
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {WORKSPACE_ORDER.map((id) => {
          const ws = WORKSPACES[id];
          const here = id === "originals";
          return (
            <li
              key={id}
              className={`flex items-center gap-3 rounded-card px-3 py-2.5 ${
                here ? "bg-ink text-surface" : "border border-rule bg-card"
              }`}
            >
              <span
                className="shrink-0"
                style={{ color: here ? ws.color : "var(--color-muted)" }}
              >
                <WorkspaceIcon id={id} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{ws.name}</span>
                <span
                  className={`block truncate text-xs ${here ? "opacity-70" : "text-ink-soft"}`}
                >
                  {ws.tagline}
                </span>
              </span>
              {here && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: ws.color }}
                />
              )}
            </li>
          );
        })}
      </ul>
    </Stage>
  );
}

/* ---- 2. the Originals shelf ------------------------------------------ */

/** Six real titles. No `cover_image`, so `CoverTile` draws its designed
 *  fallback — the same object the shelf shows for a book whose scan has not
 *  arrived, in the book's own hue. */
const SHELF = [
  { code: "JVEP", title_hi: "जीवन विद्या एक परिचय", cover_image: null },
  { code: "ABVP", title_hi: "विकल्प एवं अध्ययन बिंदु", cover_image: null },
  { code: "MKD", title_hi: "मानव कर्म दर्शन", cover_image: null },
  { code: "MABD", title_hi: "मानव अभ्यास दर्शन", cover_image: null },
  { code: "MAND", title_hi: "मानव अनुभव दर्शन", cover_image: null },
  { code: "VJVD", title_hi: "व्यवहारात्मक जनवाद", cover_image: null },
];

function Shelf() {
  const tab = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium";
  return (
    <Stage tone="ink">
      <ul className="grid grid-cols-3 gap-2.5">
        {SHELF.map((b) => (
          <li key={b.code}>
            <CoverTile book={b} size="grid" caption="dash" />
          </li>
        ))}
      </ul>
      <div className="mt-3.5 flex flex-wrap gap-2">
        {/* White at two opacities rather than a token, for the same reason
            the stage is: these sit on a panel no theme changes. */}
        <span className={`${tab} bg-white/20`}>
          <ListIcon className="h-3.5 w-3.5" />
          Books
        </span>
        <span className={`${tab} bg-white/10`}>
          <HeadphonesIcon className="h-3.5 w-3.5" />
          Audio
        </span>
        <span className={`${tab} bg-white/10`}>
          <VideoIcon className="h-3.5 w-3.5" />
          Video
        </span>
      </div>
    </Stage>
  );
}

/* ---- 3. the Resources shelf ------------------------------------------ */

const MATERIAL: { title: string; meta: string }[] = [
  { title: "शिक्षा में मानवीय मूल्यों का समावेश", meta: "Shodh patra · 18 pages · 2019" },
  { title: "ग्राम स्वराज्य योजना — कार्य विवरण", meta: "Yojana document · 42 pages" },
  { title: "अभ्यास शिविर — अध्ययन क्रम", meta: "Study guide · 12 pages" },
];

function Material() {
  return (
    <Stage tone="tint">
      <div className="flex flex-wrap gap-2">
        {["Research", "Yojana", "Notes"].map((t, i) => (
          <span
            key={t}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              i === 0 ? "bg-ink text-surface" : "border border-rule bg-card"
            }`}
          >
            {t}
          </span>
        ))}
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {MATERIAL.map((m) => (
          <li key={m.title} className="rounded-card border border-rule bg-card px-3.5 py-2.5">
            <span lang="hi" className="hi hi-tight block text-sm font-semibold">
              {m.title}
            </span>
            <span className="ui-hi mt-0.5 block text-xs leading-snug text-ink-soft">
              {m.meta}
            </span>
          </li>
        ))}
      </ul>
      {/* The dashed row is the comp's, and it is doing real work: three cards
          would otherwise read as the whole of Resources. */}
      <p className="mt-2 rounded-card border border-dashed border-rule px-3.5 py-2.5 text-center text-xs text-ink-soft">
        and 240 more from students and study groups
      </p>
    </Stage>
  );
}

/* ---- 4. the language toggle ------------------------------------------ */

/**
 * Two segments, not the comp's three.
 *
 * The real control switches between the original and *the* translation of the
 * edition open in front of you — a bilingual book is Hindi and one other
 * language, never a menu of all of them (`ReaderChrome`'s `ReaderLanguageBar`).
 * Drawing three here would teach a control that does not exist; the card's own
 * sentence is what says Kannada is among the languages available.
 */
function Languages() {
  const seg = "flex min-h-9 flex-1 items-center justify-center rounded-control px-3 text-sm";
  return (
    <Stage>
      <div className="flex items-stretch gap-1 rounded-control border border-rule p-1">
        <span
          className={`${seg} font-semibold text-white`}
          style={{ background: "var(--ws-color)" }}
          lang="hi"
        >
          हिन्दी
        </span>
        <span className={`${seg} text-ink-soft`}>English</span>
      </div>
      <p lang="hi" className="hi hi-note mt-4 text-title">
        मानव का सहज आचरण ही मानवीयता है। यह आचरण मूल्य, चरित्र और नैतिकता के रूप
        में प्रकट होता है।
      </p>
      <p className="mt-3.5 border-t border-rule pt-3.5 text-sm leading-relaxed text-ink-soft">
        Humaneness is the natural conduct of a human being. This conduct expresses
        itself as values, character and ethics.
      </p>
      <p
        className="mt-3.5 inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-xs font-semibold"
        style={{
          background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
          color: "var(--ws-ink)",
        }}
      >
        <LanguageIcon className="h-3.5 w-3.5" />
        Original and translation together
      </p>
    </Stage>
  );
}

/* ---- 5. highlight and note ------------------------------------------- */

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
      {/* The selection bar's two actions, in the order it offers them, and
          without the comp's pencil and bookmark glyphs — `SelectionAction`
          draws these as words. Only Share carries an icon on that bar. */}
      <div className="mt-4 flex gap-2">
        <span className="inline-flex items-center rounded-full bg-ink px-3.5 py-2 text-sm font-medium text-surface">
          Highlight
        </span>
        <span className="inline-flex items-center rounded-full bg-inset px-3.5 py-2 text-sm font-medium text-ink-soft">
          Note
        </span>
      </div>
      <div
        className="mt-3.5 rounded-card border border-rule p-3.5"
        style={{ background: "color-mix(in srgb, var(--ws-color) 6%, var(--color-card))" }}
      >
        <p className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
          Your note
        </p>
        <p className="mt-1.5 text-sm leading-relaxed">
          These four are not goals to reach one after another — they describe one
          state.
        </p>
        <p
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold"
          style={{ color: "var(--ws-ink)" }}
        >
          <PathIcon className="h-3.5 w-3.5" />
          Saved to My Journey
        </p>
      </div>
    </Stage>
  );
}

/* ---- 6. the journey -------------------------------------------------- */

/**
 * Stage one, drawn the way the dashboard's own card draws it: nine segments
 * grouped into the four levels, the level named above them, and one next step
 * underneath. Read out of `STAGES` and `LEVELS`, so a stage renamed in the
 * source is renamed here.
 */
function Journey() {
  const stage = STAGES[0];
  const level = LEVELS[0];
  return (
    <Stage tone="tint">
      <div className="flex items-baseline justify-between gap-3">
        <p
          className="text-xs font-bold uppercase tracking-[0.09em]"
          style={{ color: "var(--ws-ink)" }}
        >
          Level one
        </p>
        <p className="text-xs text-ink-soft">Stage {stage.id} of {STAGES.length}</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {LEVELS.map((l) => (
          <div key={l.id} className="flex flex-1 gap-1">
            {l.stages.map((s) => (
              <span
                key={s}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  background:
                    s === stage.id
                      ? "var(--ws-ink)"
                      : l.id === level.id
                        ? "color-mix(in srgb, var(--ws-color) 35%, var(--color-inset))"
                        : "var(--color-inset)",
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <p lang="hi" className="hi hi-tight mt-3 text-xl font-semibold">
        {stage.hi}
      </p>
      <p className="mt-0.5 text-sm text-ink-soft">7 days · the first camp</p>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
        Your next step
      </p>
      <div className="mt-1.5 flex items-center gap-3 rounded-card border border-rule bg-card p-2.5">
        <CoverTile book={SHELF[0]} size="resume" caption="dash" />
        <span className="min-w-0 flex-1">
          <span lang="hi" className="hi hi-tight block truncate text-sm font-semibold">
            मानव का उद्देश्य
          </span>
          <span lang="hi" className="hi mt-0.5 block text-xs text-ink-soft">
            पृष्ठ 24
          </span>
          <span className="mt-2 block h-1 w-full rounded-full bg-inset">
            <span
              className="block h-1 w-1/3 rounded-full"
              style={{ background: "var(--ws-ink)" }}
            />
          </span>
        </span>
        <span className="shrink-0 text-muted">
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
