import type { Metadata } from "next";
import { CentreCard } from "@/components/connect/CentreCard";
import { CentreNoteCard } from "@/components/connect/CentreNote";
import { CentresTabs } from "@/components/connect/CentresTabs";
import { EmptyState, ErrorState, PageContainer } from "@/components/ui";
import { PageTitle } from "@/components/ui/PageTitle";
import { getCentres, getContactStates } from "@/lib/api";
import { CENTRE_NOTES } from "@/lib/centreNotes";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Centres",
  description:
    "Centres of Madhyasth Darshan — where they are, what runs there, and who to contact.",
};

/**
 * Connect → Centres (comps 7–9).
 *
 * Rendered on the server, whole. Nothing on this screen is filtered, searched
 * or paged — the API sends every published centre in the manager's order — so
 * the only client-side state in the list is whether a given card is expanded,
 * and that belongs to the card.
 *
 * The banner at the foot is the comps' teal call to the city-wise contacts. It
 * is drawn only when there is somebody behind it… which this page cannot know
 * without a second call, so it is drawn always and the screen it opens carries
 * its own empty state. A banner is cheap; a wrong count is not.
 */
export default async function CentresPage() {
  const [centres, states] = await Promise.all([
    getCentres().catch(() => null),
    // only for the tab's count — a failure costs the number, not the page
    getContactStates().catch(() => null),
  ]);

  return (
    <PageContainer size="shelf">
      <div className="mx-auto max-w-3xl lg:max-w-none">
      <PageTitle shelf title="Centres" description="Browse centre details, contact person, website." />
      {/* The tabs pin under the app bar (top of the pane on a desktop) while
          the cards scroll, so the other half is always one tap away. Ruled
          off from the cards on a desktop, as drawn — the rule runs the width
          of the pane. The air above is padding inside the sticky box, so the
          cards pass behind it rather than showing above it. */}
      <div className="sticky top-(--app-header-h) z-30 -mx-4 bg-surface px-4 pb-2 pt-4 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:border-b lg:border-rule lg:px-8 lg:pb-6">
        <CentresTabs active="centres" centres={centres?.length} contacts={states?.total} />
      </div>

      {centres === null ? (
        <div className="mt-4">
          <ErrorState />
        </div>
      ) : centres.length > 0 ? (
        // Two columns on a desktop, each card as tall as its own content.
        <ul className="mt-4 flex flex-col gap-3.5 lg:mt-8 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
          {centres.map((c) => (
            <li key={c.id}>
              <CentreCard centre={c} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="No centres listed yet"
            hint="Centres and their contact details will appear here."
          />
        </div>
      )}

      {/* The two standing notes, below the list: here is where you could go,
          then what to know before you go. The way to the contacts is the tab
          at the top — the banner that used to close the page went when the
          tabs arrived (23 Oct 2026). */}
      <div className="mt-4 flex flex-col gap-3 lg:mt-6 lg:grid lg:grid-cols-2 lg:gap-6">
        {CENTRE_NOTES.map((note) => (
          <CentreNoteCard key={note.slug} note={note} />
        ))}
      </div>
      </div>
    </PageContainer>
  );
}
