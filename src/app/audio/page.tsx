import type { Metadata } from "next";
import Link from "next/link";
import { ListenHeader } from "@/components/av/ListenHeader";
import { PageContainer, SectionHeading } from "@/components/ui";
import { getAudioSeries } from "@/lib/api";
import type { AudioSeries } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Audio",
  description: "Discourse audio series.",
};

function seriesTitle(s: AudioSeries): string {
  return s.title_hi || `Series ${s.id}`;
}

export default async function AudioPage() {
  const series = await getAudioSeries().catch(() => [] as AudioSeries[]);

  return (
    <PageContainer>
      <ListenHeader active="audio" />

      <SectionHeading>Series</SectionHeading>
      {series.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {series.map((s) => (
            <Link
              key={s.id}
              href={`/audio/${s.id}`}
              className="rounded-2xl border border-rule bg-white p-5 transition-shadow hover:shadow-md"
            >
              <p lang="hi" className="hi text-base font-semibold">{seriesTitle(s)}</p>
              {s.description && (
                <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{s.description}</p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        // Design 3A empty state: redirect to chapter read-aloud instead of
        // dead-ending — read-aloud already works inside every book.
        <div className="rounded-2xl border border-dashed border-rule bg-white/50 p-8 text-center">
          <p className="text-sm font-medium">
            No <span lang="hi" className="hi">प्रवचन</span> published yet
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Recorded discourses will appear here and keep playing while you read.
            Chapter read-aloud is already available inside every book.
          </p>
          <Link
            href="/books"
            className="mt-3 inline-block rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--ws-color)" }}
          >
            Read aloud from a book
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
