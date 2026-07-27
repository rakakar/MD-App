import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageContainer, SectionHeading } from "@/components/ui";
import { getSections } from "@/lib/api";
import type { Section } from "@/lib/types";
import { workspaceForSection } from "@/lib/workspaceConfig";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Resources · संसाधन",
  description: "Shivir notes, PPTs, Shodh Patra, Yojana and education materials.",
};

export default async function ResourcesHome() {
  // category cards come from live sections that map to this workspace —
  // includes any section codes not yet in the explicit map (default bucket)
  const sections = await getSections().catch(() => [] as Section[]);
  const resourceSections = sections.filter(
    (s) => workspaceForSection(s.code) === "resources"
  );

  return (
    <PageContainer>
      <h1 className="text-xl font-bold">Resources · संसाधन</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Shivir notes, presentations, Shodh Patra, Yojana &amp; education materials.
      </p>

      <SectionHeading>Categories</SectionHeading>
      {resourceSections.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {resourceSections.map((s) => (
            <Link
              key={s.code}
              href={`/books?section=${encodeURIComponent(s.code)}`}
              className="rounded-2xl border border-rule bg-white p-5 transition-shadow hover:shadow-md"
            >
              <p lang="hi" className="hi text-base font-semibold">
                {(s.name_hi as string) || (s.name as string) || s.code}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-ink-soft">{s.code}</p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No resource categories yet"
          hint="Materials will appear here as they are published."
        />
      )}
    </PageContainer>
  );
}
