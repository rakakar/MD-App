"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BackIcon } from "@/components/shell/icons";

const cls =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-rule bg-card";

/**
 * Back from a word's page goes to where the reader came from.
 *
 * Opened from the Assistant (`?from=assistant`), that is the conversation —
 * the answer they were reading, at the place they left it — so it is the
 * browser's own back rather than a link to anywhere. Related words carry the
 * same mark, so a walk through three entries unwinds one step at a time and
 * ends in the conversation. Everywhere else, and on a page opened cold from a
 * shared link, back is the glossary, as it always was.
 */
export function EntryBack() {
  const router = useRouter();
  const fromAssistant = useSearchParams().get("from") === "assistant";

  if (!fromAssistant) return <GlossaryBack />;
  return (
    <button
      type="button"
      aria-label="Back to the Assistant"
      onClick={() => {
        // A link opened in a fresh tab has nowhere to go back to.
        if (window.history.length > 1) router.back();
        else router.push("/assistant");
      }}
      className={cls}
    >
      <BackIcon className="h-5 w-5" />
    </button>
  );
}

/** The glossary — the server-rendered default, before the URL is read. */
export function GlossaryBack() {
  return (
    <Link href="/paribhasha" aria-label="Paribhasha glossary" className={cls}>
      <BackIcon className="h-5 w-5" />
    </Link>
  );
}

/** Keeps `?from=assistant` on a related word, so back unwinds the whole walk. */
export function useEntryFrom(): string {
  return useSearchParams().get("from") === "assistant" ? "?from=assistant" : "";
}
