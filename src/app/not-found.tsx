import Link from "next/link";
import { PageContainer } from "@/components/ui";
import { MovedNote } from "./not-found-note";

/**
 * The app's 404.
 *
 * It carries a note for one particular family of dead URLs. Content Model v3
 * replaced the collections-behind-doors model with one tree and wiped the old
 * rows on the way, so `/resources/collections/88` and
 * `/resources/doors/shivir` do not map onto anything — the new folders have
 * their own ids. Sending those links to a folder picked by arithmetic would be
 * worse than saying so: the reader would be looking at the wrong shivir without
 * being told. So they land here and are pointed at the library.
 *
 * A folder that has been un-published reaches this page too, which is correct
 * and deliberate — a hidden branch 404s (§13.3) rather than announcing what it
 * is hiding.
 */
export default function NotFound() {
  return (
    <PageContainer size="shelf">
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-[22px] font-semibold">This page was not found</h1>
        <p className="mt-2 text-sm text-ink-soft">
          The page you followed is not here.
        </p>

        <MovedNote />

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/resources"
            className="rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: "var(--ws-color)" }}
          >
            Resources
          </Link>
          <Link
            href="/search"
            className="rounded-full border border-rule bg-white px-4 py-2 text-sm font-semibold"
          >
            Search
          </Link>
          <Link
            href="/"
            className="rounded-full border border-rule bg-white px-4 py-2 text-sm font-semibold"
          >
            Home
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
