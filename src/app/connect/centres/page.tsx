import type { Metadata } from "next";
import Link from "next/link";
import { CentreCard } from "@/components/connect/CentreCard";
import { CentreNoteCard } from "@/components/connect/CentreNote";
import { CentresTabs } from "@/components/connect/CentresTabs";
import { ChevronRight, PinIcon } from "@/components/shell/icons";
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
      {/* Title, line and tabs, ruled off from the cards on a desktop, as
          drawn — the rule runs the width of the pane. */}
      <div className="lg:-mx-8 lg:border-b lg:border-rule lg:px-8 lg:pb-6">
        <PageTitle title="Centres" description="Browse centre details, contact person, website." />
        <div className="mt-4">
          <CentresTabs active="centres" centres={centres?.length} contacts={states?.total} />
        </div>
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

      {/* The two standing notes, above the way out and below the list — the
          order the comps put them in and the order they should be read in:
          here is where you could go, here is what to know before you go, and
          here is who to ask. A caution printed under the contacts banner would
          be a caution nobody reached. */}
      <div className="mt-4 flex flex-col gap-3 lg:mt-6 lg:grid lg:grid-cols-2 lg:gap-6">
        {CENTRE_NOTES.map((note) => (
          <CentreNoteCard key={note.slug} note={note} />
        ))}
      </div>

      {/* Not `PromoBand`: that one is the player's dark pill with a play glyph
          on it, and this is the comps' flat teal card with a pin. Same idea,
          different object — and the band is used by two other screens whose
          look should not move because Connect gained a banner.

          Phone only: on a desktop the City-wise contacts tab is in view at the
          top of the page, and the comp draws no banner. */}
      <Link
        href="/connect/centres/contacts"
        className="mt-4 flex items-center gap-3.5 rounded-card p-4 lg:hidden text-white shadow-card transition-opacity hover:opacity-95"
        style={{ background: "var(--ws-color)" }}
      >
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15"
        >
          <PinIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-title font-semibold leading-tight">
            See city-wise contacts
          </span>
          <span className="mt-0.5 block text-sm leading-snug text-white/80">
            See here for the contacts near you
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-white/70">
          <ChevronRight />
        </span>
      </Link>
      </div>
    </PageContainer>
  );
}
