# MD Study — reader app

The public reading app for मध्यस्थ दर्शन (जीवन विद्या): A. Nagraj ji's books,
their translations, and the library of everything around them. Next.js App
Router, deployed on Vercel, talking to a Django backend (sibling repo `MDApp`).

**Roughly 90% of readers are on a phone.** When a change trades desktop polish
for phone reading, phone reading wins.

## Running it

```bash
npm install && npm run dev
```

Then open http://localhost:3000.

Configuration lives in `.env.local` — copy the keys from `.env.example`. The
only one that must be right is:

```
NEXT_PUBLIC_API_BASE_URL=https://mdbe.welfareinfo.net/api/v1/
```

The deployed backend allows `localhost:3000`, so the app runs against real data
with no proxy.

### Working against a local backend

The production library tree is deliberately near-empty, so library work cannot
be watched against it. The backend repo has `manage.py seed_sample_library`
(DEBUG only) which fills a dev database with a branch of every shape. Point the
app at it with a **`.env.development.local`** holding

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1/
```

Next reads that file *above* `.env.local`, so your own settings stay untouched.
Delete it before building.

## How the app is laid out

| Route | What it is |
|---|---|
| `/` | Home — sutra of the day, resume reading, the shelves |
| `/books`, `/books/[code]` | Originals shelf, and one book |
| `/translations` | Translations shelf |
| `/read/…` | The reader. Renders **outside the app shell** on purpose — the text owns the viewport |
| `/resources` | The library's top level: the doors, and the विषय chips |
| `/library/[id]` | **Any folder, at any depth** — one component, recursed by route |
| `/library?topic=` | One विषय, across the whole library |
| `/paribhasha` | The glossary |
| `/search` | Book citations and the संसाधन lane, side by side, never merged |
| `/connect`, `/me` | Centers and events; the reader's own notes and bookmarks |

`/library/[id]` is the piece worth understanding first. The backend returns the
**same shape at every depth**, so depth 1 and depth 6 are one component: a
folder with no sub-folders renders as an album with a player, and a folder
holding sub-folders renders as an index.

## Documents

- **`docs/API_Contract_v1.md`** — the backend contract, and the authority on
  every payload. Copied from the BE repo; re-copy it rather than editing it
  here. §13 is the library.
- **`docs/MD_FE_PRD_v2.md`** — the product spec for this app.
- **`docs/push-notifications.md`** — the FCM setup.
- **`AGENTS.md`** — read before writing code. This Next.js version has breaking
  changes from what most models were trained on, and the local docs in
  `node_modules/next/dist/docs/` are the authority.

For how content gets *into* the app, see the backend repo's
`docs/library_manager_manual.md` — §9 maps every panel action to what a reader
ends up seeing.

## Conventions

- **UI chrome is English; content is whatever the material is.** The
  reader-facing Hindi labels for workspaces, genres and provenance live in this
  repo — the API sends English names, and the Hindi belongs to the design.
- Commits go straight to `main`.
