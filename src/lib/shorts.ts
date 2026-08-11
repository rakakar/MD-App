/**
 * **Shorts — the one placeholder in the app, and the whole of it.**
 *
 * The designer's Home draws a rail of vertical clips between the book shelf and
 * the Audio/Video door. The backend has no feed for them: there is no
 * short-form kind in the content model, no duration ceiling that would mark one,
 * and no field saying which frame to show. So this file exists to keep that
 * absence in exactly one place.
 *
 * Everything else about Shorts is real — the rail is a real component, it
 * renders real data shapes, and it renders nothing at all when the list is
 * empty. Only the list is invented.
 *
 * **To make it real:** replace the body of `getShorts` with the fetch, delete
 * `PLACEHOLDER`, and delete this comment. Nothing else in the app imports
 * anything from here except `getShorts` and the `Short` type, which is the
 * point of it being a file rather than an array inside the page.
 *
 * The clips are captioned with lines from the books rather than with invented
 * quotes, and they carry no poster image, because we have no stills and a
 * stock photograph of somebody else would be worse than a coloured card. The
 * rail draws its own gradient from the id, the way covers already do.
 */

export interface Short {
  id: string;
  /** the caption laid over the foot of the card */
  title: string;
  /** runtime, for the badge */
  seconds: number;
  /** a still, when there is one — there is not yet */
  poster: string | null;
  href: string;
}

/** Not content. See the note above. */
const PLACEHOLDER: Short[] = [
  { id: "s1", title: "समाधान ही मानव का लक्ष्य है", seconds: 48, poster: null, href: "/av" },
  { id: "s2", title: "परिवार ही समाज की इकाई है", seconds: 72, poster: null, href: "/av" },
  { id: "s3", title: "अध्ययन ही विधि है", seconds: 36, poster: null, href: "/av" },
];

/**
 * The clips for Home's Shorts rail, newest first.
 *
 * Returns an empty list rather than throwing if it cannot answer, because the
 * rail draws nothing for an empty list — a Home page missing one section is a
 * smaller failure than a Home page that does not render.
 */
export async function getShorts(): Promise<Short[]> {
  return PLACEHOLDER;
}

/** `48` → `0:48`, `72` → `1:12`. The badge in the card's top corner. */
export function shortDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
