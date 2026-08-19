import type { Metadata } from "next";
import { ContinueReading } from "@/components/home/ContinueReading";
import { BookShelf } from "@/components/shelf/BookShelf";
import { InfoIcon } from "@/components/shell/icons";
import { PageContainer } from "@/components/ui";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Translations",
  description: "A. Nagraj ji's works rendered into other languages.",
};

export default async function TranslationsHome({
  searchParams,
}: {
  searchParams: Promise<{ language?: string }>;
}) {
  const { language } = await searchParams;

  return (
    <PageContainer>
      <h1 className="font-display text-2xl font-medium">Translations</h1>
      <p className="mt-1 text-sm text-ink-soft">
        The same works in other languages, read in the same reader. Each edition
        names its translator.
      </p>

      {/*
        Under the subtext rather than in place of it, because the two answer
        different questions and the page needs both: the line above says what
        this shelf *is*, and this says what it is worth. Opening a workspace on
        a caveat, before a reader has been told what is here, reads as the app
        apologising for its own contents.

        Above the resume rail and the shelf, though — everything below this
        point is a door into a translation, so the note comes before the first
        of them rather than after the last. It carries no dismiss: it is a
        standing fact about the whole shelf, not news, and a caveat a reader
        can tick away is one the next reader never sees.

        Tinted with the workspace's own accent rather than `accent-tint`,
        which is a fixed warm hue and would put an Originals-orange card on a
        green shelf.
      */}
      <div
        className="mt-4 flex items-start gap-3 rounded-card border border-rule p-4"
        style={{ background: "color-mix(in srgb, var(--ws-color) 6%, var(--color-card))" }}
      >
        <span aria-hidden className="mt-0.5 shrink-0" style={{ color: "var(--ws-ink)" }}>
          <InfoIcon className="h-5 w-5" />
        </span>
        <p className="min-w-0 text-sm leading-relaxed">
          <span className="block font-semibold">Important note</span>
          <span className="mt-0.5 block text-ink-soft">
            Each of these is a student&rsquo;s interpretation of Shri A. Nagraj&rsquo;s
            Hindi. Where a translation and the original differ, the original is
            the authority.
          </span>
        </p>
      </div>

      {/* Home's own reason to exist beside Read: picking up where a reader
          left off. Scoped to this workspace — see `ContinueReading` — so a
          Hindi original mid-read on the Originals shelf does not surface
          here, in a rail whose cards this page has no way to explain. Simply
          absent for a reader who has not opened a translation yet, which is
          most readers today: there is one published. */}
      <ContinueReading workspace="translations" />

      {/*
        Language, not genre: this shelf is one body of writing rendered many
        ways, so what a reader is choosing between here is the rendering.
      */}
      <BookShelf
        workspace="translations"
        axis="language"
        basePath="/translations"
        selected={language}
      />
    </PageContainer>
  );
}
