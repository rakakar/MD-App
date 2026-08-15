import { PlayIcon } from "@/components/shell/icons";
import { bookHue, coverGradient } from "@/lib/bookHue";
import { contentLang } from "@/lib/script";
import { shortDuration, type Short } from "@/lib/shorts";

/**
 * Home's rail of vertical clips (design, Home extended).
 *
 * 9:16 cards that snap one per swipe, each with a play badge, its runtime, and
 * its own line laid over the foot. Two and a bit fit a phone screen, which is
 * what says "swipe" without a control saying it — the same rule the book rail
 * and the resume rail already follow.
 *
 * Draws nothing at all when there is nothing to draw. That is not defensive
 * coding, it is the rule this app has kept since the media cards came off Home:
 * a section promising content that is not there is worse than one section
 * fewer — and with the feed live, an empty rail is also what a channel with no
 * shorts looks like.
 *
 * **The card leaves the app**, so it is an `<a target="_blank">` and not a
 * `Link` — the app's rule for anything that goes to another site (`HeroPill`,
 * the map links, the PDF fallback all do the same). `href` is the clip's
 * YouTube page because that is the only place it can be watched today; when
 * there is an in-app player this becomes a `Link` to it again, and `lib/shorts`
 * already carries the `embedUrl` and `isEmbeddable` such a player needs.
 */
export function ShortsRail({ shorts }: { shorts: Short[] }) {
  if (shorts.length === 0) return null;

  return (
    <ul className="-mx-4 -mb-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-pl-4 sm:mx-0 sm:px-0 sm:scroll-pl-0">
      {shorts.map((s) => {
        const t = contentLang(s.title);
        return (
          <li key={s.id} className="w-[9.5rem] shrink-0 snap-start">
            <a
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex aspect-9/16 flex-col justify-end overflow-hidden rounded-card p-2.5 text-white shadow-card transition-shadow hover:shadow-raised"
              style={
                s.poster
                  ? { backgroundImage: `url(${s.poster})`, backgroundSize: "cover" }
                  : { background: coverGradient(bookHue(s.id)) }
              }
            >
              {/* The caption sits on the picture, so it needs its own ground.
                  A scrim rather than a solid bar: the comps let the still show
                  through, and a bar would hide the half of the frame the clip
                  was chosen for. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3"
                style={{
                  background: "linear-gradient(transparent, rgb(0 0 0 / 0.72) 78%)",
                }}
              />
              <span
                aria-hidden
                className="absolute left-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm"
              >
                <PlayIcon className="h-3.5 w-3.5" />
              </span>
              <span className="absolute right-2.5 top-2.5 rounded-md bg-black/45 px-1.5 py-0.5 text-xs font-semibold tabular-nums backdrop-blur-sm">
                {shortDuration(s.seconds)}
              </span>
              <span
                {...t}
                className={`${t.className} hi-tight relative line-clamp-2 text-sm font-semibold`}
              >
                {s.title}
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
