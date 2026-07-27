// Sutra of the day (PRD §3.7): SutraSource interface with two
// implementations — curated config list now, BE endpoint later. The swap is
// one line: change ACTIVE_SUTRA_SOURCE.

import { resolvePara } from "./api";
import type { ParaResolution } from "./types";

export interface SutraSource {
  getToday(): Promise<ParaResolution | null>;
}

/**
 * Curated canonical_refs, rotated by day-of-year. Editors extend this list
 * freely; entries that fail to resolve are skipped.
 */
export const SUTRA_REFS: string[] = [
  // curated refs from the live corpus; resolved via GET paras/{canonical_ref}/
  "MVD 1.23.1",
  "MVD 1.23.10",
  "JVEP 1.1.1",
  "JVEP 1.1.2",
  "MVD 1.24.3",
];

class ConfigListSutraSource implements SutraSource {
  async getToday(): Promise<ParaResolution | null> {
    if (SUTRA_REFS.length === 0) return null;
    const dayOfYear = Math.floor(
      (Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 0)) / 86_400_000
    );
    // try today's pick, then walk forward past unresolvable refs
    for (let i = 0; i < SUTRA_REFS.length; i++) {
      const ref = SUTRA_REFS[(dayOfYear + i) % SUTRA_REFS.length];
      try {
        return await resolvePara(ref);
      } catch {
        continue;
      }
    }
    return null;
  }
}

// Future: class ApiSutraSource implements SutraSource — GET sutra-of-the-day/
export const ACTIVE_SUTRA_SOURCE: SutraSource = new ConfigListSutraSource();
