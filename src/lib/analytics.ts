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
  /** renamed from reader_theme_change: the theme is app-wide, and can now
      be changed from the header and Settings as well as inside a book */
  | "theme_change"
  /** The book's own paper — a separate axis from the app theme above, and
      deliberately not called reader_theme_change: that name already meant the
      app theme in the historic data, and reusing it would silently merge two
      different decisions into one funnel. */
  | "reader_surface_change"
  | "font_size_change"
  // which Devanagari face readers actually choose — the answer decides
  // whether the serif stays the default
  | "reader_face_change"
  | "tts_play"
  | "tts_complete"
  // Whether listening is a mode people *stay* in (Audio Mode) or a background
  // tap they leave running while reading — the two want different screens.
  | "audio_mode_open"
  | "audio_track_play"
  | "video_play"
  // A clip in the shorts feed actually starting — fired per clip swiped to, not
  // per screen opened, because "how far down the feed do people get" is the one
  // question this rail exists to answer.
  | "short_play"
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
  // Notifications are opt-in and asked for once. The ratio of banner
  // impressions to enables is the only way to tell a prompt people ignore
  // from one they never saw.
  | "push_enable"
  | "push_disable"
  | "push_banner_dismiss"
  | "push_notification_click"
  | "install_pwa"
  | "header_event_chip_tap"
  // Where feedback actually comes from. The reader's selection bar and the
  // account menu are two very different asks — one is a correction on a
  // passage, the other is everything else — and only the ratio can tell us
  // whether the in-reader door is worth the tap it costs the toolbar.
  | "feedback_open"
  | "feedback_submit";

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
