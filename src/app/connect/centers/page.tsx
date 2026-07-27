import type { Metadata } from "next";
import { EmptyState, PageContainer } from "@/components/ui";
import { getCenters } from "@/lib/api";
import type { CenterItem } from "@/lib/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Centers",
  description: "Centers directory with contact details.",
};

function region(c: CenterItem): string {
  return c.state || c.country || "Other";
}

export default async function CentersPage() {
  const centers = await getCenters().catch(() => [] as CenterItem[]);

  // region grouping (PRD §8)
  const groups = new Map<string, CenterItem[]>();
  for (const c of centers) {
    const key = region(c);
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <PageContainer>
      <h1 className="text-xl font-bold">Centers</h1>
      <p className="mt-1 text-sm text-ink-soft">Study centers and contacts, by region.</p>

      {centers.length === 0 ? (
        <div className="mt-5">
          <EmptyState title="No centers listed yet" />
        </div>
      ) : (
        sorted.map(([reg, list]) => (
          <section key={reg} className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
              {reg}
            </h2>
            <ul className="flex flex-col gap-3">
              {list.map((c) => (
                <li key={c.id} className="rounded-2xl border border-rule bg-white p-4">
                  <p lang="hi" className="hi text-base font-semibold">{c.name_hi}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {[c.city, c.state, c.country].filter(Boolean).join(", ")}
                  </p>
                  {c.address && <p className="mt-1 text-sm text-ink-soft">{c.address}</p>}
                  {c.activities && (
                    <p lang="hi" className="hi mt-2 text-sm">{c.activities}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    {c.contact_name && <span className="text-ink-soft">{c.contact_name}</span>}
                    {c.contact_phone && (
                      <a href={`tel:${c.contact_phone}`} className="font-medium underline-offset-2 hover:underline" style={{ color: "var(--ws-color)" }}>
                        {c.contact_phone}
                      </a>
                    )}
                    {c.contact_email && (
                      <a href={`mailto:${c.contact_email}`} className="font-medium underline-offset-2 hover:underline" style={{ color: "var(--ws-color)" }}>
                        {c.contact_email}
                      </a>
                    )}
                    {c.map_url && (
                      <a href={c.map_url} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-2 hover:underline" style={{ color: "var(--ws-color)" }}>
                        Map ↗
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </PageContainer>
  );
}
