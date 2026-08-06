"use client";

import { useFeedback } from "./FeedbackProvider";

/**
 * A plain "report this" for server-rendered screens that cannot call the hook
 * themselves — the offline fallback, and anywhere else a page is a server
 * component but still deserves a way out.
 */
export function ReportButton({
  source,
  label = "Report a problem",
}: {
  source: string;
  label?: string;
}) {
  const { open } = useFeedback();
  return (
    <button
      type="button"
      onClick={() => open({ kind: "bug", source })}
      className="inline-flex min-h-11 items-center rounded-full border border-rule px-5 text-sm font-semibold"
    >
      {label}
    </button>
  );
}
