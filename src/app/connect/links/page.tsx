import type { Metadata } from "next";
import { LinksScreen } from "@/components/connect/LinksScreen";
import { EmptyState, ErrorState, PageContainer } from "@/components/ui";
import { getLinkGroups } from "@/lib/api";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Links",
  description:
    "WhatsApp and Telegram groups, regional YouTube channels, and the other places this work happens.",
};

/**
 * Connect → Links (comps 12 and 13).
 *
 * One call renders the page, expanded groups included, so opening an accordion
 * costs nothing. Which one is open is the only state, and it belongs to the
 * screen.
 *
 * A group with nothing visible in it never arrives — the API drops it — so
 * every row on this page opens onto something. The empty state below is
 * therefore the whole page being empty, which is what a fresh install looks
 * like until the links are typed on the panel.
 */
export default async function ConnectLinksPage() {
  const groups = await getLinkGroups().catch(() => null);

  return (
    <PageContainer>
      <h1 className="font-display text-2xl font-semibold">Links</h1>
      <p className="mt-1 text-sm text-ink-soft">Groups, channels and pages, by kind.</p>

      {groups === null ? (
        <div className="mt-4">
          <ErrorState />
        </div>
      ) : groups.length > 0 ? (
        <LinksScreen groups={groups} />
      ) : (
        <div className="mt-4">
          <EmptyState
            title="No links listed yet"
            hint="Groups, channels and pages will appear here."
          />
        </div>
      )}
    </PageContainer>
  );
}
