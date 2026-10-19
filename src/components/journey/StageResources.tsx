import Link from "next/link";
import { ChevronRight, ExternalLinkIcon } from "@/components/shell/icons";
import { KindTile } from "@/components/ui";
import { isExternalHref, type StageResource } from "@/lib/journey";
import { contentLang } from "@/lib/script";

/**
 * **What a stage points to besides its books** — the PDFs, recordings and
 * pages the roadmap names for it.
 *
 * Two kinds of row, told apart by where they go and drawn so the reader can
 * tell before tapping. A library folder is a row with a chevron and opens
 * inside the app, in our own viewer, where the reader keeps their page. An
 * address elsewhere — YouTube, the study-locations page — has the
 * external-link mark in the chevron's place and opens in a new tab, so the app
 * is still there when they come back.
 *
 * Renders nothing for a stage with no resources: stages 7–9 have none by
 * design, and an empty heading would read as something failing to load.
 */
export function StageResources({
  resources,
  label = "Resources",
  layout = "list",
  count = false,
}: {
  resources: StageResource[];
  /** the heading; null for none, where the caller has its own */
  label?: string | null;
  /**
   * `list` stacks the rows; `grid` lays them out three across on a desktop,
   * which is how the dashboard's "For this stage" draws them.
   */
  layout?: "list" | "grid";
  /** "3 resources" beside the heading */
  count?: boolean;
}) {
  if (resources.length === 0) return null;
  return (
    <div>
      {label !== null && (
        <p className="flex items-baseline gap-2.5">
          <span className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
            {label}
          </span>
          {count && (
            <span className="text-sm text-ink-soft">
              {resources.length} {resources.length === 1 ? "resource" : "resources"}
            </span>
          )}
        </p>
      )}
      <ul
        className={
          layout === "grid"
            ? "mt-2.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3"
            : "mt-1.5 flex flex-col gap-1.5"
        }
      >
        {resources.map((r) => {
          const external = isExternalHref(r.href);
          const lang = contentLang(r.title);
          const body = (
            <>
              <KindTile kind={r.kind === "link" ? "link" : r.kind} size={layout === "grid" ? "md" : "sm"} />
              <span className="min-w-0 flex-1">
                <span
                  lang={lang.lang}
                  className={`${lang.className} block truncate text-sm font-semibold`}
                >
                  {r.title}
                </span>
                {r.note && (
                  <span className="mt-0.5 block truncate text-xs text-ink-soft">{r.note}</span>
                )}
              </span>
              {external ? (
                <ExternalLinkIcon className="h-4 w-4 shrink-0 text-ink-soft" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-soft" />
              )}
            </>
          );
          const row = `flex h-full min-h-11 items-center gap-3 rounded-card border border-rule bg-card transition-shadow hover:shadow-md ${
            layout === "grid" ? "p-3.5" : "p-2.5"
          }`;
          return (
            <li key={`${r.href}|${r.title}|${r.note ?? ""}`}>
              {external ? (
                <a
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={row}
                  aria-label={`${r.title} (opens in a new tab)`}
                >
                  {body}
                </a>
              ) : (
                <Link href={r.href} className={row}>
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
