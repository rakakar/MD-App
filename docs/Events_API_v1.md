# Events API v1 — Connect → Events

The contract behind the five designed screens: the Upcoming/Ongoing/Past list,
the filter sheet, the Past list with its badges, and the two halves of the event
detail. Base URL is the same as everything else: `/api/v1/`.

Anonymous, read-only, published-only, cached — the same rules as the rest of the
public API (API_Contract_v1 §8).

---

## 0. The one rule that shapes everything here

**The app decides nothing it would have to recompute.** Which tab an event falls
under, which badge it wears, whether the prabodhak line reads a name or
"Multiple", what the card's location string says, what colour the category chip
is — all of it is worked out on the server and sent as a finished value.

This is not politeness. Two clients deriving the same card from the same rules
is how the two drift apart, and the derivations here are date arithmetic that
changes answer *while nobody is deploying* — an event becomes Past at midnight.

Nothing in this module is switched by hand. There is no "mark as completed"
button anywhere in the panel, and there should be none in the app.

---

## 1. `GET events/` — the list screen

```
GET /api/v1/events/?bucket=upcoming
```

| Parameter | Values | Notes |
|---|---|---|
| `bucket` | `upcoming` · `ongoing` · `past` | Defaults to `upcoming`. |
| `category` | category `code`, repeatable | `?category=avlokan&category=sammelan` = either. |
| `language` | language `code`, repeatable | Same. |
| `mode` | `in_person` · `online` | |
| `city` | exact city name | From `filters/`'s `cities`. |
| `prabodhak` | prabodhak `id` | |
| `q` | free text | Title, city, state, prabodhak name and tags. A bare 4-digit number is read as a **year**, not as text — "2026" means that year's shivirs. |

```json
{
  "counts": { "upcoming": 8, "ongoing": 4, "past": 4 },
  "results": [ { …card… } ]
}
```

`counts` is the three tab numbers, counted under **the same filters** as the
list itself. Render the tabs from this and they can never disagree with what
tapping one returns.

### The card

```json
{
  "slug": "online-jeevan-vidya-shivir",
  "title": "Online Jeevan Vidya Shivir",
  "category": { "code": "jeevan_vidya_parichay", "letter": "A",
                "name": "Jeevan Vidya Parichay",
                "display": "A · Jeevan Vidya Parichay", "accent": "#6E9C6E" },
  "language": { "code": "en", "name": "English" },
  "mode": "Online", "mode_code": "online",
  "prabodhak": "Shriram Narasimhan", "prabodhak_initials": "SN",
  "start_date": "2026-11-13", "end_date": "2026-11-19",
  "location": "Online", "city": "", "state": "",
  "bucket": "upcoming", "badge": ""
}
```

- **`category.display`** is the chip's text and **`category.accent`** its colour
  and the card's edge stripe. Both come from the panel — keep no palette in the
  FE, or retiring a category leaves a colour behind that nothing can change.
- **`prabodhak`** is already resolved: one name, `"Multiple"`, or `""` when
  none is set. `prabodhak_initials` is the avatar (`"M"` for multiple).
- **`location`** is the card's one line, ready to print. Online events say
  `"Online"`; `city`/`state` are there for a client that wants them apart.
- **`end_date` is `null` for a single-day event** — render just the start date.
- **`badge`**: `""` while upcoming or ongoing, `"completed"` once it is over,
  `"recording_available"` once a playlist link exists. That is the grey pill
  beside the category chip on screen 3.
- **`slug`** is the id everywhere, including Share. It is ASCII: an English
  title keeps its own words, a Hindi one becomes `{category}-{start_date}`
  (`adhyayan_abhyas-2026-07-10`), because Django's Unicode slugifier strips
  Devanagari matras and produces a link misspelt in the only script that could
  read it.

**No pagination.** The three tabs hold single or low-double digits between them,
and the counts want the whole set anyway. If this ever grows past a few hundred
rows it gets cursor pagination *and a note here* — not a silent cap.

**Ordering**: Upcoming and Ongoing are soonest first; **Past is newest first** —
the shivir that just ended is the one being looked for.

---

## 2. `GET events/{slug}/` — the detail screen

One call renders both halves of the design (screens 4 and 5). Everything from
the card, plus:

```json
{
  "prabodhaks": [ { "id": 1, "name": "…", "initials": "SN", "photo": null } ],
  "tags": ["Book"],
  "address": "Kiritpur, Post Ranka, Chhattisgarh",
  "map_url": "https://maps.google.com/?q=…",
  "poster": "https://…/events/posters/….jpg",
  "invitation_note": "मध्यस्थ दर्शन सह अस्तित्ववाद …",
  "registration_url": "https://forms.gle/…",
  "contacts": [ { "name": "राम मिलन भैया", "phone": "+919406263905" } ],
  "links": [ { "type": "social", "type_label": "Social",
               "label": "Join Whatsapp Group", "url": "https://…" } ],
  "recording_url": "https://youtube.com/playlist?list=…"
}
```

- **`poster`** is an absolute URL or `null`. Readers may download it — the app's
  download button saves this file. Design your empty state: a poster is optional
  and some events will not have one.
- **`invitation_note`** is plain text with **blank lines between paragraphs**.
  It is not HTML and not Markdown; render it preserving line breaks.
- **`registration_url`** is the organiser's own form. **There is no in-app
  registration** — no endpoint accepts a reader's details, by design. Hide the
  button when this is empty.
- **`contacts`** are the tap-to-call chips. `phone` is stored as typed,
  including the `+91`.
- **`links`** is the Links section, in the manager's order, and it **excludes**
  the recording playlist so it can be rendered straight through.
- **`recording_url`** is the playlist, served on its own — it is what drives the
  `recording_available` badge, and it has its own section in the design.
- **`tags`** are the optional grey chips beside the category ("Book"). Often
  empty.

Draft events 404 here, exactly as an unknown slug does.

---

## 3. `GET events/filters/` — the filter sheet

```
GET /api/v1/events/filters/?bucket=upcoming&category=sammelan
```

Returns `categories`, `languages`, `modes` and `cities`, each option with a
`count`.

**Each option is counted with its own filter dropped**, under whatever else is
applied. That is what lets an unselected category chip read 3 while the category
filter sits on something else. Counting every option under the full filter set
is the bug that makes the sheet look empty the moment anything is picked.

`cities` lists only cities that actually have events in this bucket — the
dropdown never offers a choice that returns nothing.

For **"Show N events"** on the sheet's button, call `events/` with the pending
filters and read `counts[bucket]`; it is computed under exactly the same rules.

---

## 4. What the manager controls

So the FE knows what can change without a deploy:

| Panel screen | Effect on this API |
|---|---|
| Shivir Categories | Adds/renames/recolours a category. **The A–G list is data, not a fixed set** — do not hardcode seven chips. |
| Event Languages | Same for the five languages. |
| Prabodhaks | The names and avatars. |
| Events | Everything else, including pasting the playlist link after a shivir ends. |

A retired category or language keeps working for events already filed under it,
but stops appearing in `filters/`. Read the filter sheet from the API each time
rather than caching it across sessions.

---

## 5. Not built yet

**Centres** and **Links**, the other two pages of the Connect workspace, have no
endpoints. They are separate models with their own screens, still to be
designed. Connect's **Links** page is not the same thing as an event's `links` —
do not build one expecting to reuse the other.

Bookmarking an event (the ⌘ in the detail header) is not wired: `me/bookmarks/`
covers book paragraphs today. It needs a small BE change; ask before building
against it.
