"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { recordClientError } from "@/lib/clientErrors";
import { ctaPrimary } from "@/components/ui";

/**
 * The screen a reader is on at the exact moment they most want to tell us
 * something — and, until this file existed, the one screen with no way to.
 *
 * The route's own chrome is gone here (the header and its account menu died
 * with the render), so Report is drawn inline. The error is pushed into the
 * same buffer the sheet reads, which means the report carries the stack
 * without the reader having to describe what they cannot see.
 */
export default function ErrorScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { open } = useFeedback();

  useEffect(() => {
    recordClientError(`route crash: ${error.message}${error.digest ? ` [${error.digest}]` : ""}`);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-lg font-semibold">This screen didn&apos;t load</h1>
      <p className="mt-1 max-w-xs text-sm text-ink-soft">
        Sorry — something broke on our side. Telling us takes a moment and we&apos;ll have the
        details already.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className={ctaPrimary}
          style={{ background: "var(--ws-color)" }}
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => open({ kind: "bug", source: "error_screen" })}
          className="inline-flex min-h-11 items-center rounded-full border border-rule px-5 text-sm font-semibold"
        >
          Report this problem
        </button>
      </div>
      <Link href="/" className="mt-4 text-sm text-ink-soft underline underline-offset-4">
        Go home
      </Link>
    </div>
  );
}
