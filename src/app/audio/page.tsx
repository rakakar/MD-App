import type { Metadata } from "next";
import Link from "next/link";
import { ListenHeader } from "@/components/av/ListenHeader";
import { PageContainer, SectionHeading } from "@/components/ui";
import { getAudioSeries } from "@/lib/api";
import { contentLang } from "@/lib/script";
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
              className="flex items-center gap-4 rounded-2xl border border-rule bg-white p-5 transition-shadow hover:shadow-md"
            >
              {s.cover_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.cover_image}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-rule"
                />
              ) : null}
              <span className="min-w-0">
                <span
                  {...contentLang(seriesTitle(s))}
                  className={`${contentLang(seriesTitle(s)).className} block text-base font-semibold`}
                >
                  {seriesTitle(s)}
                </span>
                {s.description && (
                  <span
                    {...contentLang(s.description)}
                    className={`${contentLang(s.description).className} mt-1 line-clamp-2 block text-sm text-ink-soft`}
                  >
                    {s.description}
                  </span>
                )}
              </span>
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
