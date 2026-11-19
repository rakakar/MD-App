import { VideoIcon, WaveformIcon } from "@/components/shell/icons";
import { formatYear, splitAlbumName } from "@/lib/albumName";
import { contentLang } from "@/lib/script";
import type { FileKind, NodeCard } from "@/lib/types";

/**
 * **An album's cover, drawn from its own facts** — Udaya A3.1 (Raka, 19 Nov 2026).
 *
 * Every recording album gets the same template: dark umber ground, the session
 * Type and Audio/Video on the top line, the name, the month and year on one
 * line, and the Sah Astitva sun rising from the bottom-right corner with its
 * three outer rings showing. Nothing is drawn per album, so an album imported
 * today has its cover today, and no manager has an image to make or forget.
 *
 * Sized by its container, not by props: every measure in `.album-cover` is in
 * `cqw`, so the same markup is a 72px list tile and a 160px hero thumb. Below
 * about 110px it drops to the month over the year — at that size the name is
 * unreadable, and it is printed beside the tile anyway.
 *
 * The colours are the identity's own and do not follow the reader's theme: a
 * cover is artwork, like a book's, and reads the same on paper, sepia and dark.
 */
export function AlbumCover({
  name,
  kind,
  sessionLabel,
  year,
  className = "",
}: {
  /** the folder name as pCloud gave it — "2008 01 Jan Shriram Rakesh" */
  name: string;
  kind: "audio" | "video";
  /** the Type as a manager typed it — "संवाद (QnA)" */
  sessionLabel?: string | null;
  /** the folder's own year where it states one — "2005" or "2005-03" */
  year?: string | null;
  className?: string;
}) {
  const { title, month, yr } = coverFacts(name, year);
  // The cover's top line is one word: "संवाद (QnA)" keeps the word.
  const type = sessionLabel?.replace(/\s*\(.*\)\s*$/, "").trim();
  const t = contentLang(title);
  return (
    <span
      className={`album-cover ${className}`}
      role="img"
      aria-label={[title, month && yr ? `${month} ${yr}` : yr].filter(Boolean).join(", ")}
    >
      <svg className="album-cover__sun" viewBox="0 0 160 160" aria-hidden>
        <circle cx="80" cy="80" r="62.4" fill="var(--color-brand-hint)" />
        <circle cx="80" cy="93.87" r="48.53" fill="var(--color-brand-marigold)" />
        <circle cx="80" cy="106.58" r="35.82" fill="var(--color-brand-saffron)" />
        <circle cx="80" cy="118.13" r="24.27" fill="var(--color-brand-vermilion)" />
      </svg>
      <span className="album-cover__text" aria-hidden>
        <span className="album-cover__kicker">
          <span lang="hi" className="album-cover__type">
            {type}
          </span>
          <span className="album-cover__kind">
            {kind === "audio" ? <WaveformIcon /> : <VideoIcon />}
            {kind === "audio" ? "Audio" : "Video"}
          </span>
        </span>
        <span lang={t.lang} className="album-cover__title">
          {title}
        </span>
        {yr && (
          <span className="album-cover__date">
            {month && <span className="album-cover__month">{month}</span>}
            <span className="album-cover__year">{yr}</span>
          </span>
        )}
      </span>
      {/* The small cover says when; an album whose name carries no date says
          what kind of occasion it was, and failing that, audio or video. */}
      <span className="album-cover__small" aria-hidden>
        {yr ? (
          <>
            {month && <span className="album-cover__month">{month}</span>}
            <span className="album-cover__year">{yr}</span>
          </>
        ) : type ? (
          <span lang="hi" className="album-cover__word">
            {type}
          </span>
        ) : kind === "audio" ? (
          <WaveformIcon className="album-cover__glyph" />
        ) : (
          <VideoIcon className="album-cover__glyph" />
        )}
      </span>
    </span>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The name, month and year a cover prints.
 *
 * `splitAlbumName` reads the audio archive's "2008 01 Jan Name". The video
 * albums were named by hand and only start with the year, sometimes the month
 * in words — "2006 Aug Amarkantak Samvaad", "2005 Raipur Satsang — Mool
 * Tatva" — or end with it, "सम्मेलन — मसूरी 2005" — which that reader rightly
 * leaves alone; the cover still wants their date, so it takes it here. The folder's own `year` wins where it names a
 * month, or where the name gives no date at all.
 */
function coverFacts(name: string, year?: string | null) {
  let { title, date } = splitAlbumName(name);
  if (!date) {
    const m = /^((?:19|20)\d{2})[\s._-]+(?:([A-Za-z]{3,9})\.?[\s._-]+)?(.+)$/.exec(name.trim());
    if (m) {
      const word = m[2] ? MONTHS.find((x) => x.toLowerCase() === m[2].slice(0, 3).toLowerCase()) : undefined;
      title = (word || !m[2] ? m[3] : `${m[2]} ${m[3]}`).trim();
      date = word ? `${word} ${m[1]}` : m[1];
    }
  }
  // The Hindi-named albums end with it instead: "सम्मेलन — मसूरी 2005".
  if (!date) {
    const m = /^(.+?)[\s,–—-]+((?:19|20)\d{2})$/.exec(title.trim());
    if (m) {
      title = m[1];
      date = m[2];
    }
  }
  // A bare "2008" from the panel must not drop the month the name carries.
  const own = formatYear(year);
  if (own && (own.includes(" ") || !date)) date = own;
  const [a, b] = (date ?? "").split(" ");
  return b ? { title, month: a, yr: b } : { title, month: null, yr: a || null };
}

/**
 * Whether a Library folder is a recording album, and so wears an `AlbumCover`
 * instead of its uploaded picture or a glyph: an Originals folder with no
 * folders inside it, holding only recordings.
 */
export function isRecordingAlbum(card: NodeCard, kinds: FileKind[]): boolean {
  return (
    card.workspace === "originals" &&
    card.child_count === 0 &&
    card.item_count > 0 &&
    kinds.length > 0 &&
    kinds.every((k) => k === "audio" || k === "video")
  );
}
