import Link from "next/link";
import { ChevronRight, HeadphonesIcon, PathIcon } from "@/components/shell/icons";
import { SectionHeading } from "@/components/ui";
import type { Stage } from "@/lib/journey";

/**
 * **Study this book** — the ways out of a book page that lead outward
 * (16 Nov 2026, UX audit IA5 and AV10).
 *
 * The page linked only inward: chapters, highlights, translations. The study
 * path already knew which stage reads each book, and Media already held talks
 * on some of them, but those links ran one way, from the path out, two
 * workspace switches from here.
 *
 * Two rows, each drawn only when it is true:
 *
 * - **the stage that reads it**, onto the full path at that stage
 *   (`stageForBook`, from the same genre table the path draws its reading
 *   from).
 * - **discourses on it** — for now a Media search for the book's title, and
 *   only when that search finds something. Most titles find nothing (the
 *   recordings are named by date, place and topic), and a row that opens an
 *   empty search is a door painted on a wall. A manager-set link from a book to
 *   its folders is the real answer; this is the cheap first step.
 */
export function StudyThisBook({
  stage,
  media,
}: {
  stage: Stage | null;
  media: { href: string; count: number } | null;
}) {
  if (!stage && !media) return null;
  return (
    <section className="mt-6">
      <SectionHeading>Study this book</SectionHeading>
      <ul className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-card">
        {stage && (
          <li>
            <StripLink
              href={`/me/path?stage=${stage.id}`}
              icon={<PathIcon className="h-4.5 w-4.5" />}
              title={`Read in stage ${stage.id} of the study path`}
              meta={
                <>
                  <span lang="hi" className="hi">
                    {stage.hi}
                  </span>
                  {stage.en && <> · {stage.en}</>}
                </>
              }
            />
          </li>
        )}
        {media && (
          <li>
            <StripLink
              href={media.href}
              icon={<HeadphonesIcon className="h-4.5 w-4.5" />}
              title="Discourses on this book"
              meta={`${media.count} ${media.count === 1 ? "recording" : "recordings"} in Media match its title`}
            />
          </li>
        )}
      </ul>
    </section>
  );
}

function StripLink({
  href,
  icon,
  title,
  meta,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  meta: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-ink/[0.03] active:bg-ink/5"
    >
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-tile bg-inset text-ink-soft"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-ink-soft">{meta}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}
