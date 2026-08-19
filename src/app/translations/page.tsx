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
      {/* Two sentences became one. "read in the same reader" was an
          implementation fact wearing a reader's clothes — nobody arrives here
          wondering which component renders the page — and "each edition names
          its translator" is now said better by the note below, which says who
          rendered these *and* what that means for trusting them. What is left
          is the only thing the line has to establish: whose works these are
          and what has been done to them. */}
      <p className="mt-1 text-sm text-ink-soft">
        The published works, rendered into other languages.
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
      {/* Label at `text-sm`, body at `text-xs leading-snug` — the same pairing
          the workspace switcher's own rows use for a bold name over a line of
          supporting copy, which is exactly this shape. The body was `text-sm
          leading-relaxed`, four lines of it on a phone, which spent more of the
          screen on the caveat than on the shelf it qualifies. */}
      <div
        className="mt-4 flex items-start gap-2.5 rounded-card border border-rule p-3.5"
        style={{ background: "color-mix(in srgb, var(--ws-color) 6%, var(--color-card))" }}
      >
        <span aria-hidden className="mt-px shrink-0" style={{ color: "var(--ws-ink)" }}>
          <InfoIcon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">Important note</p>
          <p className="mt-1 text-xs leading-snug text-ink-soft">
            Each of these is a student&rsquo;s interpretation of Shri A. Nagraj&rsquo;s
            Hindi. Where a translation and the original differ, the original is
            the authority.
          </p>
        </div>
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
