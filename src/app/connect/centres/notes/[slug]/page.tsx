import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CentreNoteBody, CentreNoteNext } from "@/components/connect/CentreNote";
import { BackIcon } from "@/components/shell/icons";
import { PageContainer } from "@/components/ui";
import { CENTRE_NOTES, centreNote } from "@/lib/centreNotes";

/** Two notes, both editorial — so both are known at build time and neither
 *  costs a request. */
export function generateStaticParams() {
  return CENTRE_NOTES.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const note = centreNote((await params).slug);
  if (!note) return { title: "Note" };
  return { title: note.cardTitle, description: note.eyebrow };
}

/**
 * One of the Centres screen's two standing notes, at full length (comps 6B, 6C).
 *
 * Its own screen rather than a sheet: the caution note runs to nine paragraphs
 * across two languages and ends by offering the other one, which is a thing to
 * read rather than a thing to dismiss. A sheet would also have taken the back
 * button away, and this is reached from a list a reader means to come back to.
 */
export default async function CentreNotePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const note = centreNote((await params).slug);
  if (!note) notFound();

  const next = note.next ? centreNote(note.next) : null;

  return (
    <PageContainer>
      {/* The way back, named. `/connect/centres` is where this is reached from
          and the only place it is linked, so the label can say so rather than
          leaving a bare arrow to be guessed at. */}
      <Link
        href="/connect/centres"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-rule bg-card pe-3.5 ps-2.5 text-sm font-semibold text-ink transition-colors active:bg-ink/[.04]"
      >
        <BackIcon className="h-4 w-4 shrink-0" />
        Centres
      </Link>

      <div className="mt-4">
        <CentreNoteBody note={note} />
      </div>

      {next && <CentreNoteNext note={next} />}
    </PageContainer>
  );
}
