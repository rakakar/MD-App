"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { localProgressFor } from "@/lib/personal";
import { parseRef, refToHref } from "@/lib/refs";

/**
 * The book hero's primary action (design 1C): "Resume · पृष्ठ N" once there is
 * a saved position, "Start reading" before that.
 *
 * Client-side because the position lives on the device — a signed-out reader
 * has one too, and the page itself is statically rendered for everyone. The
 * fallback renders first and is replaced on mount, so the button is never
 * missing and never wrong for more than a frame.
 */
export function ResumeButton({
  bookCode,
  firstChapterHref,
}: {
  bookCode: string;
  firstChapterHref: string | null;
}) {
  const [resume, setResume] = useState<{ href: string; page: string } | null>(null);

  useEffect(() => {
    const p = localProgressFor(bookCode);
    if (!p) return;
    const ref = parseRef(p.canonical_ref);
    setResume({ href: refToHref(p.canonical_ref), page: ref?.page ?? "" });
  }, [bookCode]);

  const href = resume?.href ?? firstChapterHref;
  if (!href) return null;

  return (
    <Link
      href={href}
      className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      style={{ background: "var(--ws-color)" }}
    >
      {resume ? (
        <>
          Resume{resume.page && <> · <span lang="hi" className="hi">पृष्ठ {resume.page}</span></>}
        </>
      ) : (
        "Start reading"
      )}
    </Link>
  );
}
