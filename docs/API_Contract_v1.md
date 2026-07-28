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

**Addressing (v1.1, backward-compatible).** All three accept `canonical_ref`
on write and return it on read:

| Endpoint | Write | Read adds |
|---|---|---|
| `POST me/notes/` | `{canonical_ref, text}` | `canonical_ref`, `text_hi` |
| `POST me/bookmarks/` | `{canonical_ref}` | `canonical_ref`, `text_hi` |
| `POST me/progress/` | `{canonical_ref}` | `canonical_ref`, `book_code`, `book_title` |

`text_hi` is the paragraph the row is anchored to, so a saved list renders the
passage itself instead of a bare reference.

`POST me/progress/` with a `canonical_ref` upserts **one row per book** — the
ref's book is the target and `position` is set to the paragraph's `sequence`.
Sending a newer ref for the same book replaces the previous position.

The older `target: "<type>:<id>"` form still works and is still the only way to
address audio and video, which have no `canonical_ref`. It is not usable for
reader content: this API deliberately never exposes paragraph or book primary
keys, so a client holding a `canonical_ref` cannot construct one. Rows whose
target has no `canonical_ref` return it as `""`.

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

---

### 9.1 `GET /api/v1/search` — reader search

Hybrid search (pgvector semantic + Postgres full-text, RRF-merged) over
published book paragraphs. Anonymous, throttled, no auth of any kind.

**Engine swapped 28 Jul 2026.** This URL previously fronted Meilisearch, whose
container was never deployed — so it answered every reader query with
`estimated_total: 0`, silently, for as long as it existed. It now runs the same
retrieval engine MD Chat uses. The envelope was kept byte-compatible, so the
change needed no client edit.

| Param | Meaning |
|---|---|
| `q` **(required)** | Devanagari, Hinglish or English; 2+ characters |
| `book` | restrict to one book code, e.g. `MVD` |
| `section` | restrict to a section code, e.g. `originals` |
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
