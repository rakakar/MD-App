// GA4 via gtag, consent-mode gated (PRD §1, §10). No analytics cookies
// before consent; event params never carry PII.

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";

export type GaEvent =
  | "workspace_switch"
  | "book_open"
  | "chapter_read"
  | "page_turn"
  | "reader_theme_change"
  | "font_size_change"
  // which Devanagari face readers actually choose — the answer decides
  // whether the serif stays the default
  | "reader_face_change"
  | "tts_play"
  | "tts_complete"
  | "audio_track_play"
  | "video_play"
  | "search"
  // Expanding a result in place vs opening the book — the ratio tells us
  // whether readers can judge a passage from the list, or need its context.
  | "search_result_expand"
  | "search_result_click"
  | "bookmark_add"
  | "note_add"
  // Which door readers actually use for a definition — the underline they had
  // to switch on, or pressing and holding a word. If the second carries the
  // traffic, the underline setting is a preference and not the feature.
  | "paribhasha_lookup"
  | "paribhasha_underline_toggle"
  | "sutra_view"
  // Whether readers walk past today's verse at all — if nobody uses the
  // arrows, the curated pool is deeper than anyone wants it to be.
  | "sutra_browse"
  | "sutra_share"
  | "event_view"
  | "event_register"
  | "login"
  | "signup"
  | "book_download_offline"
  | "install_pwa"
  | "header_event_chip_tap";

export function track(event: GaEvent, params: Record<string, string | number> = {}): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", event, params);
}

export function applyConsent(granted: boolean): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
  });
}
