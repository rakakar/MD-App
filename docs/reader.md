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

## 6. आगे के लिए खुला

- **पर्दा बंद होने पर audio:** device TTS screen lock पार नहीं कर सकती। यह
  सिर्फ़ BE की बनाई हुई renditions से हो सकता है — FE का काम नहीं।
- **Voice picker UX** — model में कई renditions पहले से बैठ सकती हैं
  (BE: `docs/manuals/tts_manual.md` §9), FE पर चुनने का तरीक़ा अभी नहीं है।
