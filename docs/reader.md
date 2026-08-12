# पढ़ना — दो readers, एक display system

यह app पढ़ने के लिए है, और लगभग **90% पाठक फ़ोन पर हैं**। जब भी desktop की सजावट
और फ़ोन पर पढ़ने में चुनना पड़ा है, फ़ोन जीता है। यह दस्तावेज़ बताता है कि पढ़ने
वाला हिस्सा किन फ़ैसलों पर खड़ा है — ताकि वे दोबारा न खोले जाएँ।

---

## 1. दो readers हैं, और दोनों पूरी screen लेते हैं

| Reader | Route | क्या renders होता है |
|---|---|---|
| **Book reader** | `/books/[code]/[chapter]` | reflowable text — paragraph blocks, printed-page separators, footnotes |
| **PDF reader** | `/library/[id]/read/[fileId]` | असली document, pdf.js से canvas पर |

दोनों **app shell के बाहर** render होते हैं। नियम `src/lib/routes.ts` में एक जगह
लिखा है (`READER_ROUTE`, `PDF_READER_ROUTE`, `ownsViewport()`).

**वजह गिनी हुई है:** 375×812 के फ़ोन पर header और bottom nav मिलकर ~26% screen
खा जाते हैं, और chapter के बीच में उनमें से कुछ भी काम का नहीं होता।

PDF वाला रास्ता इससे भी महँगा सीखा गया। पहले वह library card के अंदर 75vh के
box में खुलता था — यानी एक ऐसे page के अंदर document जिस page पर header, bottom
nav और पाँच और files भी थीं। फ़ोन पर वह letterbox से पढ़ना था, और browser का
अपना full-screen viewer उससे बेहतर था — जिसका मतलब यह हुआ कि "पढ़ी हुई जगह याद
रखने" के बदले पाठक से बुरा viewer माँगा जा रहा था। कोई यह सौदा नहीं करता।
**Document पढ़ना है, और पढ़ना यहाँ पूरी screen लेता है।**

### `ownsViewport()` और `isReaderRoute()` अलग क्यों हैं

दोनों readers से app chrome हटता है — इसलिए `ownsViewport()`. लेकिन book
reader की typography — face, margins, line height — उस page के लिए कोई मायने
नहीं रखती जो **तस्वीर** है। reader theme सिर्फ़ उसी को मिलती है जो text
render करता है, इसलिए `isReaderRoute()` अलग रहता है।

## 2. Chrome ख़ुद हट जाता है — `useReaderChrome`

Reader की अपनी ऊपर/नीचे की पट्टियाँ इस क्रम से बरतती हैं (`src/components/reader/useReaderChrome.ts`):

- chapter खुलते ही दिखती हैं, फिर ~2.2s में ख़ुद हट जाती हैं — पहले पता चले कि
  क्या मौजूद है, फिर page आपका।
- **Scroll mode** में scroll की दिशा से चलती हैं: नीचे पढ़ना = छिप जाना, ऊपर
  हाथ बढ़ाना = वापस आना।
- page के **बीच में एक tap** दोनों modes में इन्हें toggle करता है।
- कोई भी sheet या dialog खुला हो तो वे **टिकी रहती हैं** — जिस button ने sheet
  खोली वह उसके नीचे से ग़ायब नहीं होना चाहिए।

यही hook दोनों readers चलाता है। फ़र्क़ सिर्फ़ इतना है कि book window scroll
करती है और PDF अपने अंदर का एक box (`scroller` उसी के लिए है) — दो copies रखने
की यह बहुत कमज़ोर वजह होती, और वे बहकतीं।

## 3. PDF हम ख़ुद क्यों render करते हैं

`<iframe>` में browser का अपना viewer एक cross-origin काला डिब्बा है। उससे यह
पूछा ही नहीं जा सकता कि पाठक किस page तक पहुँचा — यानी library में PDF अकेली
ऐसी चीज़ थी जिसे कोई वहीं से उठा नहीं सकता था जहाँ छोड़ा था।

observer, page store, दो files दूर दिखने वाला resume card — यह सब उसी एक
ग़ायब संख्या पर टँगा है (`src/components/library/PdfReader.tsx`).

**क्या render होगा, यह सवाल नहीं है।** pdf.js text, स्कैन की हुई raster और
vector charts — तीनों एक ही code path से बनाता है, और library की PDFs तीनों
तरह की हैं। पुरानी pre-Unicode Devanagari face भी सही बनती है क्योंकि वह
embedded है — भले उसका *text* mojibake निकलता हो। इससे selection और search
जाते हैं, दिखने वाला कुछ नहीं।

**जो यह नहीं कर सकता:** भारी file को हल्का बनाना। इसीलिए fallback मौजूद है
(`PdfFallback.tsx`) — पर वह Android पर उस viewer पर नहीं गिरता जो वहाँ है ही
नहीं।

## 4. Display system — पूरे app का, सिर्फ़ reader का नहीं

Theme पहले reader के अंदर रहती थी, और इसीलिए Dark चुनने पर सफ़ेद app के अंदर
काला chapter मिलता था। अब यह `DisplayProvider` में है — router के **ऊपर** — और
reader भी बाक़ी सबकी तरह इसी से theme माँगता है (`src/components/shell/DisplayProvider.tsx`).

सब कुछ device-local है और signed out भी चलता है। फ़ोन और laptop को अलग size
चाहिए ही होता है, इसलिए इनमें से कुछ भी account पर sync नहीं होता
(`src/lib/storage.ts`, key `md.prefs.v1`).

### App-wide

| Setting | मान | बात |
|---|---|---|
| `theme` | `system` · `light` · `dark` · `sepia` | default `system` — रात में चमकती हुई खुलने वाली app सबसे आम शिकायत है |
| `appTextScale` | `1 · 1.12 · 1.25 · 1.4` | **सीढ़ी सिर्फ़ ऊपर जाती है** |
| `boldText` | on/off | Tiro में एक ही weight है, इसलिए Devanagari Mukta पर चली जाती है — synthesized bold से मसली नहीं जाती। Book text जान-बूझकर अछूता |

**1 से नीचे कोई step क्यों नहीं:** app का baseline पहले ही चालीस पार के पाठकों
के लिए एक **फ़र्श** की तरह तय हुआ था (13px न्यूनतम, 15px body)। "Smaller" उसी
अपठनीयता पर लौटने का एक-tap रास्ता होता जिससे बचने के लिए यह फ़र्श बना — और वह
tap जान-बूझकर से ज़्यादा ग़लती से दबता, ठीक उन्हीं लोगों से जिन्हें सबसे ज़्यादा
नुक़सान होता।

### सिर्फ़ book text के लिए

| Setting | मान |
|---|---|
| `face` | `serif` (default) · `sans` |
| `readerTheme` | `original` (default) · `quiet` · `paper` · `bold` · `calm` · `focus` |
| `fontScale` | 8 steps, `0.85` से `1.7` |
| `lineHeight` | `1.85 · 2.05 · 2.3` |
| `margin` | 0 (सँकरा) · 1 · 2 (चौड़ा) |
| `readingMode` | `page` · `scroll` · `null` = अपने आप (print → page, digital → scroll) |
| `tapZones` | Pages mode में किनारे पर tap से page पलटना |
| `glossaryUnderline` | default **off** |

**दो axes, एक नहीं (11 अगस्त 2026)।** `theme` app का है, `readerTheme` सिर्फ़
किताब का काग़ज़। Designer की Theme & Settings sheet छह surfaces देती है — Original ·
Quiet · Paper · Bold · Calm · Focus — पर app अपने चार (Auto/Light/Sepia/Dark) रखता
है: **Auto** ही वह चीज़ है जो सूरज ढलते ही फ़ोन के साथ app को भी बदल देती है, और
जिस किताब को क्रीम काग़ज़ पर चुना गया वह शाम होने से धूसर नहीं होनी चाहिए।

`original` कुछ भी declare नहीं करता — वह app theme के aliases हैं, यानी जिसने
sheet कभी खोली ही नहीं उसे बिल्कुल वही मिलता है जो पहले मिलता था। `bold` surface
है ही नहीं, **weight** है (Tiro में एक weight है, इसलिए किताब की देवनागरी Mukta
500 पर जाती है)।

दोनों axes आपस में असहमत हो सकते हैं — हल्के app में Quiet काग़ज़, या गहरे app में
Calm — इसलिए किताब के अंदर `--ws-ink`, status bar (`theme-color`) और `colorScheme`
तीनों **किताब** की ink के हिसाब से तय होते हैं, app की नहीं। यही वजह है कि `Sheet`
को `surface` prop मिली: header से खुलने वाली Display sheet क्रीम screen पर लगभग
काली आने वाली थी। पूरा हिसाब **[design-system.md](design-system.md)** में है।

**Serif क्यों default है:** ये किताबें इसी में छपी हैं। **Sans क्यों मौजूद है:**
कम-DPI Android पर छोटे size में serif की पतली लकीरें और चढ़ी-उतरी मात्राएँ गड्ड
हो जाती हैं — और जो पाठक page पढ़ ही नहीं पा रहा, उसके लिए face का असली होना
बेकार है।

**Line height 1.85 से नीचे क्यों नहीं:** Devanagari की मात्राएँ पंक्ति के ऊपर
और नीचे दोनों बैठती हैं; इससे कम पर वे टकराती हैं। सीढ़ी सिर्फ़ खोलती है, कसती
कभी नहीं — घनापन size और margins से आता है।

**`glossaryUnderline` off क्यों है:** नापा गया है। परिभाषा इन्हीं किताबों पर
बनी है, इसलिए एक chapter के लगभग **42%** शब्द headwords हैं। छाँटकर ~20% पर भी
वह एक रँगा हुआ page है — कुछ पाठक यह चाहते हैं, ज़्यादातर नहीं। शब्द पर tap
करके अर्थ दोनों हाल में मिलता है; यह setting सिर्फ़ यह तय करती है कि page पहले
से बता दे या नहीं।

### Pre-hydration script

`app/layout.tsx` में theme वाला inline script hydration से पहले चलता है, ताकि
पहली paint में ही सही रंग हो। **उसमें `routes.ts` वाले regex की नक़ल है** —
route नियम बदलें तो दोनों जगह बदलें। `routes.ts` की टिप्पणी यह याद दिलाती है।

## 5. Offline

- **Text:** पूरी book IndexedDB में (`src/lib/idb.ts`) — "Download for offline".
- **Audio:** एक बार में **एक chapter**, हमेशा जान-बूझकर, और size पहले दिखाकर
  (`src/lib/audioCache.ts`)। वजह: ffmpeg से पहले बनी renditions **WAV** हैं —
  48 kB/second, यानी 24 मिनट का एक chapter ~70 MB. mp3 छह गुना हल्की है, फिर भी
  पूरी book सौ MB पार। आकार दोनों हाल में यही रहता है।
- Audio का cache `md-audio-v1` है — **`md-sw-v*` के बाहर जान-बूझकर**, क्योंकि
  worker upgrade अपनी caches साफ़ कर देता है और पाठक का बचाया हुआ audio deploy
  में नहीं मरना चाहिए।
- File `no-cors` से आती है (media host CORS headers नहीं भेजता), इसलिए response
  opaque है। इसकी दो क़ीमतें हैं: **download progress नहीं दिखता** और **असली
  byte count नहीं मिलता** — size duration से अनुमानित है।

दो service workers, दो scopes — `/sw.js` scope `/` का मालिक है (offline shell +
बचाया हुआ audio), और push वाला worker
`/firebase-cloud-messaging-push-scope` पर register होता है। push worker को `/`
पर register करना offline worker को चुपचाप बदल देगा और उसके साथ downloaded
books ले जाएगा। विस्तार: [push-notifications.md](push-notifications.md).

## 6. Highlights — एक highlight असल में क्या है

**एक highlight = एक bookmark + उसके अंदर के spans.** कोई अलग model नहीं, न BE
पर न store में। Bookmark की पहचान अब भी *(पाठक, paragraph)* है; रंगे हुए शब्द
उसी एक row के अंदर list बनकर बैठते हैं (contract §6.0 `ranges`)।

यह list क्यों है, एक span क्यों नहीं: इस साहित्य के paragraph सात-सात पंक्ति के
हैं। एक span होता तो पाठक दूसरा वाक्य रंगते ही पहला चुपचाप ग़ायब हो जाता। और
पहचान को *(पाठक, paragraph, span)* बनाने पर BE का unique constraint और FE के
sync की हर key बदलनी पड़ती — list उसी row के अंदर रखने से दोनों में से कुछ नहीं
बदला।

### तीन नियम जो तोड़ने पर चुपचाप ग़लत होता है

**1. भरोसा offsets पर नहीं, शब्दों पर है.** हर span अपने साथ अपना `text` भी
रखता है। Offsets उस paragraph के हैं जो दोबारा extract और publish हो सकता है;
शब्द वह चीज़ हैं जिनसे span ख़ुद को दोबारा ढूँढ़ लेता है। `anchorSpan()` पहले
जाँचता है कि उन offsets पर वही शब्द हैं या नहीं, फिर शब्द ढूँढ़ता है, और न
मिलें तो **span गिरा देता है** — पुराने offsets पर रंग देना पाठक का highlight
किसी और वाक्य पर चिपका देता, जो खोने से बुरा है और पकड़ में भी नहीं आता। BE
बिना `text` वाला span 400 करता है, इसी वजह से।

**2. `data-not-text` गिनती से बाहर रखता है.** List का marker ("3.") और footnote
का तारा paragraph के अंदर ही render होते हैं पर `text_hi` का हिस्सा नहीं हैं।
इन्हें गिन लेने से हर list item का highlight दो-चार अक्षर खिसक जाता। `blocks.tsx`
में जो कुछ text नहीं है, उस पर यह attribute लगाइए।

**3. Span selection के समय नापा जाता है, tap के समय नहीं.** जब तक पाठक swatch
दबाता है तब तक selection हिल या मिट चुकी हो सकती है। नाप के बाद उसे चुने हुए
शब्दों से verify किया जाता है; न मिले तो पूरा paragraph रंग जाता है — जो पुराना,
मोटा व्यवहार है और कभी ग़लत नहीं होता, बस बारीक नहीं।

पुराने whole-paragraph highlights (`colour` है, `ranges` नहीं) आज भी चलते हैं:
`wholeParagraph()` उन्हें एक span बना देता है ताकि renderer के पास एक ही शक्ल
रहे।

Paribhasha के निशान और highlight एक-दूसरे की सीमा नहीं मानते — headword आधा रंगा
हो सकता है, highlight शब्द के बीच से शुरू हो सकता है — इसलिए `paintSegments()`
दोनों को **एक ही runs** में काटता है, दो passes में नहीं।

### सबसे आसानी से लौट आने वाला bug

Store में highlight है और पन्ने पर नहीं दिखता। दो बार हो चुका है, दोनों बार
अलग वजह से:

- reader saved highlight को रंगता ही नहीं था (कोड में वह हालत थी ही नहीं);
- account से आए spans store में लिखे जाते थे पर पन्ना दोबारा नहीं पढ़ता था —
  reader store को mount पर एक बार पढ़ता है और sync कुछ सेकंड बाद उतरता है।

दूसरे का इलाज **`PERSONAL_SYNCED`** है (`lib/personal.ts`): pull पूरा होने पर एक
event, जिसे reader सुनकर दोबारा पढ़ लेता है। यह **सिर्फ़ sync से** निकलता है,
हर store-write से नहीं — `setLocalStore` resume position पर भी चलता है, जो
पढ़ते हुए हर दो-तीन सेकंड में लिखी जाती है, और उससे event भेजने का मतलब होता
पूरा पन्ना बार-बार बनाना।

### Sync की तरजीह

| हालत | कौन जीतता है |
|---|---|
| local row `dirty` है | local — यहाँ का बदलाव अभी ऊपर जाना बाक़ी है |
| server ने field भेजी ही नहीं | local — यह चुप्पी है, "कुछ नहीं" नहीं |
| बाक़ी सब | server |

बीच वाली पंक्ति असली है: §6.0 से पुराने BE के साथ पहला ही sync device के सारे
highlights मिटा देता। Push पर spans **replace** होते हैं, merge नहीं — merge
सिर्फ़ जोड़ सकता है, तो पाठक का हटाया हुआ highlight अगले sync में लौट आता।

## 7. आगे के लिए खुला

- **पर्दा बंद होने पर audio:** device TTS screen lock पार नहीं कर सकती। यह
  सिर्फ़ BE की बनाई हुई renditions से हो सकता है — FE का काम नहीं।
- **Voice picker UX** — model में कई renditions पहले से बैठ सकती हैं
  (BE: `docs/manuals/tts_manual.md` §9), FE पर चुनने का तरीक़ा अभी नहीं है।
