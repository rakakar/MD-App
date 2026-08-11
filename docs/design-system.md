# The design system

The designer's finished Originals screens (25 PNGs, 3x, exported August 2026) are the
source of truth for how this app looks. This file is the source of truth for how that gets
built — what the tokens are, what the shared components are, and which of the comps' own
decisions we deliberately did not follow.

Everything described here is on **`/design`** in development. That page is the artefact to
open when sitting with the designer: every token and every component, in every state, with
a control at the top for the app theme and the book's paper. Agreeing a change there takes
a minute; agreeing it by screenshot takes a day.

---

## The rules the comps do not override

These predate the comps and outrank them. Where the two collide, the deviation is written
into the code at the point it happens, the way `globals.css` already does.

| Rule | Why |
|---|---|
| **13px floor** (`--text-xs`) | Most of this audience is over forty. Nothing in the app is allowed below it, including metadata the comp sets smaller. |
| **4.5:1 AA** for every text colour | Measured against the surface the text actually sits on — in all three app themes *and* all six reading surfaces, not against the page in the abstract. |
| **44px touch targets** | `min-h-11` everywhere, including chips and segments. |
| **Colour is never the only signal** | Selection carries a check or a ring as well as a fill; kind tints always sit beside a text label. |
| **Muted is not text** | `--color-muted` is 2.89:1 on the page. It is for chevrons, folder glyphs and genuinely inactive controls. |

## Deviations from the comps, and why

| Comp | Shipped | Reason |
|---|---|---|
| Quiet reading surface `#4A4A4D` paper / `#AAAAB3` ink | `#1F1F21` / `#DFDFE3` | As drawn it measures 3.83:1. A dark theme you cannot read is not a dark theme. |
| "Bold" drawn as a sixth surface | A weight, over Original's paper | Its swatch is Original's paper with heavier ink, so it is not a surface. Tiro ships one weight, so it moves the book's Devanagari to Mukta 500 rather than synthesising a bold. |
| Kind glyphs at 4.30 / 4.95 / 3.68 / **1.97**:1 | Deepened to 5.41 / 5.56 / 5.57 / 4.85 | The folder glyph as drawn is a mark you cannot see. A glyph beside a label only needs 3:1; clearing 4.5 costs one hex digit. |
| Page `#FAF7F3`, card `#FFFFFF` | Adopted — `--color-surface` moved from `#FDFBF8` | This one went **our** way round: the comp is right and the old value was wrong. The extra step is what makes a white card read as raised. |
| Samvaad stat tile in green with a speech-bubble glyph | The folder family (terracotta) | A fifth hue for one folder is not a palette. **Open with the designer** — if Samvaad is meant to be its own colour, it needs a rule saying which other folders get one. |
| Six themes in the reader sheet | Six *reading surfaces*; the app keeps Auto/Light/Sepia/Dark | Auto is what lets a phone that darkens at sunset take the app with it. A book chosen on cream should not turn grey because the sun went down. |

---

## Tokens — `src/app/globals.css`

The whole block is `@theme static`, not `@theme`. Tailwind only emits a theme variable it
can see used, and it decides that by scanning source text for the name — so a token read
through an inline `var(--color-hl-${colour})` gets dropped and resolves to nothing. Two of
the three highlight colours shipped as no colour at all before this was caught, in the one
place where an invisible highlight looks exactly like a working one. `static` emits the
block whole.

### Surfaces and ink — seven neutrals, restated per theme

`surface` (the page) · `card` (raised off it) · `canvas` (under it) · `inset` (sunk into a
card) · `ink` · `ink-soft` · `muted` · `rule`.

`inset` is new and carries the note block under a highlight, the track a segmented pill
slides along, and the number chip in front of a chapter. `canvas` cannot do that job:
canvas is the ground a card sits on, and reusing it inside one makes the inner block read
as a hole punched through to the page.

A theme is these eight values and nothing else. `[data-theme="sepia"]` and
`[data-theme="dark"]` each restate exactly this list.

### Kind accents — five families for seven kinds

| Family | Kinds | Tile / glyph (light) |
|---|---|---|
| doc | `pdf`, `link`, `other` | `#E6E1F5` / `#5B4F9C` |
| video | `video` | `#EAF0F4` / `#39647C` |
| audio | `audio` | `#FDF3EA` / `#9E4A11` |
| image | `image` | `#F6E2E9` / `#833653` |
| folder | folders | `#F6E2CE` / `#9E4A11` |

`link` and `other` join the document family — a link is a document you do not hold — and
inventing a hue the designer has not chosen is how a palette stops being one. Audio and
folder share an ink on purpose: they are the same terracotta family in the comps, and what
separates them is the depth of the tile.

**Photographs are the one member the comps do not settle.** The finished screens never draw
an image tile, but the shelf has carried a pink for them since the designer's earlier note,
so it survives — dropping it to make the set tidier would have taken a colour off a shelf
where it is already doing work.

In dark the pairing inverts — the tile takes the hue and the glyph takes the light —
because four pale tiles on a near-black card are four lamps.

### Highlight colours

`--color-hl-amber` · `--color-hl-sage` · `--color-hl-sky`. Book ink lands 13.9–14.5:1 on
all three, and 8.3–9.5:1 on their deepened forms inside Quiet.

### Radius — four, where there were eleven

`--radius-tile` 14px (a glyph or cover inside something else) · `--radius-card` 20px (a
tappable thing on the page) · `--radius-hero` 24px (the coloured panel atop a detail
screen) · `--radius-sheet` 26px (a bottom sheet's top corners) · plus `full` for pills.

### Elevation — three

`--shadow-card` (sits on the page) · `--shadow-raised` (floats over content — the selection
bar, the audio pill) · `--shadow-sheet` (the lift under a bottom sheet). The comps float
their cards on a soft shadow with a hairline border; the app used to draw a border alone.

### The six reading surfaces

Set on `<html>` as `data-reader-theme`, beside `data-theme`, and read by nothing except
`.reader-surface` and the reader's own chrome.

| Surface | Paper / ink | Note |
|---|---|---|
| `original` | *declares nothing* | Defers to the app theme. The default, so nobody's book changes until they ask. |
| `paper` | `#EDEDED` / `#211C1C` | Flat neutral. |
| `calm` | `#F4E1C5` / `#1A1613` | Deeper than the app's sepia. |
| `focus` | `#FEFCF2` / `#211C1C` | Warm near-white. |
| `quiet` | `#1F1F21` / `#DFDFE3` | Neutral dark, distinct from the app's warm near-black. |
| `bold` | Original's paper, Mukta 500 | A weight, not a surface. |

Because the two axes can disagree, `--ws-ink` is reconciled *inside the book* against the
book's own ink: a light surface resets the accent to the plain hue even inside a dark app,
and Quiet lifts it even inside a light one. The status bar (`theme-color`) and
`colorScheme` follow the book while a book is open and the shell everywhere else — the
same three values live in `layout.tsx`'s inline script and `DisplayProvider`'s `READER_BG`,
and both must be edited together.

---

## Components — `src/components/ui/`

What was one file is a folder; every export is re-exported from `index.tsx`, so
`@/components/ui` still means what it always did.

**The rule for what belongs here:** a thing at least two screens draw, whose *look* is
shared and whose *policy* is not. Policy stays with the caller — which is why there is a
`FilterButton` and no `FilterSheet`, and a `SearchField` with no opinion about when to
search.

| Component | Drawn on |
|---|---|
| `CollectionHero` (+ `HeroAction`, `HeroIconButton`) | Book preview, Audio album, Video album, folder list, file list, Highlights (`variant="compact"`) |
| `CollectionCard` | Library grid, Audio/Video grid |
| `KindTile` | everywhere a file, folder or recording is named |
| `StatTile`, `PromoBand` | Home |
| `ListRow` (+ `RowNumber`, `RowGroup`, `RowCard`, `RowAction`) | chapters, files, tracks |
| `CountedSegmented` | Audio/Video's All / Audios / Videos |
| `CountTabs` | Chapters / Highlights & Notes |
| `Chip`, `ChipRow` | genre row, filter chips, active filters |
| `FilterButton`, `FindRow`, `ActiveFilters`, `FilterSection`, `RadioList`, `CheckRow` | Library, Audio/Video, Highlights |
| `Sheet` (+ `SheetAction`, `SheetTextAction`) | every bottom sheet in the app |
| `ShareButton` | every hero that can be shared |

`CollectionHero`'s `actions` is a **block** slot, not a flex row. The book's actions arrive
as one client component that owns its own progress bar as well as its buttons — it reads
the saved position once so the two cannot disagree for a frame — and a hero that forced its
actions onto one line had nowhere to put the bar. Callers that want a row write a row.

`CollectionCard` takes an optional `badge` beside its meta line; that is where a borrowed
folder's provenance goes. `NodeCardView`'s `tile` variant is this component now — the
five-hue `KIND_TINT` table it used to hold is deleted, because that table and the
designer's export had already drifted by a shade in three places and only the stylesheet
can restate a hue per theme.

### Two heading tiers, and which is which

`SectionHeading` has `eyebrow` (13px / 700 / uppercase) and `title` (20px, sentence case,
full ink). `title` heads a section that is its own subject — Books, Shorts, Audio & Video,
Explore workspaces. `eyebrow` labels a rail sitting *above* the thing a page is actually
about, which in practice is only the Library's CONTINUE READING. `ContinueReading` takes a
`tier` prop for exactly that reason.

The title tier was 17px until the comps arrived, where Home's section headings are plainly
a step above the 17px card titles under them. At 17px a heading and the cards it introduced
were the same size, which is the specific way a long scrolling page stops having a shape.

### Covers are not carded

`BookShelf`'s grid card lost its border and padding. A cover is already a rectangle with a
border and a printed title on it; framing it in a second bordered rectangle boxed a box and
cost the cover the width — which on a two-up phone grid is the only thing being scanned.
`StatTile`'s label clamps to two lines rather than truncating to one: the comps label these
"PDFs" and "Shivir", and the folders they stand for are called
"परिचयात्मक संकलन (प्रवेश सप्तम)".

### Three controls that look similar and are not

- **`CountedSegmented`** splits one set into parts that add up — All 73 / Audios 35 /
  Videos 38. The counts are the point.
- **`CountTabs`** switches between two different things about the same object — a book's
  chapters and a book's highlights. Nothing adds up. Its active tab is a raised white card
  rather than an accent fill, because the panel below it is white too and the tab has to
  read as the front edge of it.
- **`Chip`** turns one filter on or off, and many can be on at once. Two selected looks:
  `solid` for a filter positively applied, `tint` for a selected position in a set where
  something is always selected — a row of solid fills there reads as four active filters.

### `Sheet` and the `surface` prop

Every sheet in the app is this one component. `surface="reader"` paints it in the book's
paper; the default `"app"` paints it in the shell's. This used to be free — `--reader-*`
were aliases of the app tokens and could not disagree — and since the book's paper became
its own setting they can: Display opened from the header would have arrived as a near-black
panel over a cream screen. `components/reader/Sheet` is this with the surface already
chosen, because "which world is this sheet in" is a fact about the component that opens it.

---

## Two things outside the stylesheet that the comps decided

**A highlight is a bookmark with a colour.** The Highlights & Notes screen wanted a new
entity; the store did not need one. `LocalBookmark` gained a `colour`, and a note on the
same `canonical_ref` is already the note attached to it — `localHighlights()` in
`lib/personal.ts` is that join. A fourth array would have bought a second sync path, a
second tombstone kind and a second thing for the reader's selection bar to decide between,
in exchange for a field. The BE carries no colour yet, so a second device sees the passage
without its paint; that is the right way round, because the passage is the part a reader
would miss.

**The app bar is four items.** Logo · workspace pill · palette · account. The palette
replaced "Aa" because this button stopped being a type control when the theme left the
reader, and "Aa" was quietly promising one of the three things behind it — the reader's own
type button, inside a book, keeps its "Aa". The next-shivir date chip is gone: it was
mitigation for Connect being two taps away, and what it cost was the four things beside it
wrapping to two rows at the text sizes this audience actually uses. Its job moved onto
Home, where a shivir can say where it is.

---

## Scope — what is built, and what is not

The comps cover Home, Read, Book preview, Highlights & Notes, Library (+ folder and file
lists), Audio/Video (+ albums), the reader and its sheets, and Audio Mode.

**Built:** the tokens, the primitives, and Home · Read · Book preview · Highlights & Notes ·
the Library shelf.

**Not built yet** — these screens still wear the pre-comp chrome, and the gap is known
rather than accidental:

| Screen | What is still old |
|---|---|
| Library | `FilterCards`' two closed rows instead of the comps' Filters button + sheet; folder and file screens not yet on `CollectionHero` + `RowCard` |
| Audio/Video, albums | the whole screen — no `CountedSegmented`, no filter sheet, no `CollectionHero` |
| Reader | top bar has no Assistant button, bottom bar still has five controls, selection bar has no colours, settings sheet is not yet "Theme & Settings" with the six surfaces |
| Audio Mode | not restyled |

Not drawn by the designer at all, and therefore deliberately untouched: **Translations,
Connect, Resources, My Journey**, search/assistant, auth and settings. They keep today's
chrome and inherit these primitives for free when their comps arrive — which is the whole
reason the primitives came first.

---

## How not to drift again

This section is the point of the file. The drift it exists to prevent has already happened
once: five hard-coded kind hues in `NodeCard.tsx`, a shade off the designer's, unable to
restate themselves per theme.

1. **Open `/design` before changing any shared styling**, next to the PNG. It is the
   regression surface, and flipping the two switches at the top is the check.
2. **No new colour, radius or shadow literal in a component.** If it is not in
   `globals.css`, it does not exist. A one-off `rounded-[18px]` is how eleven radii
   happened.
3. **A token is added to `@theme static`**, never plain `@theme` — Tailwind drops a
   variable whose name it cannot find in the source, and this app composes
   `var(--color-hl-${colour})` at runtime.
4. **Measure, don't eyeball.** Every ink here carries its ratio in a comment against the
   surface it actually sits on. A new one earns the same.
5. **Two consumers or it is not a primitive.** A component in `ui/` with one caller is a
   screen's own furniture in the wrong folder.
6. **A deviation from the comps is written where it happens**, in the code, and added to
   the deviations table above. "We decided this looked better" is not a deviation, it is
   drift.
7. **Update this file in the same commit.** It was stale within a day of being written the
   first time.
