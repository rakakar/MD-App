import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageContainer, SectionHeading } from "@/components/ui";
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
      <h1 className="text-xl font-bold">Discourse audio</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Recorded discourses, played in the persistent player — keeps playing as
        you browse and read.
      </p>

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
        <EmptyState title="No audio series yet" hint="Published series will appear here." />
      )}
    </PageContainer>
  );
}
