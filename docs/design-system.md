# The design system

The designer's finished Originals screens are the source of truth for how this app looks.
This file is the source of truth for how that gets built — what the tokens are, what the
shared components are, and which of the comps' own decisions we deliberately did not
follow.

**Where the screens are.** The live file is the designer's Figma, *MD App Phase 2*:

> https://www.figma.com/design/rn7h9yZtwmVZY3X9Fqt28f/MD-App-Phase-2?node-id=0-1

That is canonical — it is where he changes things. The exported PNGs in
`design_docs/screens/originals-2026-08-11/` are the offline copy: they are what you
diff against, what survives without a network, and what pins the version this code was
built from. When he revises a screen, a fresh export lands in a **new dated folder**
rather than overwriting that one — otherwise "which comp did we build?" has no answer.

**Mobile only, for now.** Every comp is a 390pt phone frame (1410px at 3x). The designer
will draw desktop separately; until then the app's own responsive rules from `lg:` up are
unchanged and untouched, and no comp-driven change may break them.

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
| The filter sheet's third section, **Sort by**, showing one of three always selected | Built, and selects none of them while there are words in the box | The BE ask landed (`ordering=`, contract §13.8), so all three work. What the comp cannot show is the sheet open *over a query*: the list is then ranked by relevance, which is not one of the three, and lighting "Newest first" above a list that is not in that order is worse than lighting nothing. The section reads "Best match" instead, and picking any of the three overrides it. |
| The album/folder hero's back pill reads "Collections" | The parent folder's own name, plus the rest of the path above the title | Every comp draws a folder one step under a shelf, where those are the same thing. At depth four they are not, and one pill cannot carry six steps. |
| Chips inside the filter sheet carry no counts | Adopted — the comp is followed | The panels this replaced printed a count on every chip. The sheet's footer counts the whole find live instead, and it re-counts on every tap, which is the number the reader is actually deciding with. |
| Six themes in the reader sheet | Six *reading surfaces*; the app keeps Auto/Light/Sepia/Dark | Auto is what lets a phone that darkens at sunset take the app with it. A book chosen on cream should not turn grey because the sun went down. |

## Deviations from the Connect → Events comps, 24 Aug 2026

Five screens, drawn separately from the 11 Aug Originals set: the Upcoming list, the
filter sheet, the Past list, and the two halves of the event detail. Built as drawn
except for the rows below. The contract behind them is **`docs/Events_API_v1.md`**, and
its §0 outranks anything here: every derived value — bucket, badge, the prabodhak's
"Multiple" line, the card's location string, the category's colour — arrives finished and
is never recomputed in the app.

| Comp | Shipped | Reason |
|---|---|---|
| Every accent on all five screens in the app's terracotta | Connect's own `#2F6E86` | The five-workspace hue model (PRD §2) is app-wide and predates these screens; the comps read as drawn on the generic template. A workspace whose tab bar, switcher tile and app bar are blue must not open a terracotta screen. **Open with the designer** if Connect's identity colour is meant to change — that is a workspace decision, not an Events one. |
| Category chip text in the category's raw accent | The accent mixed 55% toward the page's own ink | The seven category colours are a **panel table**, not a tuned palette: `#D9A441` measures 1.9:1 as text on its own tint. The five workspace hues were each tuned to clear AA, which is why `--ws-ink` is the raw hue in a light theme; these cannot be. 55% is the same constant `globals.css` already uses to rescue the workspace hues in dark, and it works in both directions — deepening on a light theme, lifting on a dark one. Measured across all seven: 4.9–12:1 light, 7.6–9:1 dark. The **fill** stays raw wherever the accent is the background (the card's edge stripe), because no theme can change that pairing. See `categoryStyle` in `lib/events.ts`. |
| Bottom bar: Events · Centres · Links · Assistant | Events · Assistant | Centres and Links have **no endpoints** — Events_API_v1 §5 is explicit that they are separate models with their own screens, still to be designed, and that Connect's Links page is not an event's `links`. The Centres tab shipped for a while pointing at a `centers/` call the BE rebuild removed; it rendered "No centers listed yet" over a 404. Same rule that took Connect's library tab out: a tab advertising an empty room is worse than no tab, worst of all in the workspace whose job is telling a reader where to go. Both return the day they have something behind them. |
| Detail header: back · "Event" · bookmark · share | back · "Event" · share | `me/bookmarks/` covers book paragraphs and nothing else; an event cannot be saved yet (Events_API_v1 §5 asks that we ask before building against it). A dead control is worse here than a gap — it is the one thing a reader would press to keep a date. |
| Social link tile in green | The document family (violet) | There is no green in the kind palette, and inventing one for a single row is how a palette stops being one. `link` already maps to the document family everywhere else in the app: a link is a document you do not hold. The meeting tile (blue) and the playlist tile (terracotta) are as drawn. |
| Registration reachable only as a URL inside the invitation note | That, **and** a "Register for this shivir" button under the info rows | `registration_url` is its own field in the contract and the note is free text a manager typed — an organiser who forgets to paste the link into their prose would otherwise have no way in at all. The note's own URLs are linkified too, as drawn. Hidden entirely when the field is empty; **there is no in-app registration form**, by design, and no endpoint accepts a reader's details. |
| The filter sheet's chips at the comp's exact wrap | As drawn, plus a **Location** section that disappears when there is nowhere to choose between | `filters/` lists only cities that actually have events in the bucket, so an empty list means a dropdown offering nothing but "All". |
| `Intl` short months | A written-down three-letter table | `en-IN` and `en-GB` abbreviate September to "Sept" — four letters where the other eleven have three — and the comps print "5 Sep'26". On the card, date and location share a line at the largest text size, and the odd month out is the one that wraps. |

One thing the comps could not show, and it is a contract rule rather than a taste call:
**the A–G categories and the five languages are data.** They are panel tables that can be
renamed, recoloured, retired or added to without a deploy, so the filter sheet builds its
chips from `events/filters/` every time it opens and there are no seven chips written down
anywhere in this app.

---

## Revisions after the comps — Home and Read, 13 Aug 2026

Not deviations. The 2026-08-11 comps are the source of truth for every screen *except*
where the designer has since revised one, and Home and Read have been revised once. Where
the two disagree on the rows below, this table is the later word and the PNG is the older
one.

| Comp (11 Aug) | Now | Note |
|---|---|---|
| App-bar controls at 12px | 8px — `--radius-control` | The switcher, display and account buttons, and the sutra's Share. |
| Sutra card with no edge | A hairline — `--sutra-border` | The border is in the comp; the code never drew it. Themed with the rest of the sutra's own five. |
| Sutra citation reads "जीवन विद्या एक परिचय · MKD 2.40.7" | The book alone | The ref is an internal address in Latin letters on the one card meant to be read. The link still lands on the verse. |
| Bookmark button beside Share | Gone | Saved is in the account menu. On a card whose job is Share, a second control of equal weight split the one action. |
| Section headings 20px/700 | 17px/600 | What separates a heading from the cards under it is now the rhythm rather than the size — see below. |
| — | One 20px gap between every section on Home | It was 0 above Continue Reading (a first-child margin collapsed away), 28 in most places, and 36–39 after a rail or under a heading carrying a "See all". |
| Cover tiles at 4:5, cover cropped | `aspect-[102/139]` — the covers' own 612×834 | Every cover the BE serves is that scan, so the tile is the shape of the thing in it and `object-cover` crops nothing. |
| Workspace tile names at 17px | 15px | They were the card-title step from when the heading above them was 20px. Level with a 17px heading, four workspace names read as four more headings. |
| Library stat tiles, height from content | Square as a floor | A square spacer shares a grid cell with the content and the taller one wins, so a short folder name leaves the tile square and "परिचयात्मक संकलन (प्रवेश सप्तम)" grows all three together instead of being cut. |
| Cover tiles at four radii (12, 14, 12, 14) | One — `--radius-cover`, 10px | Named for the object, not a size: a book must not change shape between two screens. Two of the four were Tailwind's `xl` and off the ladder, and the smallest cover wore the largest corner. |
| Cover tiles edged `white/15` | `border-rule` | That was an inner highlight, not a border — invisible on a pale cover, glowing on a dark one. It now follows the theme like every other edge, and matches the resume card it sits inside. |
| Read: title, summary line and the resume rail evenly spaced | Title and summary tight (2px), 20px below the pair | The summary is the title's own subtitle. The gap under it was **0** — see the `.hi`/`first:` note below. |
| Shelf and rail book captions at the `.hi` body leading | `hi-tight`, and title-to-page-count at 4px | A title and the size of the thing it names are one caption; at the full 1.85 leading and 8px apart they read as two. |
| Book hero: back pill, Resume, download, Share at 12–14px; tab bar 24px over an 18px pill | All 8px — `--radius-control` | Resume and download are not the hero's own buttons but the reader's, which is why they read 14px after the first pass. The tab pill was an 18px literal under a 24px track. |
| Book hero title sitting on the cover's foot | Top-aligned with it | `items-start` was half of it: at `.hi`'s 1.85 the glyphs float ~7px down inside a 39px line box, so a box-aligned title still read as hanging. Needs `hi-tight` too. |
| Book hero meta as one run: "ए. नागराज · 18 chapters · 178 pages" | Author on its own line, dimensions on the next | A name and two measurements separated by the same dot read as three facts of one kind. |
| Switcher tile as a 12% wash of the accent | The picker sheet's filled 150° gradient, white glyph | The bar's one piece of workspace colour was barely colour. Filled, the trigger and the sheet row it opens are the same object seen twice. |
| Translations tab bar: Home · Read · Assistant | Translations · Assistant | "Read" opened `/books?ws=translations` — the same four books under the same language chips as the home beside it, one shelf reachable two ways. The home took its summary line ("4 books · 740 pages"), and the remaining content tab is named for the workspace rather than "Home". The old URL still resolves. |
| Originals tab bar reads "Read" and "Audio/Video" | "Books" and "Media" | Shorter words for a five-slot bar, and both carry through to the page they open: `/books` is headed "Books" and `/av` is headed "Media", as is the pill that leads back to it out of a folder. A heading that disagrees with the control the reader just pressed is one they have to check they arrived at. The `read`/`av` icon keys and the `/books`/`/av` addresses are unchanged — a route is an address, not a label. Translations keeps its own "Read" tab. |
| Highlights filters scrolling away with the list | Sticky under the app bar — `--app-header-h` | A book's highlights run to dozens of cards, so the control saying which of them you are looking at was a screen or three above the ones you were reading. |
| CTA buttons as pills, each written by hand | One `ctaPrimary` at 8px, terracotta | See below. |

### One CTA — `ctaPrimary` / `ctaPrimaryCompact` in `components/ui`

About twenty call-to-action buttons agreed on being white-on-workspace-colour and on
nothing else: five horizontal paddings, two type sizes, a pill radius, and three of them
under the 44px touch floor because `py-2.5` is 40px and nobody had measured one. They are
one class string now, and the sutra's Share is on it — it wore `--color-accent` and a
36px height, and it is the same button as Sign in.

A class string rather than a component on purpose: half these are `<button type="submit">`
inside a form and half are `<Link>`. The fill stays with the caller as
`style={{ background: "var(--ws-color)" }}` — it is the one genuinely per-workspace part.

### Known: `leading-*` does nothing on `.hi`, and `first:mt-0` was hiding a gap

Two cascade traps, both found by measuring rather than by reading:

**`.hi` beats every leading utility.** `.hi { line-height: 1.85 }` is unlayered and
Tailwind's utilities live in the `utilities` layer, so `.hi` wins whatever the source
order. About twenty `leading-snug` / `leading-tight` / `leading-relaxed` classes on `.hi`
elements in this tree are therefore **inert** — the book-rail captions, the TOC sheet,
search results, the reader's own headings. Where a Devanagari label has to fit a box, use
`.hi-tight` (1.35, the floor that still clears the matras). Making the utilities live
generally would move type on twenty screens; that is a deliberate pass, not a drive-by.

**A `first:` margin on a component's own first child is dead code.** `ContinueReading`'s
heading carried `mt-5 first:mt-0`, and the `h2` is always the first child of its own
`<section>` — so the margin never applied anywhere. Home did not notice, because the
stack's `gap-5` was spacing it; the Read shelf had nothing else, and the heading sat
against the summary line. The margin belongs on the `<section>`, where `first:` describes
something real about where the component was placed.

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

### Radius — five, where there were eleven

`--radius-control` 8px (**every CTA button**, and the small square: a 36px kind tile, a
checkbox, an app-bar control) · `--radius-tile` 14px (a glyph or cover inside something
else) · `--radius-card` 20px (a tappable thing on the page) · `--radius-hero` 24px (the
coloured panel atop a detail screen) · `--radius-sheet` 26px (a bottom sheet's top
corners) · plus `full`, now only for what is genuinely round — an avatar, a dot, an icon
button, a progress track.

`control` is the designer's 13 Aug value. It replaced `--radius-chip` (10px) rather than
sitting beside it: two names for one step is the thing this ladder exists to prevent.

`rounded-2xl` (16px) is not in the ladder and is used in about fifty places. That is the
next thing to reconcile, not a licence to add a fifty-first.

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

**The app mark is a file, and there are five renders of it.** The designer's export is
`design_docs/MD Study logo.svg` — the Divya Path Sansthan tree emblem, white on a `#CD7233`
rounded tile, with "DIVYA PATH SANSTHAN · AMARKANTAK · ESTD. 1981" set around the ring.
`public/brand/logo.svg` is that file at 2dp and without its fixed 40×40, and it is what
`BrandMark` renders; `scripts/build-icons.py` turns it into the manifest icons, the
maskable icon, the Apple touch icon and the favicon. Change the logo in one place and
re-run that script — do not hand-edit anything under `public/`.

Two things follow from the mark being this detailed. The ring text stops being legible
below roughly 64px, so the 32px app bar and the 30px sidebar show it as a tree in a circle
and that is fine — it is the mark, not a sign to read. And the emblem is a *circle* inside
the tile, which is what makes the maskable icon work: Android's circle crop takes the tile
corners, never the artwork. Anything that needs the name spelled out should set "MD Study"
in type beside the mark, the way the desktop sidebar already does.

---

## Scope — what is built, and what is not

The comps cover Home, Read, Book preview, Highlights & Notes, Library (+ folder and file
lists), Audio/Video (+ albums), the reader and its sheets, and Audio Mode.

**Built:** the tokens, the primitives, Home · Read · Book preview · Highlights & Notes ·
the Library shelf · **filtering on both shelves** · **every folder, album and file list** ·
**Audio Mode and the reader's audio pill**.

Every screen the comps cover is built.

### Folders, albums and file lists — one hero and one row

The four comps here (Audio Album, Video Album, folder list, folder file list) are one
screen with different contents, and the code now says so. `NodeView`'s two headers —
a coloured panel for an album, plain text on the page for a folder of folders — are one
`CollectionHero`. The only difference left is the **thumb**: an album has a cover and an
index does not. The index was the odd screen out in the whole library, the one that looked
like it belonged to a different app.

The hue is the collection's own (`bookHue`), never the workspace accent, because the comps
put a purple album and an orange one in the same set — the rule the book pages already
keep.

A book's hue is now **sampled from its cover** rather than hashed from its code, which is
what spec 1C asked for ("colour derived from the cover") and was not possible when most
books had no cover. `COVER_HUES` in `lib/bookHue.ts` holds the printed band colour of each
scan; `scripts/sample-cover-hues.mjs` regenerates it. Two consequences to know:

- **The thirteen covers use five colours.** Four books are printed in the same olive, so
  four heroes are the same olive. The hash gave each book its own; the truth does not.
- **The table is committed, not sampled at request time.** The cover CDN's CORS allows
  only `http://localhost:3000`, so client-side sampling works in dev and throws on a
  tainted canvas in production; and sampling in the RSC would fetch and decode a cover on
  every book's prerender, which is the load `AGENTS.md` exists to prevent. A committed
  value can also be *measured* — every pair carries its real ratio against white.

Two things the comps do not have to solve, because they draw depth 1:

- **The back pill names the parent** rather than saying "Collections". Four levels into a
  shivir, "Collections" is not where back goes.
- **The rest of the path rides above the title** in `CollectionHero`'s new `eyebrow` slot.
  One pill can only offer one step, and the way back to level two would otherwise be the
  browser's history.

The rows underneath are `RowCard` + `ListRow` + `KindTile` in all three lists — folders,
documents, tracks — where there used to be three different things: a ruled list with a grey
folder glyph, a bespoke card with its own stretched link, and a numbered ruled list of
tracks. What each keeps is only what is true of it: a folder gets a tinted pill saying how
much is inside, a document gets `RowAction`s under a hairline for the two ways round the
reader, a track gets its duration on the right and the accent tile while it plays.

`ListRow` gained `onClick`, which renders a real `<button>`: a track starts playing in the
player already on the page rather than going anywhere, and a div with a click handler is
not reachable by keyboard. `CollectionHero`'s `back` became optional — a folder can be its
own top, and a pill pointing at the page you are on is worse than no pill.

The **track number is gone** from an album's rows. It was ordinal information the order
already carried, and the tile that replaced it is what the rest of the app leads a row
with. What is playing is still findable without reading a word: that tile takes the accent.

### Filtering — one control for two shelves

`library/FindFilters.tsx` is the comps' Filters button and its sheet, and it replaced
`FilterCards`' two closed `<details>` rows on the Library **and** on Audio/Video at once.
That is why it came first: it was the one change that put both screens on the comp
together.

The height problem it solves is old. Counted over a whole shelf rather than one level, six
axes of chips run to some five hundred pixels; open above the grid they pushed the second
collection off a phone, and moving the block below the grid took the search box with it to
the one place nobody looks for one. The panels answered that by staying shut, which meant
choosing an axis before seeing what was in it. The sheet answers it by not being on the
page: the chrome above the grid is now one row — box, button — and every axis inside the
sheet is open, in full.

**The URL is still the whole state, and `lib/find.ts` is untouched.** Every chip in the
sheet is a `Link` onto the same page with one value toggled, so a narrowed shelf is still
a real address and the back button still walks out one chip at a time. The sheet holds
exactly one piece of client state — whether it is open — and taps inside it navigate
underneath it, which is what makes "Show 31 recordings" a live count rather than a promise.

Three things it settles that the comps do not draw:

- **A hidden axis is not counted.** `/av` promotes Type to its segments, so the sheet
  neither offers Type nor counts it; a hidden axis that still counted would leave the
  button reading "1" for a chip the reader never set and cannot reach.
- **An axis in use with nothing left to offer** — `?kind=video` on a Library shelf that
  suppresses recording kinds — drops out of the sheet and stays in the chip row, so the
  section is never a heading over a hole and the filter is still removable.
- **"Clear" moved to the chips it clears.** The results line's `Clear n` is now desktop
  only: on a phone it was a second clear at the far edge of the same eyeful, saying a
  different number because it counts the query too. The query's own way out is the × in
  the box.

`FindResults`' bespoke dashed "Nothing matched" box is the shared `EmptyState` now, whose
`hint` takes a node so that the way back out of a filter can live inside it. A filtered
shelf that found nothing is the one screen a reader can be stuck on.

### Listening — one palette, two shapes

**Audio Mode has a palette of its own**, and it is now the `audio` token family rather
than some forty hex literals across three player files. It deliberately does *not* restate
itself per theme: the screen is a cover, two lines and a play button, it is often the last
thing looked at before sleep, and a sepia page behind a play button reads as a page that
has gone wrong. The comp's gradient is sampled at both ends — `audio-top` `#4E2B13` to
`audio-bg` `#17120F` — and held to the top 38% rather than run the whole height, because a
gradient still moving behind the follow-along lines reads as the page scrolling.

`src/components/player/**` is in the ESLint **error** tier now, on the same logic as
`ui/`: with the palette in the stylesheet, a literal in there is a new one.

**Inside a book the player is a floating pill**, not a bar (comp "Read mode - Audio widget
overlay"). The reader is the one screen with no room for a bar — its own chrome owns the
foot of the window and the page owns the rest — and a full-width strip between them turned
the bottom fifth of a reading screen into three stacked bands of controls. The pill sits on
`--color-overlay`, the app's one surface that floats *over* content, and carries only what
a listener reaches for without looking: stop, ±15 seconds, pause. The scrub, the speed, the
sleep timer and the voice picker are all one tap away in Audio Mode, which the title opens.

Two things follow, and both are in the code:

- The pill **takes no layout**: `--player-h` is 0 inside a book, so the reader's bar keeps
  the floor and the pill floats above it over the text, as drawn.
- `--player-float-h` is new, and is what the **selection bar** clears. Both float in the
  same corner; before this they cleared the same bar and landed on top of each other.

| Comp | Shipped | Reason |
|---|---|---|
| Audio Mode's unspoken lines at ~3.4:1 | `audio-ink` at 55%, 5.4:1 | The karaoke contrast is the point of the screen and survives the change: the spoken line is still 16:1 against lines that recede. A line you cannot read is not a line you are being invited to tap, and tapping one is what this screen is for. |
| Nothing below Audio Mode's transport | Chapters · Voice · Sleep · offline save · Read | The comp draws the listening controls; these are the ones that make it a listening *app*, and the reader-side bar they used to live on is a pill now. |

### The reader

Built, and worth reading about because of *how*. `Reader.tsx` is ~1600 lines and the comps
touch about 150 of them — a top bar, a bottom bar, a selection bar. The other 1450 are page
model, TTS follow-along, gestures, resume, deep links and offline caching, none of which the
designer draws. So the chrome was **extracted first** into `reader/ReaderChrome.tsx` as a
behaviour no-op, and the comps were applied to that. A future revision opens a 350-line file
of dumb presentational components, not the one that also holds the gesture handler.

Answers the designer gave, and what they became:

| | |
|---|---|
| The accent-filled ✦ in the top bar | The **Assistant**. It searches Paribhasha and the books today and becomes chat later; it is in the reader now so the habit forms first. Scoped to the current book — a global search from page 19 is not the question being asked. |
| `Page 19 : 3 / 19` | Printed page, then where that page sits in this chapter. Two different numbers, both wanted: the first is what a reader checks against paper and what every `canonical_ref` is built on. |
| The bookmark button | **Gone.** A position saved with no words is what nobody came back for. Selecting a passage offers the two things they do. `/me/bookmarks` is **Highlights** now — no migration, because a highlight is a bookmark with a colour, and rows saved before the colours simply show unpainted. |
| The three highlight colours | No meaning — free choice. So they are announced by the only thing true about them ("Highlight in amber"). |
| `Bold` | A heavy weight over Original's paper, confirmed. |
| `Quiet` deepened to 12.4:1 | Accepted. |

Not drawn by the designer at all, and therefore deliberately untouched: **Translations,
Connect, Resources, My Journey**, search/assistant, auth and settings. They keep today's
chrome and inherit these primitives for free when their comps arrive — which is the whole
reason the primitives came first.

---

## The sweep, and the five things it found

With every comp built, `/design` was measured rather than looked at: **eighteen
combinations** — three app themes × six reading surfaces — with every text node's computed
colour taken against the surface it actually sits on, plus a horizontal-overflow pass at
the largest text size (1.4×). All eighteen are clean, and nothing sits below the 13px
floor. What it caught is the argument for the page existing:

1. **`HeroAction` was `bg-card`.** In dark that is near-black, so the one white button on a
   saturated hero became a dark chip carrying accent text at **3.06:1** — the primary
   action, unreadable, on screens where it is the only thing to do. The panel is
   theme-independent, so the chip must be: `--color-on-accent`, fixed, 5.25:1 under the
   workspace accent.
2. **Highlights did not follow the book.** `--color-hl-*` was restated per *app* theme,
   which was right while the book deferred to the app and wrong the moment the two axes
   could disagree. A light Paper book inside a dark app got the deepened fills under the
   book's dark ink: **1.5:1** — an invisible highlight, which looks exactly like a working
   one. The three light surfaces restate the pale fills now, the way Quiet already restated
   the deep ones. `original` and `bold` deliberately do not: neither paints its own paper.
3. **`prefers-contrast: more` stopped at the app.** It deepened the shell's secondary ink
   in all three themes and left the book's four alone — so a reader who asked the platform
   for more contrast got it everywhere except the screen they read on. Now each surface
   deepens against its own paper (9.9–13.1:1).
4. **Three flex controls had no `min-w-0`**, so `truncate` never fired and their floor was
   their longest word: at 1.4× the bottom nav's fifth label ran off a 390px phone, and
   `CountedSegmented` and `CountTabs` took the whole page's horizontal scroll with them.
5. **`/design` itself was lying twice** — its highlight swatches drew app ink on a book
   fill, a pairing the reader cannot reach, and eight of its own captions were set in
   `muted`, on the page whose job is to enforce that muted is not text.

Two of these are invisible-by-construction bugs: a highlight at 1.5:1 and a filter chip
that renders nothing look identical to a working one from across the room. That is the
class of thing screenshots do not catch and measurement does.

**Not measurable in the browser pane**, and therefore not claimed: Audio Mode at the
largest text size. The pane renders at 0 fps, so audio never starts and the screen cannot
be opened there; its palette was measured numerically instead (ratios in `globals.css`).

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
   surface it actually sits on. A new one earns the same — and "measure" means all
   eighteen theme × surface combinations, because four of the five findings above only
   exist when the two axes disagree.
5. **Two consumers or it is not a primitive.** A component in `ui/` with one caller is a
   screen's own furniture in the wrong folder.
6. **A deviation from the comps is written where it happens**, in the code, and added to
   the deviations table above. "We decided this looked better" is not a deviation, it is
   drift.
7. **Update this file in the same commit.** It was stale within a day of being written the
   first time.
