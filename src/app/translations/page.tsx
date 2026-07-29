import type { Metadata } from "next";
import { BookShelf } from "@/components/shelf/BookShelf";
import { PageContainer } from "@/components/ui";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Translations · अनुवाद",
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
      <h1 className="font-display text-2xl font-medium">Translations · <span lang="hi" className="hi">अनुवाद</span></h1>
      <p className="mt-1 text-sm text-ink-soft">
        The same works in other languages, read in the same reader. Each edition
        names its translator.
      </p>

      {/*
        Language, not genre: this shelf is one body of writing rendered many
        ways, so what a reader is choosing between here is the rendering.
      */}
      <BookShelf
        section="translations"
        axis="language"
        basePath="/translations"
        selected={language}
      />
    </PageContainer>
  );
}
