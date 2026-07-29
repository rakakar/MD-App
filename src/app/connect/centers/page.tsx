import type { Metadata } from "next";
import { EmptyState, PageContainer, SegmentedNav } from "@/components/ui";
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
      <h1 className="font-display text-2xl font-medium">Centres</h1>
      <p className="mt-1 text-sm text-ink-soft">Study centres and contacts, by region.</p>
      <div className="mt-3">
        <SegmentedNav
          label="Connect sections"
          items={[
            { label: "Events", href: "/connect", active: false },
            { label: "Centres", href: "/connect/centers", active: true },
          ]}
        />
      </div>

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
                  {c.contact_name && (
                    <p className="mt-2 text-sm text-ink-soft">
                      <span lang="hi" className="hi">संपर्क:</span> {c.contact_name}
                    </p>
                  )}
                  {/* Call / Email / Directions action chips (design 9A):
                      icon-and-text, ≥44px tap targets, straight into the
                      device dialer / mail app / maps — no in-app form. */}
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    {c.contact_phone && (
                      <a href={`tel:${c.contact_phone}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rule bg-white px-4 font-medium" style={{ color: "var(--ws-ink)" }}>
                        <span aria-hidden>📞</span> Call
                      </a>
                    )}
                    {c.contact_email && (
                      <a href={`mailto:${c.contact_email}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rule bg-white px-4 font-medium" style={{ color: "var(--ws-ink)" }}>
                        <span aria-hidden>✉️</span> Email
                      </a>
                    )}
                    {c.map_url && (
                      <a href={c.map_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-rule bg-white px-4 font-medium" style={{ color: "var(--ws-ink)" }}>
                        <span aria-hidden>📍</span> Directions
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
