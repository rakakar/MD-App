"use client";

import { BrandMark } from "@/components/shell/icons";
import { LAUNCH } from "@/lib/onboarding";

/**
 * **The launch screen's content column.**
 *
 * Everything the reader sees before they press anything: the mark, the app's
 * name, one sentence, the card naming whose work this is, and the invitation.
 * The artwork and the scrims behind it belong to `FirstRunFlow`, because on a
 * wide screen they run under the deck as well and a photograph that stops
 * halfway across the window is not a photograph, it is a panel.
 *
 * **Two shapes, one DOM.** On a phone this is the whole screen — identity at
 * the top, founder and button at the bottom, the artwork filling the space
 * between them. On a desktop it is a column on the left, vertically centred,
 * with the deck arriving beside it. The difference is entirely `justify-` and
 * alignment, so there is one copy of the markup and one place to change a
 * word.
 *
 * **`started` does not hide this.** On a phone the flow swaps it for the deck;
 * on a desktop it stays exactly where it is and only the button goes, replaced
 * by the line that says what the panel beside it is. That is the point of the
 * desktop transition: the reader is not taken anywhere, they are given
 * something next to what they were already reading.
 */
export function LaunchPane({
  started,
  onStart,
}: {
  started: boolean;
  onStart: () => void;
}) {
  return (
    <div
      /* `max-w-lg` is the deck's own column width, and it is here for the
         tablet: without it a 768pt portrait iPad ran the sentence across 704px
         in one line and drew a 704px button under it, which is a phone layout
         stretched rather than a tablet one. Capped, the column is the same
         width the deck will be when it fades in over it. The desktop split
         overrides the cap with its own fixed column. */
      className="
        relative mx-auto flex h-full w-full max-w-lg flex-col justify-between
        px-7 pb-10 pt-[max(1.75rem,env(safe-area-inset-top))]
        lg:mx-0 lg:w-[28.25rem] lg:max-w-none lg:shrink-0 lg:justify-center lg:gap-6 lg:px-0 lg:py-0
      "
    >
      {/* Identity. Centred on the phone, where it is the whole top half;
          ranged left on the desktop, where it is a column of text. */}
      <div className="flex flex-col items-center gap-[1.125rem] text-center lg:items-start lg:gap-6 lg:text-start">
        {/* The mark, with a halo that breathes behind it. The halo is the one
            piece of this screen drawn in the workspace's colour rather than
            printed in it — it is light, not ink, so it is `--ws-color` at 30%
            and never carries a word. */}
        <div className="relative h-[4.75rem] w-[4.75rem] shrink-0 lg:h-[5.5rem] lg:w-[5.5rem]">
          <span
            aria-hidden
            className="launch-halo absolute -inset-[20%] rounded-full"
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--ws-color) 30%, transparent) 0%, transparent 70%)",
            }}
          />
          <BrandMark className="relative h-full w-full" />
        </div>

        <div className="flex flex-col gap-[1.125rem] lg:gap-3">
          {/* Title and eyebrow are one unit, set tight. Spaced like the
              sentence below them they read as three separate announcements;
              this way STUDY APP is what the name is qualified by. */}
          <div className="flex flex-col gap-1 lg:gap-1.5">
            <h1
              className="launch-in launch-title font-display font-medium"
              style={{ color: "var(--ws-ink)", "--launch-at": "0.65s" } as React.CSSProperties}
            >
              {LAUNCH.title}
            </h1>
            <p
              className="launch-in launch-eyebrow font-semibold uppercase text-ink-soft"
              style={{ "--launch-at": "0.85s", "--launch-dur": "0.72s" } as React.CSSProperties}
            >
              {LAUNCH.eyebrow}
            </p>
          </div>
          <p
            className="launch-in launch-desc text-pretty font-medium text-ink-soft lg:mt-1"
            style={{ "--launch-at": "1s", "--launch-dur": "0.85s" } as React.CSSProperties}
          >
            {LAUNCH.description}
          </p>
        </div>
      </div>

      {/* Founder and invitation. The bottom of the phone screen; the tail of
          the desktop column. */}
      <div className="flex flex-col gap-[1.125rem] lg:gap-6">
        <div
          /* Translucent, but not enough to read through. The study set this
             at 82% over a patch of table; on a 768pt portrait tablet the crop
             puts a book spine right behind it and its title — Devanagari, at
             about the same size — came through and collided with the line on
             the card. 88% plus a blur of what is behind fixes it wherever the
             artwork lands, and keeps the card sitting *on* the photograph
             rather than punched out of it. */
          className="
            launch-in flex items-center gap-[0.9rem] rounded-card border border-rule
            bg-card/88 p-[0.73rem] pe-[1.125rem] backdrop-blur-sm
            lg:gap-4 lg:p-[0.8125rem] lg:pe-5
          "
          style={{ "--launch-at": "1.3s", "--launch-dur": "0.85s" } as React.CSSProperties}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed local
              asset at one size; next/image would add a loader and a wrapper to
              a 16KB file that is already the size it is drawn at. */}
          <img
            src="/brand/anagraj.webp"
            alt=""
            aria-hidden="true"
            width={440}
            height={440}
            /* Framed off-centre on purpose: the source is a square portrait and
               a centred crop of a square cuts the face in half at 3:4. */
            className="h-[5.175rem] w-[4.1625rem] shrink-0 rounded-tile object-cover object-[50%_22%] lg:h-[5.75rem] lg:w-[4.625rem]"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-[0.28rem]">
            {/* 600 is a real Mukta face here — layout.tsx loads 400/500/600/700
                — so this is a weight rather than a browser synthesising one,
                which is the trap Tiro sets (it ships a single 400). */}
            <p
              className="launch-founder-line font-semibold"
              style={{ color: "var(--ws-ink)" }}
            >
              {LAUNCH.founderLine}
            </p>
            <p className="launch-founder-sub text-ink-soft">
              {LAUNCH.founderSub}
            </p>
          </div>
        </div>

        {/* The button and the line that replaces it are stacked in one box of
            a fixed height, not swapped in the flow. Swapping them would move
            the founder's card up by the difference at the exact moment the
            deck is fading in beside it, and two things moving at once reads as
            the layout settling rather than as an answer to the press. */}
        <div className="relative h-14 lg:h-[3.625rem]">
          <button
            type="button"
            onClick={onStart}
            aria-hidden={started || undefined}
            tabIndex={started ? -1 : undefined}
            /* `launch-cta` comes *off* on the way out rather than being
               overridden. It is a running animation — the entrance fade with a
               `both` fill, and the glow — and a running animation outranks any
               declaration, so `opacity-0` beside it did exactly nothing and the
               button sat there at full strength with the deck already open.
               Dropping the class ends the animation and hands opacity back to
               the transition. */
            className={`
              absolute inset-0 inline-flex items-center justify-center rounded-control
              text-base font-bold text-on-accent transition-[opacity,transform] duration-300
              lg:inset-y-0 lg:left-0 lg:w-[15.625rem]
              ${started ? "pointer-events-none translate-y-2 scale-[0.97] opacity-0" : "launch-cta"}
            `}
            style={{ background: "var(--ws-color)" }}
          >
            {LAUNCH.cta}
          </button>
          {/* Desktop only: on a phone the deck takes the whole screen, so
              there is nothing beside the reader to label. */}
          <p
            aria-hidden
            /* `pointer-events-none` is not a nicety: this sits *over* the
               button in the same box, and at zero opacity it was still the
               element under the cursor — the desktop CTA did nothing at all
               until this line existed. */
            className={`pointer-events-none absolute inset-0 hidden items-center gap-2.5 text-sm text-muted transition-opacity duration-500 lg:flex ${
              started ? "opacity-100 delay-200" : "opacity-0"
            }`}
          >
            <span className="h-px w-6.5 bg-rule" />
            {LAUNCH.tour}
          </p>
        </div>
      </div>
    </div>
  );
}
