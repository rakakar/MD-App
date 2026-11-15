"use client";

import { useEffect } from "react";
import { recordClientError } from "@/lib/clientErrors";

/**
 * The last resort: an error in the root layout itself, which `error.tsx`
 * cannot catch because it renders *inside* that layout. React replaces the
 * whole document here, so this draws its own `<html>` and `<body>`.
 *
 * Plain inline styles, on purpose. The app's stylesheet and fonts may be the
 * very thing that failed to load, and a crash screen that depends on them is
 * the one screen that cannot be allowed to. Light and simple; same words as
 * `error.tsx`. (15 Nov 2026.)
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    recordClientError(`root crash: ${error.message}${error.digest ? ` [${error.digest}]` : ""}`);
  }, [error]);

  const button = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "0 20px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    textDecoration: "none",
    fontFamily: "inherit",
    cursor: "pointer",
  } as const;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#faf7f3",
          color: "#1a1613",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <main
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 24px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>This screen didn’t load</h1>
          <p style={{ margin: "8px 0 0", maxWidth: 320, fontSize: 15, lineHeight: 1.5, color: "#4a413a" }}>
            Sorry, something broke on our side. Please try again.
          </p>
          <div
            style={{
              marginTop: 20,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{ ...button, border: "none", background: "#a64e12", color: "#fff" }}
            >
              Try again
            </button>
            {/* A plain anchor: the router may be what broke. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{ ...button, border: "1px solid #e4dbd1", background: "#fff", color: "#1a1613" }}
            >
              Go home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
