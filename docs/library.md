# Library — एक पेड़, चार shelves, और खोजने के दो तरीक़े

जो book नहीं है वह सब एक ही nested tree में है — `Node` (folder) और `Item`
(file या link). BE का model `MDApp/docs/product/Content_Model_v3.md` में है; यह
दस्तावेज़ बताता है कि FE उस पेड़ को कैसे दिखाता है।

---

## 1. `/library/[id]` — हर गहराई पर एक ही component

`GET nodes/{id}/` **depth 1 और depth 6 पर बिल्कुल एक ही shape** लौटाता है, और
यही पूरी बात है। पुराना तीन-screen वाला रास्ता (door page → collection card →
track list) इसी से एक component में सिमट गया:

- जिसे "collection" कहते थे वह एक folder है जिसमें files हैं,
- audio series एक folder है,
- और अकेली पड़ी PDF को किसी wrapper की ज़रूरत ही नहीं।

`src/components/library/NodeView.tsx` — जिस folder के नीचे और folders हैं वह
index की तरह renders होता है, और जिसके नीचे सिर्फ़ files हैं वह player वाले
album की तरह।

**Recursion route से है, nesting से नहीं.** हर level का अपना URL है और अपना
fetch — यही deep link को साझा करने लायक़ बनाता है और back button को मतलब देता
है। `children` जान-बूझकर इतना नहीं भेजा जाता कि बिना दूसरी request के आगे बढ़ा
जा सके।

## 2. URLs workspace-neutral हैं — एक अपवाद के साथ

`/library/42` में workspace का नाम नहीं है, और यह जान-बूझकर है: Connect का
brochure अगर `/resources/…` पते पर मिले तो वह **झूठ बोलता हुआ URL** है।

अपवाद सिर्फ़ **root** है, क्योंकि root ही shelf है और उसका पता पाठकों के पास
पहले से है (`src/lib/library.ts`):

| Workspace | Shelf |
|---|---|
| `originals` | `/originals` |
| `resources` | `/resources` |
| `connect` | `/connect/library` |
| `translations` | अभी कोई folder नहीं — मिलने के दिन इसे भी shelf मिलेगा |
| `journey` | कभी content नहीं रखता |

Connect का shelf workspace home नहीं बल्कि एक section है (`/connect` events
feed है, PRD §8) — पर उस root का इकलौता पता वही है, इसलिए उसका card कभी
`/library/4` पर नहीं गिरता।

`shelfMap()` `root_node_id` पर branch करता है, उसके होने का अनुमान नहीं लगाता —
वह `journey` के लिए `null` है, और किसी भी unpublished root के लिए भी (§10.1).

## 3. `/av` — Originals का अपना दरवाज़ा

Originals में उनकी आवाज़ के लगभग चालीस घंटे हैं, और वह सामग्री एक ऐसे shelf पर
tile grid के दो tap नीचे बैठी थी जिसकी सबसे बड़ी गिनती तस्वीरों की है। `/av` उसी
सामग्री को सीधे संबोधित करता है।

यह **दरवाज़ा है, कमरा नहीं** — और यही इसका पूरा design है।

## 4. Browse बनाम Find — दो calls, एक test

Library folders को गिनाने के **दो अलग calls** हैं:

| | Endpoint | कैसा |
|---|---|---|
| **Browse** | `nodes/` (§13.2) | एक level, cached, कोई breadcrumb नहीं — जिस shelf पर पाठक उतरता है |
| **Find** | `library/search/` (§13.8) | गहरा, ranked, faceted, paginated — हर row अपना रास्ता साथ लाती है |

FE इन दोनों के बीच **ठीक एक test** पर स्विच करता है (`isAsked`, `src/lib/find.ts`):

> **न query, न कोई chip, न कोई sort → browse. वरना → find.**

Sort इस test में 12 अगस्त 2026 को जुड़ा। "सबसे नया पहले" अपने आप में एक पूरा
सवाल है, और browse उसे मान ही नहीं सकता — `nodes/` का क्रम manager का है
(`sequence`, फिर नाम)। BE भी इसी तरह गिनता है (§13.8, *"An `ordering` counts as
asking"*), इसलिए दोनों तरफ़ एक ही नियम है।

Find की हर row breadcrumb क्यों रखती है और browse की नहीं: find के नतीजे हर
गहराई से आते हैं, और *"सत्र 1"* library के हर शिविर में वही तीन शब्द हैं।

Query कम से कम **2 अक्षर** (`MIN_QUERY_CHARS`), page पर **25** rows
(`FIND_PAGE`).

**सब कुछ URL में है** — इसलिए छाना हुआ shelf एक असली पता है: साझा हो सकता है,
bookmark हो सकता है, और back button पाठक को एक-एक chip करके filter से बाहर
निकालता है (U9).

### Sort by — तीन विकल्प, और चौथी हालत जिसका कोई radio नहीं

Filter sheet का तीसरा section `ordering` लिखता-पढ़ता है (§13.8): `-added`
(Newest first), `added` (Oldest first), `-duration` (Longest first)। Contract एक
चौथा `duration` भी देता है — comp उसे नहीं खींचता, इसलिए FE भी नहीं पढ़ता।

जो सचमुच लागू है वह `state.ordering` नहीं, **`effectiveOrdering()`** है, और उसकी
तीन हालतें हैं:

| हालत | sort | क्यों |
|---|---|---|
| Browse (कुछ नहीं पूछा) | कोई नहीं | rows `nodes/` से आ रही हैं; उन पर दावा करना झूठ होगा |
| Find, box ख़ाली | `-added` | comp यही selected दिखाता है, और बिना query हर row का score शून्य होता है — यानी "ranking" सिर्फ़ नाम का क्रम है |
| Find, box में शब्द | कोई नहीं | relevance, जो तीनों में से कोई नहीं — section "Best match" कहता है और कोई radio नहीं जलता |

**URL में सिर्फ़ चुना हुआ sort जाता है, default नहीं.** Default को हर chip के
href में लिखने से अछूता shelf छना हुआ दिखने लगता, और `isAsked` ऐसे पन्ने पर
पलट जाता जहाँ किसी ने कुछ पूछा ही नहीं। Request में असली वाला जाता है —
`findLibrary()` उसे वहीं जोड़ता है।

## 5. Sieve — chips किस क्रम में हैं, और क्यों

`FIND_AXES`, बाएँ से दाएँ:

> **प्रमाण · वर्ष · स्थान · व्यक्ति · भाषा · प्रकार**

**प्रमाण (provenance) पहले** — *"इनमें से उनका अपना कौन-सा है?"* यही वह सवाल है
जिसके लिए यह संग्रह मौजूद है, और वह इस बात से ऊपर है कि चीज़ किस साल की है।

**प्रकार (kind) आख़िर में** — *"बस audio दिखाओ"* असली ज़रूरत है, पर पहली कभी
नहीं। format वाला filter सबसे ऊपर रख देने से library दोबारा file browser बन
जाती है।

जलती हुई chip पर tap उसे बुझा देता है — फ़ोन पर हर row के बग़ल में दूसरा control
रखे बिना बाहर निकलने का यही अकेला रास्ता है।

### विषय (topic) इस सूची में क्यों नहीं है

विषय **filter ही है** — `ALL_AXES` में सातवाँ axis, endpoint उसे बाक़ी छहों की
तरह ही पढ़ता और गिनता है। वह इस row में नहीं बल्कि अपने अलग panel में ऊपर बनता
है, क्योंकि पाठक सबसे पहले उसी की तरफ़ हाथ बढ़ाता है और उसके मान अकेले ऐसे हैं
जो manager लिखता है।

**यह पहले navigate कर देता था, अब जगह पर छाँटता है.** shelf पर किसी विषय को छूने
पर पाठक shelf छोड़कर `/library?topic=` पर चला जाता था — हर गहराई और हर workspace
से आई एक सपाट सूची — और जो collections वह देख रहा था वे ग़ायब। अब tiles वहीं
रहती हैं और उनकी गिनती घटती है। BE में कुछ नहीं बदला; इसे अलग तरह का control
सिर्फ़ FE समझ रहा था।

वह पुराना दरवाज़ा panel के अंदर एक link की तरह बचा है, क्योंकि *"एक विषय के नीचे
जो कुछ भी है, चाहे कहीं भी हो"* अब भी असली सवाल है — बस वह नहीं जो पाठक shelf पर
खड़े होकर पूछ रहा होता है।

**यह panel बदलने वाला है।** 11 अगस्त 2026 की finished comps इन दो बंद rows की
जगह search box के बगल में एक **Filters** button रखती हैं, जो गिनती के साथ जलता है
और एक sheet खोलता है (`FilterButton` · `FilterSection` · `RadioList` ·
`ActiveFilters` — तीनों बन चुके हैं, अभी जुड़े नहीं)। ऊपर वाला तर्क — कि चिप्स
पाँच सौ pixel में shelf को नीचे धकेल देती थीं — उसी नतीजे पर पहुँचता है; sheet
उसे और आगे ले जाती है। देखिए **[design-system.md](design-system.md)**।

## 6. यह search किस हद तक जाती है

Library की find सिर्फ़ **metadata** पढ़ती है — नाम, description, विषय, वर्ष,
स्थान, व्यक्ति, tags, filename. **File के अंदर कभी नहीं जाती** (§13.9).

यह कमी नहीं, सीमा है। संसाधन उसी file की तरह परोसे जाते हैं जो वे हैं; उनमें
paragraph होते ही नहीं जिन्हें index किया जाए। जिस file को पूरा reader treatment
चाहिए वह **Book बनकर** दोबारा बनती है — और यह manager का फ़ैसला है, अपने आप कभी
नहीं होता।

तीन searches का पूरा फ़र्क़ (catalogue · citation · परिभाषा) और उनकी सरहद:
BE का `docs/product/Catalogue_Search.md`.

**अभी बाक़ी (P4):** `/search` पर scope row — पुस्तकों में / संसाधन / सब. दोनों
lanes तब भी **कभी नहीं मिलेंगी**: citation A. नागराज जी के अपने शब्दों तक
quotable है, metadata hit सिर्फ़ एक folder है जिसके नाम में वह शब्द आ गया। दोनों
को एक सूची में मिला देना दूसरे को पहला बनकर निकल जाने देगा।

## 7. पाँच workspaces

`src/lib/workspaceConfig.ts` — `originals` · `translations` · `resources` ·
`journey` · `connect`.

BE भी अब इन्हें workspace ही कहता है और उसके codes बिल्कुल यही ids हैं
(contract §10) — इसलिए **किसी भी तरफ़ कोई code→workspace mapping table नहीं**
है। जो यहाँ है और API में नहीं, वह chrome है: नाम, tagline, tabs, रंग।

तीन workspaces का content `?workspace=` से छनता है — `originals`,
`translations`, `resources`. बाक़ी दो के पास अपना कोई sectioned content नहीं:
`journey` signed-in पाठक का अपना है, `connect` events/centers module है।

**Interface English बोलता है, content जो है वही बोलता है.** Workspace, genre और
provenance के Hindi labels इसी repo में हैं — API अंग्रेज़ी नाम भेजता है और
Devanagari design की चीज़ है।
