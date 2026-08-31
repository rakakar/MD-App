import type { Metadata } from "next";
import Link from "next/link";
import { ContactsScreen } from "@/components/connect/ContactsScreen";
import { BackIcon } from "@/components/shell/icons";
import { ErrorState, PageContainer } from "@/components/ui";
import { getContacts, getContactStates } from "@/lib/api";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "City-wise contacts",
  description: "Someone to meet in your city — contacts by state.",
};

/**
 * Connect → Centres → City-wise contacts (comps 10 and 11).
 *
 * A page of its own rather than a section of the Centres screen, because that
 * is what the comps draw and because the two answer different questions: a
 * centre is a place to visit, and these are people to meet in cities that have
 * no centre at all — which is most of them.
 *
 * **Both calls happen here.** The state list and the "all states" contacts are
 * fetched on the server, so arriving costs the reader no request and the whole
 * directory is in the HTML for anything that does not run JavaScript. The
 * screen refetches only when a state is chosen.
 *
 * The back pill is named rather than a bare arrow, as on `/me/path`: it goes
 * somewhere specific, and "Centres" is the word the tab bar uses for it. No
 * `NavScope` is needed to keep that tab lit — this path sits under the tab's
 * own href, which `Nav`'s prefix rule already covers.
 */
export default async function CityContactsPage() {
  const [states, initial] = await Promise.all([
    getContactStates().catch(() => null),
    getContacts().catch(() => null),
  ]);

  return (
    <PageContainer>
      <Link
        href="/connect/centres"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-rule bg-card pe-3.5 ps-2.5 text-sm font-semibold text-ink transition-colors active:bg-ink/[.04]"
      >
        <BackIcon className="h-4 w-4 shrink-0" />
        Centres
      </Link>

      <h1 className="mt-4 font-display text-2xl font-semibold">City-wise contacts</h1>
      <p className="mt-1 text-sm text-ink-soft">Someone to meet in your city.</p>

      {states && initial ? (
        <ContactsScreen initial={initial} states={states} />
      ) : (
        <div className="mt-4">
          <ErrorState />
        </div>
      )}
    </PageContainer>
  );
}
