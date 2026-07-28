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
`subtitle_hi`, `author`, `section`, `book_type`, `edition`, `publication_year`,
`description`, `cover_image`, `page_count`, `tags`. Filter: `?section__code=MOOL`.

### 2.2 `GET /api/v1/books/{code}/` — book detail + TOC

Book summary **plus `chapters[]`** (the table of contents). Each chapter:

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

## 6. Signed-in reader features (session auth)

Under `/api/v1/me/` (session auth via allauth login at `/accounts/`): `me`,
`notes`, `bookmarks`, `progress`. These personalize the reader (highlight a
para, bookmark a `canonical_ref`, resume where you left off). Anchor all of
them to `canonical_ref`, not to positions.

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
| `GET sections/` | Content sections (used as `?section__code=` filter everywhere). |
| `GET audio/series/` · `GET audio/` | Discourse audio series and tracks. Filters: `?section__code=`, `?series=`. |
| `GET videos/` · `GET playlists/` | Embedded YouTube videos and curated playlists. Filter: `?section__code=`. |
| `GET centers/` · `GET events/` · `POST events/{id}/register/` | Centers, events, event registration. |
| `GET search` | Keyword search over published content. |

All of these follow the same rules as the reader endpoints: anonymous,
read-only (except event register), published-only, cached.

**Not yet built (planned BE work — do not code against these yet):**

- **Chat assistant API** — the welfare search/ask engine currently lives at an
  internal panel URL only. A public, rate-limited, SSE-streaming chat endpoint
  for the FE assistant (navigation help + cited paribhasha/book search, per
  `docs/FE_Decision_Guide.md` §4) will be added as a contract **addition**.
- **Push notifications** — Web Push (VAPID) subscribe/unsubscribe endpoints and
  the panel-side `notifications` app (`FE_Decision_Guide.md` §6) are planned,
  not present.

Both will be documented here (or in a v2 contract) when they land; nothing in
§§0–8 will change shape because of them.
