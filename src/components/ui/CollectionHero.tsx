import Link from "next/link";
import { BackIcon } from "@/components/shell/icons";
import { contentLang } from "@/lib/script";

/**
 * The coloured panel at the top of every detail screen in the comps.
 *
 * Six screens draw this — a book, an audio album, a video album, a folder of
 * folders, a folder of files, and the highlights list — and until now three of
 * them had their own copy with its own padding, its own back button and its
 * own idea of how dark the gradient goes. It is one shape with optional parts:
 *
 *     back pill · top-right slot
 *     [thumb]  title · meta · chips · progress
 *     description
 *     actions
 *
 * Full-bleed on a phone, where the hero *is* the top of the screen, and a
 * rounded panel from sm up, where a band running the full width of a desktop
 * window would read as a site header rather than as this thing.
 *
 * The panel carries white text in every theme, and that is not an oversight:
 * the accent is the background here, so no theme can change the pairing. It is
 * the same rule the workspace fills follow everywhere else.
 */
export function CollectionHero({
  tone,
  back,
  topRight,
  thumb,
  eyebrow,
  title,
  meta,
  chips,
  description,
  progress,
  actions,
  variant = "full",
}: {
  /** the panel's base colour — the workspace accent, or the item's own hue */
  tone: string;
  /**
   * Optional, because a folder can be its own top: a workspace root reached
   * directly has nothing above it, and a pill pointing at the page you are on
   * is worse than no pill.
   */
  back?: { href: string; label: string };
  /** share, or whatever else the screen puts opposite the back pill */
  topRight?: React.ReactNode;
  thumb?: React.ReactNode;
  /**
   * A line above the title — in practice the path down to a deep folder.
   *
   * The comps draw every hero one step below a shelf, where the back pill is
   * the whole path and this is empty. Four levels into a shivir it is not: one
   * pill can only offer the parent, and the way back to level two would be the
   * browser's history or nothing.
   */
  eyebrow?: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  chips?: string[];
  description?: string | null;
  progress?: { percent: number; label: React.ReactNode };
  /** the primary call to action and its neighbours */
  actions?: React.ReactNode;
  /**
   * `compact` puts the title on the back pill's own row and drops everything
   * below it — the header over a list that has already been introduced
   * somewhere else, as the highlights screen is.
   */
  variant?: "full" | "compact";
}) {
  const t = contentLang(title);
  return (
    <div
      className="-mx-4 -mt-5 px-4 pb-5 pt-4 text-white sm:mx-0 sm:mt-0 sm:rounded-hero sm:px-6"
      style={{
        background: `linear-gradient(168deg, color-mix(in srgb, ${tone} 88%, #fff), ${tone} 62%, color-mix(in srgb, ${tone} 86%, #000))`,
      }}
    >
      <div className="flex items-center gap-3">
        {back && (
          <Link
            href={back.href}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-tile border border-white/20 bg-white/10 pe-3.5 ps-2.5 text-sm font-semibold transition-colors hover:bg-white/20"
          >
            <BackIcon className="h-4 w-4" />
            {/* On the compact variant the pill is just the arrow: the title is on
                the same row and two pieces of text there is one too many. */}
            <span className={variant === "compact" ? "sr-only" : ""}>{back.label}</span>
          </Link>
        )}
        {variant === "compact" && (
          <h1 {...t} className={`${t.className} min-w-0 flex-1 truncate text-title font-semibold`}>
            {title}
          </h1>
        )}
        {topRight && <div className="ms-auto shrink-0">{topRight}</div>}
      </div>

      {variant === "full" && (
        <>
          <div className="mt-4 flex items-end gap-4">
            {thumb}
            <div className="min-w-0 flex-1 pb-1">
              {eyebrow && (
                <div className="mb-1 text-xs font-semibold text-white/70">{eyebrow}</div>
              )}
              <h1 {...t} className={`${t.className} text-[1.3125rem] font-semibold leading-tight`}>
                {title}
              </h1>
              {meta && <p className="mt-1.5 text-sm font-medium text-white/80">{meta}</p>}
              {chips && chips.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {chips.map((c) => (
                    <span
                      key={c}
                      className="rounded-md bg-white/20 px-2 py-1 text-xs font-semibold uppercase tracking-[0.06em]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
              {progress && (
                <>
                  <div
                    className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-white/25"
                    role="presentation"
                  >
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm font-semibold">{progress.label}</p>
                </>
              )}
            </div>
          </div>

          {description && (
            <p
              {...contentLang(description)}
              className={`${contentLang(description).className} mt-4 text-sm leading-relaxed text-white/85`}
            >
              {description}
            </p>
          )}

          {/* A block, not a flex row. The book's actions arrive as one client
              component that owns its own progress bar as well as its buttons —
              it has to read the saved position once so the bar and the button
              cannot disagree for a frame — and a hero that forced its actions
              onto one line had nowhere to put the bar. Callers that want a row
              write a row. */}
          {actions && <div className="mt-4">{actions}</div>}
        </>
      )}
    </div>
  );
}

/**
 * The hero's primary button — white on the panel, so it is the one thing on a
 * saturated field that reads as pressable. `tone` comes back in as its ink,
 * which is what stops it looking like a piece of the page that fell off.
 *
 * `on-accent`, not `card`. The panel under it is theme-independent, so this
 * has to be too: in dark, `card` is near-black, and the one white button on a
 * saturated hero became a dark chip carrying accent text at 3.06:1.
 */
export function HeroAction({
  href,
  tone,
  children,
}: {
  href: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-tile bg-on-accent px-4 text-title font-semibold transition-opacity hover:opacity-90"
      style={{ color: tone }}
    >
      {children}
    </Link>
  );
}

/** The square neighbour beside it — download, share. Translucent, not white:
 *  two white buttons side by side have no primary. */
export function HeroIconButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-tile border border-white/20 bg-white/15 text-white transition-colors hover:bg-white/25"
    >
      {children}
    </button>
  );
}
