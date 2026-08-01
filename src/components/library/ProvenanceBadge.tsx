import type { Provenance } from "@/lib/types";

/**
 * Whose word is this (contract §13, PRD v2 §5.6.3).
 *
 * 🔵 मूल — his own words, voice or hand · 🟡 संकलन — verbatim compilation ·
 * ⚪ अध्ययन — a student's own writing. The badge is an epistemic requirement
 * rather than decoration: the same rule that keeps resources out of citation
 * search requires the reader to see at a glance whether this is प्रमाण or
 * someone's understanding, and hidden in metadata it would be useless.
 *
 * The spec writes the three as emoji. They are drawn here as a CSS dot in the
 * same three colours instead: the emoji circles land at wildly different sizes
 * and hues across Android, iOS and Windows, and one of the three (⚪) is
 * invisible on white paper on several of them — which is the one badge that
 * must never be missed. The label is always spelled out beside the dot, so the
 * colour is a second signal rather than the only one.
 *
 * These three words are now the *only* copy of them: the BE's `provenance_hi`
 * twin drifted from the FE's and was removed with Content Model v3 (§10.1),
 * so there is no override to prefer any more.
 */
const DOT: Record<Exclude<Provenance, "">, { color: string; label: string }> = {
  moola: { color: "#2F6E86", label: "मूल" },
  sankalan: { color: "#C8901A", label: "संकलन" },
  adhyayan: { color: "#8A8378", label: "अध्ययन" },
};

/** what the badge says, or null for a row nobody has judged yet */
export function provenanceLabel(
  provenance: Provenance | undefined
): { color: string; label: string } | null {
  if (!provenance) return null;
  return DOT[provenance] ?? null;
}

export function ProvenanceBadge({
  provenance,
  tone = "paper",
}: {
  provenance: Provenance | undefined;
  /** `paper` on a white card, `dark` over a tinted hero */
  tone?: "paper" | "dark";
}) {
  const badge = provenanceLabel(provenance);
  // A legacy row carries no judgement yet. Nothing is shown rather than a
  // guess — an unlabelled item is honest, a wrongly labelled one is not.
  if (!badge) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        tone === "dark" ? "bg-white/15 text-white/90" : "bg-canvas text-ink-soft"
      }`}
    >
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full ring-1 ring-black/10"
        style={{ background: badge.color }}
      />
      <span lang="hi" className="hi">
        {badge.label}
      </span>
    </span>
  );
}
