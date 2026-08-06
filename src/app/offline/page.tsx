import type { Metadata } from "next";
import Link from "next/link";
import { ReportButton } from "@/components/feedback/ReportButton";

export const metadata: Metadata = { title: "Offline" };

// Offline fallback served by the service worker for uncached navigations.
export default function OfflinePage() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl">☁️</p>
      <h1 className="mt-3 text-lg font-semibold">You&apos;re offline</h1>
      <p className="mt-1 max-w-xs text-sm text-ink-soft">
        Downloaded books are still available — open them from your settings or
        a book page you&apos;ve visited.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/me/settings"
          className="inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold text-white"
          style={{ background: "var(--ws-color)" }}
        >
          My downloads
        </Link>
        {/* Writable offline: the report is kept on the device and sends itself
            when the connection returns. */}
        <ReportButton source="offline_screen" />
      </div>
    </div>
  );
}
