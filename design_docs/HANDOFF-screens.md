# Handoff — building the remaining designer screens

Paste everything below the line into a new Claude Code session opened in the
frontend repo. It is written to be read cold, on a different machine, with no
memory of the sessions that produced screens 1A–1D.

---

I'm continuing a project where we build the app's screens to a designer's spec.
Screens 1A–1D (the Originals workspace) are done, mobile and desktop. I want the
same treatment for the remaining screens. Read this whole brief before touching
anything.

## Repos

- Frontend (your working directory): Next.js 16 + React 19 + Tailwind v4.
  **Read `AGENTS.md` first — this is not the Next.js in your training data, and
  the guides in `node_modules/next/dist/docs/` are the authority.**
- Backend: a sibling folder, `../MDApp` — Django. I am PM for both, so a defect
  that turns out to be the BE's is in scope: diagnose it there, don't paper over
  it in the frontend.

## The spec file, and how to actually read it

`design_docs/screens/MD Study Screens (standalone).html`

Do not try to read it directly — it is ~600KB of one line. The real markup is a
**JSON-encoded string** on the line beginning `"<!DOCTYPE`. Extract it first:

```python
import json
p = "design_docs/screens/MD Study Screens (standalone).html"
for line in open(p, encoding="utf-8").read().split("\n"):
    if line.startswith('"<!DOCTYPE'):
        open("/tmp/spec.html", "w", encoding="utf-8").write(json.loads(line))
```

Then find each screen by its badge (`10A`, `9A`, …):

```bash
grep -n 'border-radius: 7px;">[0-9]' /tmp/spec.html
```

Every section holds, in order: a **mobile** phone frame, a **desktop** 1280×800
frame, and a **"Spec" card** listing User goal / Layout / Components /
Interaction / States / Accessibility. The Spec card is the most valuable part —
it states intent the pixels only imply, and it is where the empty, loading and
error states are defined. Read it for every screen.

Strip `<svg>` blocks before reading a section or the inline paths will bury the
structure.

## Screens still to build

| Badge | Screen | Route today | Data |
|---|---|---|---|
| 2A | Assistant — Search mode & Chat mode | `/search` (search half) | ready |
| 3A | Audio · प्रवचन + persistent player | `/audio` | ready |
| 3B | Settings & the Originals workspace switcher | `/me/settings` | ready |
| 4A | Translations workspace — मूल + English reader | `/translations` | empty |
| 5A | Videos — within the Audio tab | `/videos` | ready |
| 6A | Tokens & components | — | n/a |
| 7A | Study resources workspace — Home (category tiles) | `/resources` | ready |
| 7B | Study resources — Browse (drive-style folder navigation) | `/resources` | ready |
| 7C | Study resources — Saved (downloaded materials) | `/resources` | ready |
| 8A | My journey — streaks, goals & practice log | `/me` | **blocked** |
| 8B | My journey — highlights & notes (combined, filterable) | `/me/notes`, `/me/bookmarks` | ready |
| 9A | Connect — Events, Centres & News & updates | `/connect` | partial |
| 10A | Workspace switcher — 5 workspaces, colour-coded | — | ready |

Done: 1A Home, 1B Library, 1C Book detail, 1D Reader.

**Most of these are not greenfield.** The "Route today" column is there to say
so: the route, its data fetching and a first-pass UI already exist for nearly
every screen. The work is bringing an existing screen to the spec, not building
one from nothing. Read the route before you design anything, and preserve what
is already right — a rewrite that loses working data plumbing is a regression
even if it matches the spec more closely.

### The blocked screen

- **8A My journey.** `../MDApp/apps/accounts/models.py` has `Note`, `Bookmark`
  and `Progress` — and nothing for streaks, goals or a practice log. Roughly
  half of 8A has no field to render. Do not start it and do not fill the gap
  with invented data; raise it with me. 8B, by contrast, is entirely backed by
  the existing notes and bookmarks endpoints, so it is the half of "My journey"
  that can be built today.

### 2A, and the API that was just built for it

2A has two modes and they are different animals. **Search mode** is anonymous,
cheap and already live at `/api/v1/search` (`search()` in `src/lib/api.ts`),
driving `/search`. **Chat mode** is signed-in, costs an LLM call per question,
and until now existed only as a server-rendered tester page inside
`../MDApp/apps/feapp` that this frontend could not reach.

It is now a JSON API — `/api/v1/chat/` (`../MDApp/apps/welfaresearch/chat_api.py`),
with the client already written as `src/lib/chat.ts` and typed in
`src/lib/types.ts`. Four things about it shape the screen:

- **It is metered.** Every response carries `quota` — 30 questions a day per
  reader, managers exempt. Show what is left; do not let a reader discover the
  limit by being refused. A 429 is the cap (its `detail` is already worded for
  the reader, in Hindi and English); a 503 is the answer service being down, and
  the question was not spent.
- **Answers cite, and the citations are verified.** `citations[]` only ever
  contains refs that matched a real retrieved passage, so each one is safe to
  render as a link into the reader. Refs the model invented are flagged inside
  the answer text instead — do not parse them back out.
- **Follow-ups pass `continueFrom`**, the id of the answer being followed up
  on; the backend rebuilds the conversation from that reader's own stored
  questions. A new conversation is simply not passing it, so "clear context"
  needs no button wired to anything.
- **`status` can be `not_found`.** "The books do not say" is an answer, not an
  error, and the spec's States card should be read with that in mind.

Sign-in is a real part of this screen: chat requires it and search does not.

Partial: **9A**'s Events and Centres are backed (`events/`, `centers/`); "News &
updates" has no feed and is the standing example of what not to invent.
**4A**'s route and shelf exist and are correct; the translations tables in
production are simply empty, so build to the spec's *empty* state and check it
against real data later.

**6A is not a screen** — it is the token and component sheet the other screens
are drawn from. Read it before the rest; several of its decisions are already in
`src/app/globals.css`, and any drift you find there is worth raising.

The designer may also send phone screenshots separately (the 1A–1D ones came
that way). If I hand you a folder of them, treat them as the check on your
reading of the spec, not as a second source of truth.

## How to work

I don't want a menu of options. **Audit first, tell me what you found and what
you recommend, then build once I agree.** State the recommendation as a
recommendation — "I'd do X because Y" — not as a list for me to choose from.

Reply in **English + Hindi mixed, Hindi in Devanagari script** — never romanized
Hinglish. Keep technical terms, file paths and identifiers in English; carry the
explanation and the reasoning in Hindi. Commit messages, code comments and
anything written into the repo stay English.

Verify your own work in the browser before telling me it's done — screenshot the
result at mobile **and** 1280×800 and compare against the spec panel. Don't ask
me to check manually. Run `npx tsc --noEmit`, `npx eslint src` and `npm run
build` before you call a screen finished.

Commit directly to `main` so I can push and look at the deploy. One commit per
coherent chunk of work. Write the commit message as prose explaining **why** the
change was needed — what was wrong, what the alternative was, why this fix — not
a bulleted list of files touched.

## Method that worked for 1A–1D

Build each screen **mobile-complete**, and in the same pass take desktop to
*structurally correct* — the spec's column counts and widths — but not
pixel-perfect. Then one dedicated desktop pass at the end for the desktop-only
affordances. The reasoning: the dominant cost is re-entering a screen months
later and re-deriving the spec and the data shape, and a desktop-later plan pays
that twice per screen. But at ~90% mobile traffic, desktop pixel-fidelity earns
little and the hover/rail work is what churns most.

Deferred to that final desktop pass, deliberately — do not start these
piecemeal: hover-reveal actions, the reader's chapter and notes rails (1D
desktop is a genuinely different layout and earns its own build), ⌘K and
keyboard affordances, exact sidebar metrics.

## Decisions already made — inherit these, don't re-litigate

**Never invent data to complete a design.** Where the spec draws something the
BE has no field for, leave it out and say so in the commit. Two live examples:
"News & updates" on Home has no announcements feed, and nothing joins a book to
its discourse audio, so 1C's headphones button is omitted — which the spec's own
States card asks for ("omitted, not disabled"). A hardcoded card pretending to be
real data is worse than its absence.

**This BE's failure mode is a 200 with an empty payload**, not an error status.
Check payloads, not status codes. Some endpoints are infra-conditional.

**Local dev CORS**: the deployed BE refuses `localhost`, so client-side fetches
only work against a locally running BE. Server-side fetches are fine.

**Alignment, and anything like it, is the BE's to decide** — the frontend
honours it. Alignment is editorial intent that only the printed page knows; the
frontend has only the flag and would have to guess. If the frontend guesses, the
rule lives in two places, every future consumer reimplements it, and the guard
becomes scar tissue nobody removes after the BE is fixed. (A real instance:
body paragraphs on chapter-opening pages were rendering centred. It was an OCR
ingest bug in `../MDApp/apps/textextract/methods/mistral_ocr.py`, fixed there as
`ocr-v8`. Published books are frozen against re-promote *and* against panel
edits, so ~26 already-stored paragraphs stay wrong until a re-ingest — a known,
accepted gap, not something to work around in the frontend.)

**Reader routes render outside the app shell on purpose** — the reader owns the
viewport. Don't "fix" that.

**Mobile reading is the product.** ~90% of traffic. When mobile and desktop
pull in different directions, mobile wins.

## Things worth knowing about the codebase

- `src/lib/bookHue.ts` — each book gets a stable colour derived from its code,
  because the BE has no cover colour and most books have no cover image. The
  same hue must appear on the rail, the shelf, the resume card and the book's
  own hero, or covers stop being recognisable.
- `src/components/shelf/CoverTile.tsx` — four densities, plus `ProgressBar`.
- `src/components/ui.tsx` — `PageContainer` has two widths (`text` for prose,
  `shelf` for the spec's 1088px), and `SectionHeading` has two tiers: an
  11px uppercase eyebrow captioning a shelf of things, and a 17px sentence-case
  title heading a section that is its own subject. Use the right one.
- `src/lib/workspaceConfig.ts` — the five-workspace model. Nav slot counts are
  deliberately uneven; do not pad them.
- Desktop geometry from the spec: **256px sidebar, 1088px content max**. Both
  are already set; keep new screens consistent with them.
- Accessibility is not optional in this spec: the hues in `globals.css` were
  deepened from the designer's published values to clear AA as text on the
  light **and** sepia surfaces, and the reasoning is written in the file. If you
  introduce a colour, measure it rather than eyeballing it.

## Start here

Read `AGENTS.md`, then 6A (tokens). Then, unless I name a screen, work in this
order — and tell me if your own audit disagrees, with the reason:

1. **10A and 3B** — the workspace switcher and settings. Small, unblocked, and
   they are how a reader reaches every other workspace, so getting them right
   first makes the rest testable in the browser as you go.
2. **7A / 7B / 7C** — study resources. Three screens off one pair of endpoints
   (`folders/`, `documents/`) and one existing route, so the second and third
   are cheap once the first is understood.
3. **3A and 5A** — audio and videos, including the persistent player. Do these
   together: 5A lives inside the audio tab and shares its chrome.
4. **8B**, then **9A** and **4A** — the last two build to their empty states.
5. **2A** last of the unblocked set. Not because it is least important, but
   because it is the only one with a brand-new API behind it and real signed-in,
   metered and error states to get right; do it when the token system and the
   shared components have stopped moving under you.

That leaves 8A, which is backend-blocked (see above), and the final desktop
pass.
