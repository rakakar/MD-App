"use client";

import { useState } from "react";
import { ShareIcon } from "@/components/shell/icons";
import { appAddress, shareApp } from "@/lib/shareApp";
import { ctaSecondary } from "./index";

/**
 * "Share the app" on the About page — the one way to pass the app on that a
 * signed-out reader can reach, since the account menu's row needs an account.
 * Says "Link copied" in place where the browser has no share sheet, and
 * shows the address to pass on where it refuses the clipboard too.
 */
export function ShareAppButton({ className = "" }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={async () => {
          const r = await shareApp();
          if (r === "failed") setAddress(appAddress());
          if (r !== "copied") return;
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className={ctaSecondary}
      >
        <ShareIcon className="h-4 w-4" />
        <span aria-live="polite">{copied ? "Link copied" : "Share the app"}</span>
      </button>
      {address && (
        <p className="mt-2 text-sm text-ink-soft" aria-live="polite">
          Share this address: <span className="select-all font-medium text-ink">{address}</span>
        </p>
      )}
    </div>
  );
}
