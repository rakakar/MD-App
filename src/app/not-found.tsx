import Link from "next/link";
import { PageContainer, ctaPrimary } from "@/components/ui";
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
        <h1 className="text-[1.375rem] font-semibold">We can’t find that page</h1>
        <p className="mt-2 text-sm text-ink-soft">
          It may have moved, or it isn’t published yet.
        </p>

        <MovedNote />

        {/* One way home, and one way to ask. It listed Resources first, which
            was a guess about where a stranger to this URL wanted to be; a
            lost reader needs the front door, and the Assistant is the one
            screen that can find a thing by describing it (15 Nov 2026). */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className={ctaPrimary} style={{ background: "var(--ws-color)" }}>
            Go home
          </Link>
          <Link
            href="/assistant"
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-rule bg-card px-5 text-sm font-semibold"
          >
            Ask the Assistant
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}
