# Connect Directory API v1 — Centres, City-wise Contacts, Links

The contract behind the designed screens 7–13: the Centres list and its expanded
card, the City-wise contacts page with its "Choose a state" sheet, and the Links
page with its accordions. Base URL is the same as everything else: `/api/v1/`.

Anonymous, read-only, published-only, cached — the same rules as the rest of the
public API (API_Contract_v1 §8). Events are documented separately in
Events_API_v1.md; this file replaces that document's §5 "Not built yet".

---

## 0. The one rule that shapes everything here

**The app decides nothing it would have to recompute.** The "Est. 2011" pill, the
CS/SP avatar letters, the "Achoti, Chhattisgarh" line under a name, the dialable
form of a phone number and the `1.` `2.` `6.` `a.` `b.` numbering on the Links
page all arrive as finished values.

The numbering matters most: it comes from the **order of the rows**, not from a
stored number. Insert a link between two others on the panel and everything below
renumbers by itself. Do not number rows in the FE — two clients numbering the
same list is how the two drift apart.

**There is no detail endpoint** for a centre or for a link group. Both screens
expand in place (comps 8 and 13), so the list call already carries what the
expansion shows.

---

## 1. `GET centres/` — the Centres screen (comps 7–9)

```
GET /api/v1/centres/
GET /api/v1/centres/?state=cg      # optional, not in the design
```

Returns a plain array — **no pagination, no envelope**.

```json
[
  {
    "id": 3,
    "name": "Achoti, Raipur, CG",
    "org_name": "Abhyuday Sansthan",
    "est_year": 2011,
    "est_label": "Est. 2011",
    "city": "Achoti",
    "state": { "code": "cg", "name": "Chhattisgarh" },
    "address": "Village Achoti, Tehsil Dharsiwa, Raipur, Chhattisgarh",
    "pincode": "493111",
    "map_url": "https://maps.google.com/?q=…",
    "phone": "98930-25307",
    "phone_href": "9893025307",
    "website": "https://example.org",
    "programmes": [
      { "code": "adhyayan_6m", "name": "6 months Adhyayan" },
      { "code": "shodh_kendra", "name": "Shodh Kendra" }
    ],
    "contacts": [
      { "id": 11, "name": "Chandrashekhar", "role": "", "initials": "CS",
        "phone": "9893013341", "phone_href": "9893013341",
        "email": "rathore.civil@gmail.com",
        "city": "Achoti", "state": { "code": "cg", "name": "Chhattisgarh" },
        "location": "Achoti, Chhattisgarh" }
    ],
    "note": ""
  }
]
```

**Almost every field is optional, and the design already handles absence** — see
Bemetara on comp 9, which shows no address block at all:

| Empty field | What the card does |
|---|---|
| `est_label` / `est_year` | No pill beside the heading. |
| `address` | No pin row, and no "View on map" — even if `map_url` is set. |
| `map_url` | Address prints, "View on map" is not a link. |
| `phone` | **Hide the Call button.** |
| `website` | **Hide the Visit Website button.** |
| `programmes` | No PROGRAMMES section inside More details. |
| `contacts` | No CONTACT section inside More details. |

Other notes:

- **`name` is the whole heading, ready to print** ("Achoti, Raipur, CG",
  "Hapud, NCR Delhi"). It is typed by the manager and not assembled from
  city/state — those four designed headings share no rule that could assemble
  them. `city` and `state` are there for grouping, not for the heading.
- **`phone` is the number as written down; `phone_href` is what to dial.** Use
  `tel:{phone_href}` for the Call button and print `phone` on screen. The FE
  formats nothing.
- **`note`** is an optional free line for anything the fields miss; render it
  inside More details when non-empty.
- **Ordering** is the manager's (`ordering`, then name). Do not re-sort.
- Draft centres are never served, exactly like draft events.

---

## 2. `GET contacts/` — City-wise contacts (comp 10)

```
GET /api/v1/contacts/            # every state — the sheet's "All states"
GET /api/v1/contacts/?state=cg
```

Returns a plain array of the same contact shape as above:

```json
[
  { "id": 11, "name": "Chandrashekhar", "role": "", "initials": "CS",
    "phone": "9893013341", "phone_href": "9893013341",
    "email": "rathore.civil@gmail.com",
    "city": "Achoti", "state": { "code": "cg", "name": "Chhattisgarh" },
    "location": "Achoti, Chhattisgarh" }
]
```

- **`initials`** is the avatar's two letters. **`location`** is the grey line
  under the name, ready to print.
- **`phone` and `email` are both optional** and often only one is set — Suresh
  Patel on comp 10 shows neither. A contact always has at least one of the two,
  so a card is never a dead end, but design for either being absent.
- **`role`** is usually empty. Render it under the name when set.
- Ordered state → city → name, so the list reads as a directory.
- Some of these people are also a centre's contact person: the same row appears
  in `centres/`'s `contacts` and here. **They carry the same `id`** — one person,
  one record, one phone number to correct.

---

## 3. `GET contacts/states/` — the "Choose a state" sheet (comp 11)

```json
{
  "total": 24,
  "states": [
    { "code": "cg", "name": "Chhattisgarh", "count": 6 },
    { "code": "delhi_ncr", "name": "Delhi NCR", "count": 3 }
  ]
}
```

- **`total`** is what the "All states" row resets to.
- **Only states that actually have somebody are listed.** A sheet must never
  offer a choice that opens an empty screen, so this is the whole list to render
  — do not hold a list of Indian states in the FE.
- "Delhi NCR" is on it and is not a state. That is deliberate: the list is the
  organisation's, maintained on the panel.
- The sheet's search box filters this array client-side; there is no `?q=`.

---

## 4. `GET links/` — the Links page (comps 12–13)

One call renders the whole page, collapsed and expanded.

```json
[
  {
    "code": "whatsapp_telegram",
    "title": "WhatsApp / Telegram Groups",
    "icon": "chat",
    "items": [
      { "id": 1, "number": "1.", "label": "Shivir Announcements ONLY Channel (WhatsApp)",
        "url": "https://chat.whatsapp.com/…", "is_heading": false, "children": [] },
      { "id": 6, "number": "6.", "label": "Regional WhatsApp Groups:",
        "url": "", "is_heading": true,
        "children": [
          { "id": 7, "number": "a.", "label": "Deogarh – Jharkhand Study Circle",
            "url": "https://chat.whatsapp.com/…", "is_heading": false },
          { "id": 8, "number": "b.", "label": "Abhyuday Sansthan, Raipur (CG) Updates",
            "url": "https://chat.whatsapp.com/…", "is_heading": false }
        ] }
    ]
  }
]
```

- **`icon`** is a code, not an image. The five values are `chat`, `video`,
  `facebook`, `people`, `link` — map them to your own inline SVGs. A new group
  can only ever carry one of these five.
- **`number`** is the printed prefix, including the dot. Top level is `1.`…`n.`,
  children are `a.`…`z.`.
- **`is_heading: true`** means a row with no URL — the label above its children
  (`6.` above). Render it as a heading, not as a tappable row; it is styled
  differently in the design.
- **`children`** is present on top-level rows only, and nesting stops at one
  level. It is `[]` for an ordinary link.
- **Groups with no visible rows are not returned at all.** An accordion that
  opens onto nothing is worse than one that is not on the page, so the seeded
  four groups appear only once they have links in them.
- Group order and row order are the manager's.

---

## 5. What the manager controls

So the FE knows what can change without a deploy:

| Panel screen | Effect on this API |
|---|---|
| Centres | Every field of a card, its programmes, its contact people, and whether it is published at all. |
| City-wise Contacts | The directory in §2, including people attached to no centre. |
| Links | The groups (title, icon, order) and every row inside them, including headings and their children. |
| Centre Programmes | The chips in `programmes`. **Not a fixed set** — do not hardcode four. |
| States | The list in §3, including its codes. Adding a state is a panel row. |

A retired programme disappears from the cards using it; a retired **state**
stops appearing in §3's sheet, though contacts filed under it still show up
under "All states". Read §3 from the API each time rather than caching it across
sessions.

---

## 6. Deliberately absent

- **No search endpoint.** All three screens fit in one call each; filter and
  search client-side.
- **No pagination** anywhere in this file. These are directories of a few dozen
  rows. If one reaches the hundreds it gets cursor pagination *and a note here*
  — never a silent cap.
- **No "nearest centre" or geolocation.** Nothing here stores coordinates; the
  map link is a URL the manager pasted.
- **Connect's Links page is not an event's `links`.** Different models, different
  endpoints, different shape — do not build one expecting to reuse the other.
