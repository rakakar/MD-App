import type { Metadata } from "next";
import { ContinueReading } from "@/components/home/ContinueReading";
import { BookShelf } from "@/components/shelf/BookShelf";
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
