# Public Reader API — FE Contract v1 (पाठक API अनुबंध)

Contract for the frontend (reading web app) that serves published books to end
users. This is the **frozen** shape the FE can build against. Every endpoint
here is **anonymous, read-only, and cached** — published content is immutable
until it is republished.

Base path: `/api/v1/` · Interactive schema: `/api/v1/docs/` (drf-spectacular).

**Production BE:** `https://mdbe.welfareinfo.net` (may change; FE must read the
base URL from an environment variable, never hardcode it).

---

## 0. The one decision that shapes everything

**Network unit = chapter. Display unit = page.**

- The FE fetches **one chapter at a time** (not the whole book, not one page at
  a time).
- Inside a chapter, the FE groups paragraphs by `page_number` and renders them
  **page by page**, showing the printed page number the reader is used to.
- Turning a page is **client-side only** — no network call. Prefetch the next
  chapter when the reader nears the end of the current one.

Why not the whole book: a philosophical book is thousands of paras plus inline
base64 figures — multi-MB JSON, slow first paint. Why not page-by-page over the
network: a network round-trip on every page-turn feels laggy. Chapter is the
sweet spot, and it caches beautifully because published content is immutable.

---

## 1. Books & print vs digital

Two kinds of book, distinguished by `book_type`:

| `book_type` | Meaning | Page numbers | Chapters |
|---|---|---|---|
| `print`   | A physically printed book. | The **real printed page** — authoritative, citable. | As printed. |
| `digital` | Born-digital (e.g. a typed handwritten diary). | Our own **editorial** page numbering. | Our own editorial division. |

`book_type` is **independent of** the workflow "published" status. "Published"
only ever means *"serve this to the FE."* A digital book that was never printed
can still be published.

**FE rule:** for `print`, show the page number prominently ("पृष्ठ 142"). For
`digital`, show it lightly / de-emphasized — it is our structure, not a printed
fact. In **both** cases, citations use `canonical_ref` (stable, see §5).

---

## 2. Endpoints

### 2.1 `GET /api/v1/books/` — list published books

Array of book summaries (no chapters). Fields: `code`, `title_hi`,
`subtitle_hi`, `author`, `section`, `book_type`, `genre`, `language`,
`language_label`, `translator`, `translation_of`, `edition`,
`publication_year`, `description`, `cover_image`, `page_count`, `tags`.

Filters: `?section__code=originals` · `?genre=darshan` · `?language=en` ·
`?translation_of=MVD`. See §11 for what `genre` means and §12 for translations.

### 2.2 `GET /api/v1/books/{code}/` — book detail + TOC

Book summary **plus `chapters[]`** (the table of contents) **and
`translations[]`** (§12 — empty on everything except an original that has
published translations). Each chapter:

```json
{
  "number": 3,
  "title_hi": "…",
  "sequence": 4,
  "verification_status": "verified",
  "start_page": 130,
  "end_page": 160,
  "is_front_matter": false
}
```

`start_page`/`end_page` are the printed page range of the chapter. They are
**guaranteed present on every chapter of a published book** (publish is blocked
otherwise), so the FE can rely on them for page navigation (§4).

### 2.3 `GET /api/v1/books/{code}/chapters/{number}/` — the reading payload

The whole chapter: metadata, prev/next pointers, and every paragraph.

```json
{
  "number": 3,
  "title_hi": "…",
  "sequence": 4,
  "audio_renditions": [                         // [] until audio is generated
    {
      "voice_key": "mistral:e3f447b6-…",        // stable rendition id
      "voice_label": "ए. नागराज",                 // show this in the voice picker
      "provider": "mistral",
      "audio_url": "https://…/chapter.opus",
      "duration_ms": 812400,
      "is_stale": false,                        // text edited after generation
      "para_timings": { "87": [0, 4180], … }    // {para sequence: [start_ms, end_ms]}, spoken paras only
    }
  ],
  "prev": { "number": 2, "title_hi": "…" },     // or null at the first chapter
  "next": { "number": 4, "title_hi": "…" },     // or null at the last chapter
  "paragraphs": [ … see §3 … ]
}
```

Use `prev`/`next` to render chapter navigation without re-reading the TOC.

**Read-aloud (multi-voice, TTS Plan v2).** A chapter can carry several audio
renditions, one per voice; the list is ordered **fresh-first** (non-stale,
newest) — playing `audio_renditions[0]` is the correct default. To play from
a page or highlight the current paragraph, look the paragraph's `sequence` up
in the chosen rendition's `para_timings` and seek the chapter audio to its
`start_ms` — timings are per-voice, so always read them from the rendition
being played. Paragraphs missing from `para_timings` (tables, caption-less
figures) are not spoken — skip the highlight for them.

`audio_url` (and `file_url` on audio tracks, and `cover_image`) is always
**absolute** — the FE runs on another origin and feeds these straight into
`<audio src>`/`<img src>`. Media answers HTTP **range requests**
(`Accept-Ranges: bytes`, `206`), which is what makes the seek bar,
"play from this paragraph" and mid-chapter voice switching work; don't assume
a whole-file download.

When `audio_renditions` is `[]` the chapter simply has no generated audio yet.
That is a normal state, not an error — the FE may fall back to the device's
own speech engine, but such playback is a client-side affair with no
`para_timings` and no timeline, and must be labelled as the device's voice.

### 2.4 `GET /api/v1/books/{code}/pages/{n}/` — resolve a page to its chapter

For shareable page links (§4). Returns which chapter contains printed page `n`:

```json
{ "code": "MVD", "page": 142, "chapter_number": 5 }
```

`404` if no chapter contains that page. The FE **could** compute this itself
from the TOC it already holds; this endpoint exists so a server-rendered page
(e.g. Next.js opening `/books/MVD/page/142` cold) can resolve in one call.

### 2.5 `GET /api/v1/paras/{canonical_ref}/` — deep link to a paragraph

Resolves a citation like `MVD 3.42.5` (URL-encoded) to the paragraph **plus**
enough context to open the reader: adds `book_code`, `book_title`,
`chapter_number`, `chapter_title` to the paragraph shape.

### 2.6 `GET /api/v1/sutra/today/` — Sutra of the day

The verse on the FE home screen. Managers curate it at `/panel/sutras/`; a
sutra is a **pointer to a published paragraph**, never a separate copy of the
text, so the citation and deep link are always real and a proofreading fix
reaches the card automatically.

The response is **the same shape as §2.5** plus one field — so the FE can
render it with the same component:

```json
{
  … every field of the deep-link resolution …,
  "sutra_date": "2026-07-29",  // the local (IST) date this pick belongs to
  "offset": 0,                 // steps from today's pick (see below)
  "has_prev": true,            // an earlier entry exists → enable ←
  "has_next": true             // a later entry exists  → enable →
}
```

- `text_hi` is the curator's trimmed line when one was entered (a sutra is
  often one line inside a longer paragraph), the paragraph's own text
  otherwise. `canonical_ref` always cites the paragraph either way.
- **404** means nothing is curated for today — render no card, it is not an
  error state.
- One pick per day for the whole audience: a manager can pin a sutra to an
  exact date, otherwise the pool rotates deterministically by date and turns
  over at local midnight. Picks whose book is unpublished are skipped, so the
  card never comes back blank.
- Cached `public, max-age=900` like the rest of the published content.

**`?offset=n` — browsing more sutras.** The card's ← → arrows step along the
curated sequence (all servable sutras, in curation order): `offset=-1` is one
step back, `offset=1` one step forward. `offset=0` — the default — is *always*
today's pick, so opening the app twice in a day shows the same sutra however
far anyone browsed before. Use `has_prev`/`has_next` to enable the arrows; an
offset past either end is a 404, and a non-numeric offset a 400.

---

## 3. Paragraph shape (the atomic render unit)

```json
{
  "canonical_ref": "MVD 3.142.5",
  "sequence": 87,            // reading order within the chapter
  "page_number": 142,        // printed page (group by this to build pages)
  "page_label": "",          // front-matter label (e.g. "iii"); shown instead of page_number when set
  "para_number": 5,          // para position on the printed page
  "block_type": "para",      // see table below
  "marker": "",              // printed list/verse marker shown before the text, e.g. "5."
  "align": "left",           // left | center | right (as printed)
  "indent_level": 0,         // semantic nesting depth (0 = top level)
  "text_hi": "…",            // the Hindi text (may be empty for a caption-less figure)
  "footnote_text": "",
  "extra": { … }             // figure/table payload; see below
}
```

### 3.1 `block_type` rendering

| `block_type` | Render as |
|---|---|
| `para`       | Normal paragraph. |
| `heading`    | Section heading. |
| `subheading` | Smaller heading. |
| `list`       | List item; print `marker` before the text; indent by `indent_level`. |
| `verse`      | Verse / सूत्र; usually `align: center`. |
| `quote`      | Blockquote. |
| `figure`     | Image — see `extra`; `text_hi` is the caption (may be empty). |
| `table`      | Table — see `extra`; `text_hi` is the pipe-joined plain text. |

### 3.2 `extra` payload

- **figure:** `{ "image_b64": "…", "image_mime": "image/png" }`. Render as
  `<img src="data:{image_mime};base64,{image_b64}">`. Images are inline base64
  (no separate media files / no extra requests).
- **table:** `{ "rows": [[cell, …], …], "header": true|false }`. `rows[0]` is
  the header row when `header` is true.

> **Payload note (future, not now):** because figures are inline base64, a
> figure-heavy chapter can grow large. If a chapter ever turns out multi-MB in
> practice, we will add a lazy figure endpoint — a **backward-compatible**
> addition, no change to the shapes above. Not needed today (YAGNI).

---

## 4. Page navigation & shareable URLs

The reader shows the printed page number, and "go to page N" works like this:

1. FE has the TOC (§2.2) with every chapter's `start_page`/`end_page`.
2. User asks for page `N` → FE finds the chapter whose range contains `N`.
3. FE fetches that chapter (if not cached) and scrolls to the paras with
   `page_number == N`.

**Front matter:** chapters with `is_front_matter: true` display `page_label`
(e.g. `iii`, `iv`) instead of `page_number`. Their citations use the `fm`
marker (`MVD fm.iii.2`).

**Suggested FE URL conventions** (FE routing — backend does not enforce these):

- Chapter: `/books/{code}/{chapter_number}`
- Page:    `/books/{code}/page/{n}`  → resolve via §2.4, then open the chapter
- Paragraph deep link: `/books/{code}/{chapter}#p-{page}-{para}` → §2.5

---

## 5. Citations & caching

- **`canonical_ref`** (`MVD 3.42.5` = code · chapter · printed-page · para) is
  the citation standard and is **immutable once the book is published**. Use it
  for shareable "cite this" links, notes, bookmarks. Never build a citation out
  of array indices.
- All public responses carry `Cache-Control: public, max-age=900`. Since a
  published book is immutable until republished, the FE may cache chapters
  aggressively (localStorage / IndexedDB) — this also gives **offline reading**
  for free. On republish, only the affected chapter's cache needs to change.

---

## 6. Signed-in reader features (token auth)

Under `/api/v1/me/`: `me`, `notes`, `bookmarks`, `progress`. These personalize
the reader (highlight a para, bookmark a `canonical_ref`, resume where you left
off). Anchor all of them to `canonical_ref`, not to positions. `GET /me/`
returns `id`, `email`, `name`, `user_type`; `PATCH /me/` sets `name`.

### 6.1 Signing in

Readers authenticate through **django-allauth headless, `app` client**, at
`/_allauth/app/v1/…`:

| Action | Call |
|---|---|
| Sign up | `POST /auth/signup` `{email, password}` |
| Sign in | `POST /auth/login` `{email, password}` |
| Sign out | `DELETE /auth/session` |
| Change password | `POST /account/password/change` `{current_password, new_password}` |

A successful signup or login answers `200` with `meta.session_token`. **Send
that token as an `X-Session-Token` header on every later request**, to
`/_allauth/` and `/api/v1/me/` alike. No cookie is involved and no CSRF token
is needed.

Why a header and not a session cookie: the FE and the API are on different
registrable domains, which makes a session cookie third-party. iOS Safari
blocks those outright, so cookie auth would work on the desktop it was built
on and fail on the phones this app is mostly read on. The cookie-based
`browser` client stays mounted at `/_allauth/browser/v1/…` for the day the FE
moves to a `welfareinfo.net` subdomain; switching back is then an FE-only
change. Public reading needs no auth of any kind.

**Readers and operators share one `User` table but never one surface.** Every
account created here is `user_type="public"`, forced non-staff by the signup
adapter, and bounced away from `/panel/` on sight. allauth's own HTML pages are
switched off (`HEADLESS_ONLY`), so `/accounts/signup/` is a `404` — the FE's
screens are the only reader-facing auth surface.

### 6.2 Password recovery (alpha limitation)

No mail is sent yet. Changing a password requires the **old** password, which
is a pure API round-trip. A reader who has forgotten theirs is reset by a
manager in `dj-admin` until SMTP is configured; the email-based reset endpoints
are already wired and start working the moment `EMAIL_HOST` is set and
`ACCOUNT_EMAIL_VERIFICATION` is flipped to `"optional"`. Sign-up does not
verify the address. Google sign-in is built but dark (no Google API project).

**Origins and cookies.** The FE is a different origin, so its browser-side
calls need the API to allow that origin — set `CORS_ALLOWED_ORIGINS` on the
BE for every FE host (production, and Vercel previews via
`CORS_ALLOWED_ORIGIN_REGEXES`). Server-rendered fetches never hit CORS, which
is why a missing entry shows up as "the first page renders, the next one
fails to load" rather than as an outright failure. The panel is excluded from
CORS entirely.

CORS covers `/api/`, `/accounts/` and `/_allauth/`, and `x-session-token` is an
allowed request header. Leaving `/_allauth/` out is the classic version of this
bug: sign-in returns a perfectly good `200` that the browser then discards.

Cookies no longer matter to the FE — see §6.1, the session travels in a header.
`CROSS_SITE_COOKIES` remains only for the cookie-based `browser` client.

---

## 7. Frontend stack note (recommendation, FE dev decides)

Next.js (App Router) is a good fit: published content is immutable, so book and
chapter pages can be statically generated / ISR and served from a CDN with near-
zero backend load; server rendering makes the Hindi text SEO-indexable and
`canonical_ref` deep links shareable; interactive bits (page transitions, TTS
highlight-sync via the chosen rendition's `para_timings`, notes/bookmarks) stay client-
side. A plain SPA works too but needs extra work for SEO and first-load.

---

## 8. What "published" requires (so the FE contract always holds)

Publish of a book is **blocked** unless **every chapter has `start_page` and
`end_page`** — for both `print` and `digital` books. This guarantees §2.2 and
§4 never break. Operators can auto-fill ranges from paras with one click in the
panel; digital books get synthetic (editorial) page numbers the same way.

---

## 9. Beyond the reader — other live endpoints & what's not built yet

The sections above are the **frozen reader contract**. The same `/api/v1/`
also serves other published content (browse `/api/v1/docs/` — Swagger — for
exact shapes; these may still evolve, unlike §§0–8):

| Endpoint | What it returns |
|---|---|
| `GET sections/` | Content sections (used as `?section__code=` filter everywhere). See §10. |
| `GET book-genres/` | The Originals shelf's filter chips. See §11. |
| `GET folders/` · `GET documents/` | The Resources file library. See §13. |
| `GET audio/series/` · `GET audio/` | Discourse audio series and tracks. Filters: `?section__code=`, `?series=`. |
| `GET videos/` · `GET playlists/` | Embedded YouTube videos and curated playlists. Filter: `?section__code=`. |
| `GET centers/` · `GET events/` · `POST events/{id}/register/` | Centers, events, event registration. |
| `GET search` | Hybrid (semantic + keyword) search over published book paragraphs — see §9.1. |

All of these follow the same rules as the reader endpoints: anonymous,
read-only (except event register), published-only, cached.

**Not yet built (planned BE work — do not code against these yet):**

- **Chat assistant API** — half of this shipped: the *retrieval* half of the
  welfare engine is now public as §9.1, so "find me the paribhasha" is answered
  today. What is still unbuilt is the **answering** layer — a rate-limited,
  SSE-streaming endpoint that spends an LLM call per question
  (`docs/FE_Decision_Guide.md` §4). It will be a contract **addition**, will
  require sign-in and a per-day cap (an answer costs ~1000× a search), and will
  call the same §9.1 retrieval underneath.
- **Push notifications** — Web Push (VAPID) subscribe/unsubscribe endpoints and
  the panel-side `notifications` app (`FE_Decision_Guide.md` §6) are planned,
  not present.

Both will be documented here (or in a v2 contract) when they land; nothing in
§§0–8 will change shape because of them.

### 9.1 `GET /api/v1/search` — reader search

Hybrid search (pgvector semantic + Postgres full-text, RRF-merged) over
published book paragraphs. Anonymous, throttled, no auth of any kind.

**Scope: originals only.** Translations and resource documents are never
indexed and never returned. Two reasons, both about answer quality: retrieval
is tuned end to end for Devanagari (the keyword leg uses Postgres' `simple`
config because Hindi has no stemmer, and the embedding model was chosen against
Hindi दर्शन terminology), and a citation must be quotable back to Nagraj ji
rather than to a student's rendering. The FE should not offer a "search
translations" or "search resources" control — both would return nothing.

**Engine swapped 28 Jul 2026.** This URL previously fronted Meilisearch, whose
container was never deployed — so it answered every reader query with
`estimated_total: 0`, silently, for as long as it existed. It now runs the same
retrieval engine MD Chat uses. The envelope was kept byte-compatible, so the
change needed no client edit.

| Param | Meaning |
|---|---|
| `q` **(required)** | Devanagari, Hinglish or English; 2+ characters |
| `book` | restrict to one book code, e.g. `MVD` |
| `section` | narrow *within* the corpus. It cannot widen it — `section=translations` returns nothing |
| `limit` | max hits — default 25, max 50 |
| `raw=1` | search exactly as typed; skip the Devanagari rewrite |

```json
{
  "query": "anubhav",
  "searched_as": "अनुभव",
  "mode": "hybrid",
  "terms": ["अनुभव"],
  "results": {
    "paragraphs": {
      "estimated_total": 25,
      "hits": [
        {
          "type": "text",
          "canonical_ref": "ADVD 5.49.2",
          "book_code": "ADVD",
          "book_title": "अनुभवात्मक अध्यात्मवाद",
          "chapter_number": 5,
          "chapter_title": "सारणी - जागृत जीवन के 122 आचरण",
          "page_number": 49,
          "snippet": "…प्रभाव क्षेत्र वश 'अनुभव' का बोध बुद्धि में…",
          "text": "इसी प्रभाव क्षेत्र वश 'अनुभव' का बोध बुद्धि में …",
          "context_before": "अस्तित्व सहज रूप में …",
          "context_after": "अनुभव प्रमाण के रूप में …",
          "score": 0.015873,
          "matched": "both"
        }
      ]
    },
    "paribhasha": {
      "estimated_total": 1,
      "hits": [
        {
          "id": 412,
          "hindi": "अनुभव",
          "hinglish": "anubhav",
          "definitions": ["जानने की क्रिया।", "…"],
          "matched": "exact"
        }
      ]
    }
  }
}
```

Three response fields change what the UI should say:

- **`searched_as`** — the books are Devanagari, so a Latin query is rewritten
  before it is searched. Show it ("showing results for अनुभव") and offer
  `raw=1` as the way back; a reader who typed English and got the wrong
  translation otherwise has no escape. Empty when nothing was rewritten.
- **`mode`** — `hybrid` = meaning + words; `keyword` = word matches only,
  because the embedding provider was unavailable or this caller's vector budget
  was spent. **The endpoint never fails for provider trouble, it degrades** —
  the keyword leg is plain Postgres and is always up.
- **`terms`** — the query words worth marking in a snippet, longest first (3+
  characters, so particles like कि/और are excluded).

Each hit carries the passage at three widths, because one is never enough:

| Field | What it is | Where it belongs |
|---|---|---|
| `snippet` | ~240 chars cropped around the match | the collapsed result row |
| `text` | the paragraph in full | shown when the reader expands it |
| `context_before` / `context_after` | the paragraphs either side, trimmed to ~240 chars; `""` at a chapter's first/last paragraph | around the expanded passage |

The neighbours are not padding. The median paragraph in this corpus is about
**107 characters** — shorter than the snippet — because so much of it is
sutras, and a one-line sutra read alone is frequently not judgeable. What tells
a reader whether this is the passage they wanted is what sits either side of
it.

They ship with the results rather than being fetched on expand, which costs
about **11 KB gzipped for a full 25-result page** (4 KB → 15 KB). Expanding is
how a reader triages a result list, and a triage step that costs a round-trip
on a slow phone is one nobody takes.

`matched` on each hit is `vector` (found by meaning), `keyword` (found by
words) or `both`.

**`results.paribhasha` — the definition card.** Readers use one box for two
questions: "where is this discussed" and "what does this word mean". The
paragraph index answers the second badly — a one-word query returns the twenty
places the word appears, none of which is its definition. So the glossary
(§14) answers alongside, in its own block with its own shape, and the FE shows
it **above** the passage hits as a परिभाषा card.

The key is always present; `hits` is `[]` when the glossary knows nothing
about the query, which is the common case for phrase searches. `matched` is
`exact` (the headword), `keyword` (spelling or definition text) or `vector`
(semantic — only attempted when the cheap matches found nothing, and only
above a confidence floor, because a confidently wrong definition is worse than
none). The glossary is matched against `searched_as` when a rewrite happened,
so Hinglish queries reach it without a second transliteration call.

**Not paginated.** The whole ranked set returns in one call, so "show more" is
a client-side reveal costing no round-trip. Paragraphs under 30 characters are
never returned: they are headings, and they rank high on single-term similarity
while telling a reader nothing.

**Limits.** 30 requests/minute and 300/hour per IP (`429` past that). Past 60
searches in an hour a single IP keeps working but loses the semantic leg — the
embedding provider's rate limit is shared by every reader, so an abusive caller
is degraded rather than refused.

**Text only.** Audio and video are not searched; that needs transcripts. The
`results` map and each hit's `type` are already keyed for them, so AV arrives
as an extra key rather than a new contract.

**Logging.** Every search is recorded with no identity attached — no user, no
session, no IP (`SearchQueryLog`: query, rewrite, mode, result count,
duration). What a reader types into a book search is corpus vocabulary, not
personal data. Zero-result rows are the useful ones: each is either a gap in
the corpus or a word retrieval does not understand yet.

---

## 10. Sections

There are exactly **three** sections, and their codes are the frontend's
workspace ids verbatim — so `?section__code=` needs no translation on either
side, and there is no mapping table to keep in sync.

| `code` | `name_hi` | `name_en` |
|---|---|---|
| `originals` | मूल | Originals |
| `translations` | अनुवाद | Translations |
| `resources` | संसाधन | Resources |

### 10.1 `GET /api/v1/sections/`

```json
[
  { "code": "originals",    "name_hi": "मूल",     "name_en": "Originals",    "ordering": 1, "description": "…" },
  { "code": "translations", "name_hi": "अनुवाद",  "name_en": "Translations", "ordering": 2, "description": "…" },
  { "code": "resources",    "name_hi": "संसाधन",  "name_en": "Resources",    "ordering": 3, "description": "…" }
]
```

Returned sorted by `ordering` — use it for the workspace strip. `name_hi` is
what the public site shows; `name_en` exists for English surfaces.

**The FE must not hardcode its own section list.** Read these three from the
endpoint, so a later change to a name or order needs no FE deploy.

### 10.2 The frontend's other two workspaces

The FE also has **My Journey** and **Connect**. Neither is a section, and
neither ever appears in `sections/`:

- **My Journey** is the signed-in user's own data — notes, bookmarks, reading
  progress. See §6 (`me/notes/`, `me/bookmarks/`, `me/progress/`).
- **Connect** is the events and centers module. `Center` and `Event` carry no
  section FK, so `events/` and `centers/` are never filtered by
  `?section__code=`. Panel-side, editing them is gated on the rbac `events`
  module, not on any section.

Community-facing books, audio and video are ordinary `resources` content.

### 10.3 Each shelf has its own filter axis

The three sections hold different *kinds* of thing, so they do not share one
filter control. This is the shape of the whole content model:

| Section | Primary axis | Endpoint that supplies it | UI |
|---|---|---|---|
| `originals` | **genre** (दर्शन / वाद / शास्त्र / परिचय …) | `GET book-genres/` (§11) | chips |
| `translations` | **language** (+ translator) | `language` on each book (§12) | chips |
| `resources` | **purpose doors + facets** (PRD v2 §5.6) | `GET resources/doors/` + facet params (§13) | doors → chips |

Do not put a genre chip on the Resources shelf, or a folder tree on Originals.
Each axis exists because that shelf's content is organized that way.

---

## 11. Book genres — the Originals shelf's chips

A genre is *what kind of writing a book is*. It is *not* `book_type`, which is
a different question entirely:

| Field | Question it answers | Values |
|---|---|---|
| `genre` | What kind of writing is this? | `darshan`, `vaad`, `shastra`, `parichay`, `diary`, `other`, + any the managers add |
| `book_type` | Are the printed page numbers real? | `print`, `digital` |

A handwritten diary is `genre: "diary"` **and** `book_type: "digital"`, and the
FE needs both — one picks the chip, the other decides how loudly to show page
numbers (§1).

### 11.1 `GET /api/v1/book-genres/`

```json
[
  { "code": "darshan",  "name_hi": "दर्शन",  "name_en": "Darshan",  "description": "…", "ordering": 1, "book_count": 4 },
  { "code": "vaad",     "name_hi": "वाद",    "name_en": "Vaad",     "description": "…", "ordering": 2, "book_count": 3 },
  { "code": "shastra",  "name_hi": "शास्त्र", "name_en": "Shastra",  "description": "…", "ordering": 3, "book_count": 3 },
  { "code": "parichay", "name_hi": "परिचय",  "name_en": "Parichay", "description": "…", "ordering": 4, "book_count": 2 },
  { "code": "diary",    "name_hi": "डायरी",  "name_en": "Diary",    "description": "…", "ordering": 5, "book_count": 0 },
  { "code": "other",    "name_hi": "अन्य",   "name_en": "Other",    "description": "…", "ordering": 99, "book_count": 1 }
]
```

Sorted by `ordering` — render chips in that order.

**The FE must not hardcode this list.** Same rule as `sections/`, and here it
matters more: genres are a manager-editable table precisely so a new kind of
writing (Notes, Letters, compilations) can appear without an FE deploy. A
hardcoded list would silently drop those books off the shelf.

**Hide chips whose `book_count` is 0** — an empty chip is a dead filter.
`book_count` counts published books only.

### 11.2 Filtering

`GET books/?genre=darshan` returns every published book of that genre —
**including translations of those books** (§12). `genre` on a book row is
already the effective one, so the FE never has to resolve inheritance itself.

There is deliberately **no `resources` genre**: which shelf a book sits on is
already answered by `section`, and a second field saying the same thing could
disagree with it.

---

## 12. Translations

A translation is a **separate book row** in the `translations` section that
points back at the original it renders. The same original translated by three
students is three rows.

| Field | Meaning |
|---|---|
| `language` | ISO 639-1 code — `en`, `mr`, `ta` … Originals are always `hi`. |
| `language_label` | Ready-to-display name, e.g. `"English"`, `"मराठी (Marathi)"`. |
| `translator` | Who translated *this* edition. `author` stays the original author (ए. नागराज). |
| `translation_of` | The original's `code`, e.g. `"MVD"`. `null` on an original. |

**Genre is inherited, never stored twice.** A translation's `genre` field is
already filled in with the original's genre by the API, so an English MVD comes
back as `genre: "darshan"` and answers `?genre=darshan`. Re-filing the original
re-files every translation of it at once.

**No chains.** A translation always points at an originals-section book, never
at another translation, so `translations[]` on a translation is always `[]`.

### 12.1 On the original's page

`GET books/MVD/` includes:

```json
"translations": [
  { "code": "MVD-EN", "title_hi": "…", "language": "en", "language_label": "English", "translator": "…" },
  { "code": "MVD-MR", "title_hi": "…", "language": "mr", "language_label": "मराठी (Marathi)", "translator": "…" }
]
```

Published translations only. Render it as "इस पुस्तक के अनुवाद" and link each to
`/books/{code}`.

### 12.2 Citations do not cross languages

A translation's printed pages do not line up with the original's, so
`MVD-EN 3.42.5` is **not** the same passage as `MVD 3.42.5`. Never map a
canonical ref from one language onto another. Show the translation's own refs,
and link to the original book as a whole (via `translation_of`), not to a
specific paragraph in it.

### 12.3 Translations are not searchable

`GET search` covers **originals only** (§9.1). Retrieval is tuned end to end
for Devanagari, and a citation has to be quotable back to Nagraj ji rather than
to a student's rendering. Do not offer a "search in translations" control — it
would return nothing.

---

## 13. Resources — collections behind purpose doors *(PRD v2 §5.6)*

The unit of the shelf is the **Collection** (one shivir bundle, one संकलन,
one chart set — D15), not the file. Browsing is **purpose doors → facet chips
→ collection cards**; the folder tree survives only as the archivist's
"सभी फ़ाइलें" fallback. An item is served as the file it is: no chapters, no
paragraphs, no canonical refs, no read-aloud, no content indexing.

Provenance (D14) rides on every card and item as `provenance` +
`provenance_hi`: `moola` मूल 🔵 / `sankalan` संकलन 🟡 / `adhyayan` अध्ययन ⚪.
The same pair now also appears on audio tracks and videos (may be `""` on
legacy rows — hide the badge then).

### 13.1 `GET /api/v1/resources/doors/` — the landing page

```json
[{ "code": "shivir_samagri", "name_hi": "शिविर सामग्री", "description": "…",
   "ordering": 2, "collection_count": 12 }]
```

Doors with nothing servable behind them are **not returned** — render exactly
what arrives. Manager-extendable: never hardcode the seven seeded doors.

### 13.2 `GET /api/v1/resources/topics/` — the विषय chips

Same shape (`collection_count` per topic). All topics are returned; hide
zero-count chips. Chip order **inside a door**: विषय → वर्ष → स्थान → व्यक्ति
→ भाषा → and *last* प्रकार (kind).

### 13.3 `GET /api/v1/resources/collections/` — the cards

Facet filters: `?door=`, `?topic=`, `?year=` (prefix match), `?place=`,
`?person=`, `?language=`, `?kind=` (pdf/audio/image — has ≥1 published item of
that kind), `?provenance=`, `?section__code=`. Paginated.

```json
{
  "id": 7, "title_hi": "अमरकंटक शिविर 2005", "section": "resources",
  "door": "shivir_samagri", "door_name_hi": "शिविर सामग्री",
  "description": "…", "cover_url": null,
  "provenance": "moola", "provenance_hi": "मूल",
  "topics": ["vyavastha"], "tags": [], "year": "2005", "place": "अमरकंटक",
  "people": "ए. नागराज", "language": "hi", "language_label": "हिन्दी (Hindi)",
  "item_count": 14, "kinds": ["audio", "pdf"], "updated_at": "…"
}
```

Only servable collections arrive: published, with ≥1 published openable item.
Cards are a **grid of covers/thumbnails, never a list of filenames**.

### 13.4 `GET /api/v1/resources/collections/{id}/` — the album view

The card plus `items` (published, in `sequence` order):

```json
"items": [{ "id": 88, "title": "भाग 1", "kind": "audio", "kind_label": "Audio",
  "url": "https://…/part1.opus", "sequence": 1, "description": "",
  "provenance": "moola", "provenance_hi": "मूल",
  "file_size": 2411008, "page_count": null, "duration_seconds": 3120,
  "updated_at": "…" }]
```

- `url` is always present and absolute on a published item — publish is
  blocked without a file or a link behind it. It may point at our media host
  or wherever the file still lives during migration; treat both the same.
- Item `provenance` is the *effective* one (its own override, else the
  collection's).
- Consumption per kind: audio → the existing player in album mode (resume,
  speed, background); pdf → in-app viewer, download available never forced;
  image → gallery with lightbox + pinch-zoom.

### 13.5 `GET /api/v1/resources/search/?q=` — the संसाधन lane (D12)

Metadata only — never file contents. Returns three labeled lists the FE
renders as ONE संसाधन lane, always separate from the पुस्तकों-में citation
lane:

```json
{ "q": "अमरकंटक", "collections": [ …cards… ], "audio": [ …tracks… ], "video": [ …videos… ] }
```

### 13.6 `GET /api/v1/vani/` — "नागराज जी की वाणी" (home door)

Everything published with `provenance = moola` across all sections, in the
same three-list shape as 13.5. The reader never needs to know which shelf
holds it underneath.

### 13.7 Folders — the archivist's fallback only

- `GET /api/v1/folders/` — one level (`?parent=`, root when omitted); each
  row carries `breadcrumb`, `folder_count`, `item_count` (published, direct).
  Branches with nothing published beneath them are not returned at all.
- `GET /api/v1/resources/items/?folder=<id>` — that folder's published items.

Reachable only under "सभी फ़ाइलें"; never the default view. `source_path`
(the original pCloud path) is searchable metadata but is never served for
navigation.

### 13.8 What resources deliberately do not have

No `canonical_ref`, no chapter/paragraph endpoints, no TTS renditions, no
citation-search hits, and no genre. If a resource ever deserves the full
reader treatment, it is re-created as a proper Book (possibly PDF-only first,
§5.1.3) — a manager decision, not an FE one.

### 13.9 PDF-only Books (§5.1.3)

Every book now carries `is_pdf_only`. When `true`: no chapters/paragraphs
exist yet — the reading experience is `GET /api/v1/books/{code}/pdf/` (302 to
a short-lived signed URL) in the in-app viewer, clearly labeled PDF-only. The
flag flips off by itself when the book is pipelined; links keep working.

---

## 14. परिभाषा — the glossary

2,802 words with 3,867 definitions, migrated from the jv_adhyaan project where
they were compiled against *परिभाषा संहिता*. It is a **standalone dictionary,
not book content**: no `canonical_ref`, no chapter, no page shown to readers,
no publish workflow. A word is either visible or hidden, and the panel at
`/panel/paribhasha/` is where that is decided.

**It is not a fourth section.** Like search and Sutra of the day, it is a
cross-cutting utility — the three workspaces stay `originals` /
`translations` / `resources` (§10).

The glossary reaches readers on three surfaces, and each has its own endpoint
because each is called at a different moment.

### 14.1 `GET /api/v1/paribhasha/` — the glossary page

Cursor-paginated **alphabetically** (not by creation date), 50 per page.

| Param | Meaning |
|---|---|
| `q` | ranked search: exact headword → Roman spelling → folded spelling → prefix → text anywhere (word, then definitions). Returns one screenful (max 20), unpaginated — a dictionary search that paginates has already failed to find the word |
| `letter` | Devanagari initial, e.g. `अ` — the A–Z index |

```json
{
  "next": "…", "previous": null,
  "results": [
    {"id": 412, "hindi": "अनुभव", "hinglish": "anubhav",
     "definitions": ["जानने की क्रिया।", "प्रमाणित होने की स्थिति।"]}
  ]
}
```

`definitions` is a list of plain strings in the order a manager arranged them —
read as one explanation, not as alternatives. There is nothing else on a
definition to send.

**Roman spelling is a first-class key.** Readers type on Latin keyboards, and
nobody agrees how to spell Hindi in Latin letters, so each word carries a
*folded* form of its transliteration (lowercase, doubled letters and long/short
vowels collapsed, trailing inherent vowel dropped). `anubhav`, `anubhaav` and
`anubhava` all reach अनुभव. The FE does not need to do anything for this — just
pass what was typed.

### 14.2 `GET /api/v1/paribhasha/{id}/` — one word

Same object as a list row. 404 for a hidden word.

### 14.3 `GET /api/v1/paribhasha/index/` — the underlining index

```json
{"count": 2802, "version": "2026-07-29T16:04:11.882Z",
 "words": [{"id": 412, "hindi": "अनुभव"}, …]}
```

Every headword and nothing else, **unpaginated by design**, cached for a day.

This is what makes tap-to-define possible: the FE downloads it once, keeps it
(IndexedDB), and marks known words in the text it renders — locally, offline,
with no request per paragraph. 2,802 short strings are well under 100 KB
gzipped; a round-trip per rendered paragraph would cost far more, forever.
`version` is the newest `updated_at` anywhere in the glossary, words **and**
definitions — unchanged means the cached copy is still current and the
download can be skipped. Correcting a definition moves it, so a client may
hold definitions on the strength of it.

**`?full=1` — the whole dictionary in one response.**

```json
{"count": 2802, "version": "…",
 "words": [{"id": 412, "hindi": "अनुभव", "hinglish": "anubhav",
            "definitions": ["जानने की क्रिया।", "…"]}, …]}
```

Same envelope, same `version`, same day-long cache; the rows are the §14.1
shape instead of the bare pair. About **143 KB gzipped** for all 2,802 words
and 3,867 definitions.

It exists because there was no other way to hold the dictionary offline.
Assembling it from `/paribhasha/` means 57 chained cursor pages — 50 rows
each, every page waiting on the previous page's cursor — which measured 53
seconds on a wired connection and would be minutes on a phone. A reader who
downloads a book expects its words to be explicable on the train.

Both forms stay. Underlining needs headwords alone and is off by default, so
the lean 25 KB response is what a reader who never opens a definition should
pay. Fetch `full=1` when the glossary is actually used — the first tap, or a
book download — and taps stop touching the network at all.

**Matching is the FE's job, and should start conservative.** Match on whole
words only in v1. Hindi inflects (अनुभव → अनुभवपूर्वक, अनुभव को), so a naive
prefix match will underline things it should not, and a wrong underline is
worse than a missed one — it promises a definition that then does not fit.
Widen only against real text, and give readers a setting to turn underlining
off entirely; a page with a line under every second word is unreadable.

That last sentence is not hypothetical. Measured against MAND ch.3 (1,889
words), plain whole-word matching marks **41.8% of the text** — this glossary
was compiled against these very books, so its headwords are the corpus's own
vocabulary. The FE brings it to ~20% by preferring the longest phrase, marking
a word only on its first appearance on a page, and leaving very short words
alone. Anyone building a second client should expect the same and plan for it.

### 14.4 `GET /api/v1/paribhasha/lookup/?word=अनुभव` — the tap

Answers with **one word or 404** — never a list. The reader tapped a specific
word and the popover has room for its meaning, not for a menu of guesses. It
tries the exact headword, then the exact Roman spelling, then the folded one.

### 14.5 Also in search

`GET /api/v1/search` carries a `results.paribhasha` block for the same query —
see §9.1. The glossary page and the search card are different entry points to
the same rows.
