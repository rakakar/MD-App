"use client";

import { useRouter } from "next/navigation";
import { BackIcon } from "@/components/shell/icons";

/**
 * Back, for a page that belongs to no workspace and was opened from a menu —
 * About, Notifications. Back to wherever the reader was; home when the page
 * was the first thing opened — or `fallback`, where the page knows better.
 */
export function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}
      className="-ms-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink transition-colors active:bg-ink/5"
    >
      <BackIcon className="h-5 w-5" />
    </button>
  );
}
