// Sutra of the day (PRD §3.7). The SutraSource seam stays — the pick is a
// product decision that may move again — but the curated-config implementation
// is gone: managers now choose the sutra in the panel (/panel/sutras/) and the
// BE serves it from GET sutra/today/ (contract §2.6).
//
// Nothing is retried locally on purpose. The BE already skips picks that no
// longer resolve, and a 404 is its way of saying "no sutra today" — falling
// back to a hardcoded list here would override an editorial decision with a
// stale verse, which is exactly what this endpoint replaced.

import { getSutraOfTheDay } from "./api";
import type { SutraOfTheDay } from "./types";

export interface SutraSource {
  getToday(): Promise<SutraOfTheDay | null>;
}

class ApiSutraSource implements SutraSource {
  getToday(): Promise<SutraOfTheDay | null> {
    return getSutraOfTheDay();
  }
}

export const ACTIVE_SUTRA_SOURCE: SutraSource = new ApiSutraSource();
