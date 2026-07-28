# MD Study App — Frontend PRD v2 (build-ready)

**Status:** Final for coding — supersedes PRD v1. All open questions resolved (team answers 27 Jul + expert decisions inline, each marked `[EXPERT DECISION]`).
**Prepared by:** Rakesh (UI/UX + FE)
**Date:** 27 July 2026
**Inputs:** `FE_Decision_Guide.md` (§10 finalised decisions) · `API_Contract_v1.md` (frozen §§0–8, live extras §9) · MoM 16 Jul (Vinod Bhaiya) · **Five-workspace navigation model (team-confirmed 27 Jul)**

---

## 0. Ground rules for the coding agent

1. Build **only against live BE endpoints** (contract §§0–9 live tables). Chat assistant and push notifications are **not built on the BE** — they get placeholders/hooks only, exactly as specified in §7 and §9. Do not invent endpoints.
2. `NEXT_PUBLIC_API_BASE_URL` env var for the API root (production BE: `https://mdbe.welfareinfo.net/api/v1/`). Never hardcode.
3. All personal anchors (notes, bookmarks, progress, citations) use **`canonical_ref`** — never array indices or scroll offsets.
4. Network unit = **chapter**; display unit = **page** (contract §0). Page turns are client-side; prefetch next chapter near end of current.
5. CORS/CSRF configuration is a **BE task, already assigned** — assume it works; if blocked during integration, raise to BE immediately. Do not build workarounds (no proxying the API through Next.js).
6. Published content is immutable until republished (`Cache-Control: public, max-age=900`) — cache chapters aggressively (IndexedDB) and revalidate on that TTL.

---

## 1. Stack & architecture (decided — do not relitigate)

- **Next.js (App Router) + TypeScript.** SSG/ISR for content pages; client components for interactive parts (reader controls, player, auth'd screens).
- **Tailwind CSS**, custom design (no mandated component library; shadcn/ui allowed if useful).
- **Hosting: Vercel free plan** on a **custom domain sharing the BE's parent domain** (e.g. FE `welfareinfo.net`, BE `mdbe.welfareinfo.net`) so session cookies share via `Domain=.welfareinfo.net; SameSite=Lax`. Mandatory — auth will not work from `*.vercel.app`.
- **Auth:** django-allauth headless (email/password + Google), session cookies (httpOnly). No JWT, no third-party auth.
- **Analytics:** GA4 behind a simple consent banner (consent mode; no analytics cookies before consent).
- **robots.txt:** explicitly allow `GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`; serve `sitemap.xml`.
- **PWA:** installable; offline reading; service worker structured so Web Push subscribe is a v2 **addition**, not a rewrite.

---

## 2. Navigation model — FIVE workspaces (team-confirmed)

The app has five workspaces, selected from a **header dropdown** (bottom-sheet on mobile). Each workspace has its own bottom nav (mobile) / sidebar (desktop ≥1024px). Identity colours shown for the design system.

| # | Workspace | Hindi | Colour | Content scope |
|---|---|---|---|---|
| 1 | **Originals** | मूल ग्रंथ | Saffron `#C8621A` | A. Nagrajji's published books + discourse audio + videos |
| 2 | **Translations** | अनुवाद | Teal `#1A6B5C` | English translations (v1: single author) — same reader |
| 3 | **Resources** | संसाधन | Blue `#3B6B9E` | Shivir notes, PPTs, Shodh Patra, Yojana & education materials |
| 4 | **My Journey** | मेरी यात्रा | Purple `#534AB7` | Progress, bookmarks, notes (login) / device-local view (guest) |
| 5 | **Connect** | संपर्क | Terracotta `#B8452E` | Events (Shivir calendar), Centers, registration |

**Section→workspace mapping is config-driven `[EXPERT DECISION]`:** a single `workspaceConfig.ts` maps `section__code` values to workspaces (e.g. `MOOL → Originals`). BE will confirm the exact codes for Translations/Resources sections; the mapping must be editable without touching any screen code. Unknown sections default to Resources.

**Canonical content URLs `[EXPERT DECISION]`:** content routes are workspace-independent (`/books/{code}` works for an Originals book and a Translation alike — SEO needs one stable URL per content item). The workspace shell (colour, nav bar, dropdown state) is **derived from the content's section** when you land on a content page, and from the user's explicit dropdown choice when browsing. Deep links therefore always open with the correct workspace chrome.

**Per-workspace bottom nav (mobile).** The centre slot in every workspace is **Search** (see §7 — it is the v1 stand-in for the future assistant and must keep the same position and icon treatment across workspaces):

| Workspace | Nav slots |
|---|---|
| Originals | Home · Read · **Search** · Audio/Video |
| Translations | Home · Read · **Search** |
| Resources | Home · Browse · **Search** · Saved |
| My Journey | Overview · Saved · **Search** · Notes |
| Connect | Events · Centers · **Search** |

(4 slots max; do not pad thin workspaces to 5 — uneven counts are intentional.)

**Header (all workspaces):** workspace dropdown (left) · **upcoming-event chip** (see below) · avatar (right).

**Upcoming-event chip `[EXPERT DECISION]`:** because Connect is now a workspace (2 taps away instead of a fixed 1-tap item — a known regression vs user stories US-06/US-N5), the header carries a small calendar chip showing the next upcoming event date; tapping deep-links to `/connect/events/{id}`. Hidden when no upcoming events. This is the agreed mitigation — build it in v1.

**Default landing:** all users land in **Originals** (LMS is on hold; the guided-mode landing rule activates in a future version). Last-used workspace is restored per device (localStorage).

**Desktop (≥1024px):** persistent left sidebar — workspace selector on top, the workspace's nav items below, avatar at the bottom. Same slots as mobile; Search renders as a sidebar item + `⌘K`/`Ctrl-K` command-palette style overlay.

---

## 3. V1 scope

### In (all endpoints live)

1. **Reader** (§5) — the flagship.
2. **Books browsing** — `GET books/`, `GET books/{code}/`, filtered by section per workspace.
3. **Audio/Video browsing** — `GET audio/series/`, `GET audio/`, `GET videos/`, `GET playlists/`; YouTube via **IFrame Player API only**.
4. **Chapter read-aloud (TTS)** — `audio_renditions` + `para_timings` follow-along (§5, §6).
5. **Keyword search** — `GET search` (§7).
6. **Connect** — `GET events/` (calendar), `GET centers/`, `POST events/{id}/register/` (anonymous allowed — §4).
7. **Sutra of the day** — v1 via curated config list of `canonical_ref`s resolved through live `GET paras/{canonical_ref}/` `[EXPERT DECISION]`; BE endpoint replaces the config source later (team-confirmed as "BE endpoint later"). Implement as a `SutraSource` interface with two implementations (config-list now, API later) so the swap is one line.
8. **Sign-in + personal features** — allauth; `GET/POST /api/v1/me/` `notes`, `bookmarks`, `progress`; guest→login merge.
9. **My Journey** — logged-in: BE-backed (notes/bookmarks/progress). Guest: device-local view `[EXPERT DECISION]`: recently-read list, local resume positions, and locally saved bookmarks from localStorage, presented with a persistent "Sign in to sync across devices" CTA. On login, local data merges to server (`canonical_ref`-keyed union; server wins on conflict) and local copies are cleared.
10. **PWA offline reading** — per-book download to IndexedDB.
11. **SEO** — SSG/ISR, sitemap, schema.org, `lang="hi"`, canonical URLs, OG cards.
12. **Media Session API** — lock-screen playback controls (team-confirmed: implement now, device-test later; do not block on iOS behaviour).

### Out (explicit — placeholders/hooks only)

- **Chat assistant** — BE endpoint not built. Centre slot ships as Search with an "assistant coming soon" note (§7).
- **Push notifications** — BE not built. No UI; service worker push-ready.
- **AV transcript search** — future; search-result component must already render `type: text | audio | video` + optional timestamp.
- **LMS / guided roadmap / Abhyas tracker** — on hold.
- **Connect "news" feed** — no BE endpoint exists; v1 uses the **events list as the updates stream** `[EXPERT DECISION]` (Connect home = upcoming events, which is what "news" practically meant in the MoM). A dedicated news endpoint is a BE-later item.
- **Book Store** — no endpoint; not in v1.

---

## 4. Route map (Next.js App Router)

| Route | Screen | Workspace chrome | Rendering |
|---|---|---|---|
| `/` | Originals home — Sutra of the day, continue reading, book/AV entry cards | Originals | ISR |
| `/books` | Book list (`?section` filter chip per active workspace) | derived | SSG/ISR |
| `/books/{code}` | Book detail + TOC | derived from book's section | SSG/ISR |
| `/books/{code}/{chapter}` | **Reader** | derived | SSG/ISR + client hydration |
| `/books/{code}/page/{n}` | Page deep link → `GET books/{code}/pages/{n}/` → open reader at page n | derived | SSR (one resolver call) |
| `/books/{code}/{chapter}#p-{page}-{para}` | Paragraph deep link (`GET paras/{canonical_ref}/`) | derived | as above |
| `/translations` | Translations workspace home (book list, translation sections) | Translations | ISR |
| `/resources` | Resources workspace home (category cards → filtered lists) | Resources | ISR |
| `/audio` · `/audio/{series}` | Audio series list / detail | derived (Originals default) | ISR |
| `/videos` | Videos & playlists | derived | ISR |
| `/search?q=` | Search results (global, workspace-aware filter chips) | current | client fetch |
| `/connect` | Connect home — upcoming events (= v1 news), calendar view toggle | Connect | ISR, short revalidate |
| `/connect/events/{id}` | Event detail + registration | Connect | ISR + client action |
| `/connect/centers` | Centers directory | Connect | ISR |
| `/me` | My Journey overview (logged-in: BE data; guest: local view + sync CTA) | My Journey | client |
| `/me/bookmarks` · `/me/notes` | Saved / Notes lists | My Journey | client |
| `/me/settings` | Profile & preferences | My Journey | client |
| `/login` · `/signup` | Allauth headless flows | neutral | client |

`sitemap.xml` lists: all books, all chapters, audio series, videos, events, workspace homes.

---

## 5. Reader spec (most detail — flagship)

**Data flow:** `GET books/{code}/chapters/{n}/` → group `paragraphs[]` by `page_number` (front matter: `page_label`) → render page-by-page (or continuous scroll). Prefetch `next` chapter at ~80% progress. Cache per chapter in IndexedDB (`{code}/{chapter}`), revalidate per `max-age=900`.

**Typography**
- Hindi text: **Noto Serif Devanagari, self-hosted, preloaded**; line-height ≥1.8 (Devanagari needs more than Latin); test with real verse content.
- UI chrome: Latin sans of the design system; English UI, Hindi content.

**Block rendering (contract §3.1, exact):**
`para` normal ¶ · `heading`/`subheading` hierarchy · `list` (print `marker` before text, indent by `indent_level`) · `verse` (typically `align:center` — the Sutra look, give it typographic ceremony) · `quote` blockquote · `figure` (`extra.image_b64` → `<img src="data:{mime};base64,…">`, `text_hi` caption, may be empty) · `table` (`extra.rows`, `header` flag). Respect `align` + `indent_level` everywhere.

**Page chrome:** `book_type: print` → show "पृष्ठ {n}" prominently (authoritative, citable). `digital` → de-emphasized. Front matter chapters (`is_front_matter`) show `page_label` (iii, iv…).

**Controls:** font-size slider · light/dark/sepia themes · page-mode ⇄ continuous-scroll (default: print→page, digital→scroll; user override persisted) · go-to-page (TOC `start_page`/`end_page` lookup client-side; the resolver endpoint is only for cold SSR entry).

**Resume:** guest → localStorage per book (top visible `canonical_ref`); logged-in → `me/progress` (debounced write-behind, read on open); merge on login.

**Selection actions:** select a paragraph → Bookmark · Note · Copy-with-citation (appends "— {canonical_ref}"). Guest: bookmark/note stored locally (feeds guest My Journey) with a one-time "sign in to sync" nudge; never a blocking login wall.

**Read-aloud in reader:** if `audio_renditions[]` non-empty → listen button; default `audio_renditions[0]` (fresh-first per contract); voice picker via `voice_label`; surface `is_stale` subtly. **Follow-along:** highlight + auto-scroll the paragraph whose `[start_ms,end_ms]` (from the **playing rendition's** `para_timings`, keyed by `sequence`) brackets current time; paragraphs absent from timings are skipped. **Play-from-here:** tap a para while the player is open → seek to its `start_ms`. Voice switch re-resolves position by paragraph, not timestamp.

**Offline:** per-book "Download" → fetch all chapters → IndexedDB → badge; reader transparently serves cache offline. Figures are inline base64 (self-contained). If a chapter proves multi-MB in practice, BE adds a lazy-figure endpoint later — ignore now.

**Performance budget:** chapter FCP < 1.5s (mid-range Android, 4G); page turn < 100ms, zero network; no CLS from chrome or font swap.

---

## 6. Persistent audio player

- Bottom-bar player in the app shell; survives route and **workspace** changes.
- Sources: chapter TTS renditions; discourse audio tracks. YouTube stays inside its IFrame.
- **Media Session API** — lock-screen/notification controls (play/pause/seek/next). Implemented in v1; iOS device-testing tracked separately, not blocking.
- Controls: play/pause · seek · speed 0.75×–2× · sleep timer.
- If a chapter rendition plays while its reader is open → follow-along active (§5).

---

## 7. Search (v1 centre slot) & assistant placeholder

- `GET search?q=` — global keyword search; result component renders the **forward-compatible shape** `{type: text|audio|video, timestamp?}` even though v1 results are text-only. Text results deep-link via `canonical_ref` (§4 paragraph links).
- Workspace-aware filter chips (All · current workspace) using the section mapping.
- A quiet inline banner: "स्मार्ट सहायक जल्द आ रहा है / Smart assistant coming soon."
- **v2 upgrade path (do not build now):** same slot becomes the assistant — SSE streaming, navigation tool-calls (`{"navigate": "/books/xyz"}` → "Take me there" button), cited paribhasha answers. Keep the slot's component boundary clean so the swap is internal.

---

## 8. Connect (workspace)

- **Home = upcoming events feed** (v1 news `[EXPERT DECISION]`) with list ⇄ month-calendar toggle; past events collapsed.
- **Event detail:** date/location/description + **Register** — `POST events/{id}/register/`. **Anonymous allowed, login optional (team-confirmed):** guests get a minimal form (name + phone/email as the endpoint requires — read exact fields from `/api/v1/docs/` Swagger at build time); logged-in users get it prefilled. Success + duplicate/error states mandatory.
- **Centers:** directory list with region grouping; tap → details/contact.
- Header **upcoming-event chip** (§2) deep-links here from every workspace.

---

## 9. Auth, profile, My Journey

- Headless allauth flows (email/password + Google); session cookies; same-parent-domain (§1).
- **Public users never see panel** — no admin affordances anywhere.
- Preferences (font size, theme, reading mode, workspace last-used): localStorage always; mirrored to server when logged in.
- **My Journey, logged-in:** overview (resume cards from `progress`, counts), `/me/bookmarks`, `/me/notes` — all `canonical_ref`-anchored, each item deep-links into the reader.
- **My Journey, guest `[EXPERT DECISION]`:** device-local overview (recently read from localStorage resume data, local bookmarks/notes) + persistent sync CTA; clearly labelled "इसी device पर saved". Login → merge (union by `canonical_ref`, server wins) → clear local.
- Login prompts appear **only at first benefit** (first bookmark/note, sync attempt, or My Journey visit) — never a gate on reading.

---

## 10. Non-functional

**SEO:** SSG/ISR everywhere content is public; semantic HTML; `lang="hi"` on Hindi blocks; sitemap; schema.org `Book` / `CreativeWork` chapter / `Event`; canonical URLs; OG cards (cover images).
**PWA:** manifest + icons; offline shell + downloaded books; push-ready SW skeleton (no subscribe UI).
**GA4 events:** `workspace_switch` (from,to) · `book_open` · `chapter_read` · `page_turn` (bucketed) · `reader_theme_change` · `font_size_change` · `tts_play` (voice) · `tts_complete` · `audio_track_play` · `video_play` · `search` (query length only) · `search_result_click` · `bookmark_add` · `note_add` · `sutra_view` · `sutra_share` · `event_view` · `event_register` (auth state) · `login` · `signup` · `book_download_offline` · `install_pwa` · `header_event_chip_tap`. No PII in params; consent-gated.
**Accessibility:** WCAG AA in all three themes; keyboard page-turn (←/→); focus management on workspace switch; labelled media controls; 200% zoom test on Devanagari.
**Performance:** budgets per §5; Lighthouse ≥90 on chapter pages; Next image optimization for covers; below-fold base64 figures lazy-rendered.

---

## 11. Resolved questions log (audit trail)

| # | Question | Resolution |
|---|---|---|
| 1 | Sutra of the day source | BE endpoint **later** (team). V1: config list of `canonical_ref`s via live `paras/` endpoint behind a `SutraSource` interface `[EXPERT DECISION]` |
| 2 | My Journey history | Logged-in from BE (`/me/` trio); guest = device-local view + sync-on-login `[EXPERT DECISION]` |
| 3 | Locked-phone playback | Implement Media Session API now; device-test later (team) |
| 4 | Navigation model | **Five workspaces** (team) — this PRD's §2; header event chip as Connect-access mitigation `[EXPERT DECISION]` |
| 5 | Event registration | Anonymous allowed, login optional (team) |
| 6 | CORS/CSRF | BE-owned; assume working, escalate if blocked (team) |
| — | Connect "news" | Events feed serves as v1 news; dedicated endpoint BE-later `[EXPERT DECISION]` |
| — | Section→workspace codes | Config-driven mapping; exact codes to be confirmed by BE during M1 (non-blocking) `[EXPERT DECISION]` |

---

## 12. Milestones

1. **M1 — Shell & browse:** app shell with 5-workspace dropdown + per-workspace navs, header event chip, Originals/Translations/Resources homes, book list/detail, section-mapping config, SEO base, GA4 + consent.
2. **M2 — Reader core:** all block types, page model, themes, resume, deep links, go-to-page, prefetch, IndexedDB cache, Sutra of the day (config source).
3. **M3 — Audio:** persistent player, TTS renditions + follow-along, audio series, YouTube IFrame, Media Session.
4. **M4 — Accounts & My Journey:** allauth flows, `/me/` trio, guest local view, merge-on-login, first-benefit prompts.
5. **M5 — Connect, search, PWA, polish:** events calendar + anonymous registration, centers, search with forward-compatible results, offline downloads, sitemap/schema audit, perf + a11y passes.
6. **M6 — BE walkthrough:** integration check, confirm section codes, hand over v2 hook list (assistant slot, push subscribe, transcript-search format, Sutra endpoint swap, news endpoint).

---

*This PRD is decision-complete for a coding agent. Anything not specified here follows the API contract's shapes exactly; when the contract and this PRD appear to conflict, the contract wins for data shapes and this PRD wins for UX.*
