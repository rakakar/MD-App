# पाठक की बात — FE का आधा हिस्सा

BE का आधा (panel, triage, RBAC, guards) दूसरे repo में है:
`MDApp/docs/manuals/feedback_manual.md`. यह फ़ाइल app की तरफ़ की बात है — यहाँ
क्या है, और ऐसा क्यों है।

---

## 1. जो पाठक भरता है, और जो app इकट्ठा करती है

पाठक **दो** चीज़ें भरता है: एक kind chip और एक message. बाक़ी सब app जुटाती है।

चार kinds (`src/lib/feedback.ts`):

| value | label | hint |
|---|---|---|
| `content` | Correction | Something in the text is wrong |
| `bug` | Bug | Something in the app is broken |
| `idea` | Idea | Something that would make it better |
| `other` | Other | Anything else |

Correct-text और screenshot वैकल्पिक हैं।

**Message छोटा आधा है। क़ीमती आधा `collectContext()` है** — route, build,
device, पिछली कुछ errors — क्योंकि bug report का यही अकेला हिस्सा है जिसे कोई
ग़लत नहीं कर सकता। *"audio रुक जाता है"* हमें एक दोपहर का ख़र्च देता है; वही
वाक्य एक build id और एक नाकाम request के साथ दस मिनट का।

## 2. जो यह फ़ाइल कभी इकट्ठा नहीं करेगी

notes, bookmarks, chat history, session token — और वह कुछ भी जो पाठक ने feedback
box के अलावा कहीं और टाइप किया हो।

Server अनजानी keys गिरा देता है, पर नियम **पहले यहाँ** लागू होता है, जहाँ वह
पढ़ा जा सकता है। `FeedbackContext` एक typed interface है, खुली JSON नहीं।

Query string कभी नहीं जाती — `safePath()` सिर्फ़ pathname रखता है
(`src/lib/clientErrors.ts`). पाठक ने जो search चलाया वह उसका अपना मामला है, और
जिस screen पर गड़बड़ हुई उसकी report में उसका कोई काम नहीं।

## 3. चार दरवाज़े — और कोई floating button नहीं

चारों पहले से मौजूद surfaces पर हैं:

| कहाँ | कैसे खुलता है | किसके लिए |
|---|---|---|
| Reader की selection bar → **Report** | `Reader.tsx` — `content` चुना हुआ, `canonical_ref` और चुना हुआ text साथ | सुधार |
| Account menu → **Send feedback** | `Header.tsx` — kind chips | bug, idea, कुछ भी |
| Account menu → **My feedback** | `/me/feedback` | status और हमारा जवाब |
| Error screen / offline screen → **Report this problem** | `app/error.tsx`, `app/offline/page.tsx` — `bug`, crash पहले से buffer में | ठीक उसी पल जब route गिरा |

**Non-goal जो निभाया गया:** इससे पढ़ने का अनुभव कुछ भी महँगा नहीं होना चाहिए।
कोई नया tab नहीं, कोई floating button नहीं, कोई banner नहीं। जो पाठक कभी कुछ
report नहीं करता उसे app बिल्कुल पहले जैसी दिखती है।

## 4. Sheet router के ऊपर mount है

`FeedbackProvider` `AppShell` में बैठा है — **router के ऊपर** — क्योंकि जिस
screen से पाठक सबसे ज़्यादा report करना चाहता है वह वही है जो अभी-अभी render
होने में नाकाम हुई है।

खुलने तक यह कुछ paint नहीं करता। कहीं से भी: `const { open } = useFeedback()`.

## 5. Screenshot — pixel वाला नहीं, असली वाला

`html2canvas` / `modern-screenshot` DOM को **दोबारा बनाते** हैं, capture नहीं
करते। Devanagari पर, custom faces के साथ, इसका नतीजा यक़ीन दिलाने वाला पर **ग़लत**
सबूत होता है — जो किसी सबूत से बदतर है। और इसकी क़ीमत हर पाठक पर ~45 KB पड़ती,
उन ~2% के लिए जो report करते हैं।

इसकी जगह structured context snapshot है (§1). पाठक चाहे तो अपने picker से
**असली** screenshot लगा सकता है: हमेशा सच्चा, 0 KB. सीमा `MAX_SCREENSHOT_BYTES`.

## 6. Offline लिखी हुई report

`localStorage` में क़तार लगती है (`md.feedback_queue`, आख़िरी 20 rows) और network
लौटते ही ख़ुद चली जाती है।

`sendFeedback()` throw करने के बजाय `"queued"` लौटाता है — क्योंकि जहाँ पाठक खड़ा
है वहाँ से वह नाकामी नहीं है।

**एक चीज़ इंतज़ार में नहीं बचती: attachment.** 5 MB की image उस सबके साथ
`localStorage` में नहीं समाएगी जो app वहाँ पहले से रखती है — इसलिए क़तार में लगी
report उसके बिना जाती है, **और sheet पाठक को यह बता देती है।**

Row queue से तभी हटती है जब server के पास पहुँच जाए। असली दोहरी report BE अपने
आप मोड़ लेता है (वही row, 200 के साथ) — इसलिए दोबारा भेजना सुरक्षित है।

## 7. Errors की पाँच-गहरी याद

`src/lib/clientErrors.ts` एक ring buffer है, log नहीं। **पाँच entries वही हैं जो
एक triage screen पर समाती हैं**, और छठी सिर्फ़ काम की वाली को ऊपर से गिरा देती।

यह अपना अलग module इसलिए है कि दोनों fetch wrappers इसमें लिखते हैं और
`lib/feedback.ts` उनमें से एक से API base पढ़ता है — buffer किसी एक में डालने पर
दोनों एक-दूसरे को import करने लगते।

इसे feedback के अलावा कुछ नहीं पढ़ता।

## 8. Analytics

`feedback_open` और `feedback_submit`, दोनों `source` के साथ। reader-bar बनाम
account-menu का अनुपात ही बताएगा कि reader के अंदर वाला दरवाज़ा toolbar में जगह
लेने लायक़ है या नहीं।

## 9. जुड़े हुए फ़ैसले

- **सिर्फ़ signed-in.** जिस बात का जवाब नहीं दिया जा सकता उसका loop कभी बंद नहीं
  होता — और यहाँ spam के लायक़ अकेली चीज़ एक anonymous box ही होती।
- **Chat के thumbs अलग हैं.** `AnswerFeedback` जहाँ है वहीं रहता है। दोनों को एक
  inbox में लाना BE की सूची में है, बना नहीं है।
