# MD Study के दस्तावेज़ (FE)

यह reader app का repo है। यहाँ सिर्फ़ वही रहता है जो **app के अपने बारे में** है
— content कैसे अंदर आता है, roles, panel, deployment, यह सब backend repo
(`../MDApp`) में है।

---

## किस काम के लिए क्या

| आपको यह करना है | यह पढ़िए |
|---|---|
| पढ़ने वाले हिस्से को छूना है | **[reader.md](reader.md)** — दो readers, display system, offline. यही product है |
| कोई भी रंग, radius, shadow या साझा component छूना है | **[design-system.md](design-system.md)** — **पहले**, और `/design` खोलकर |
| Shelf, folder या find-bar पर काम है | [library.md](library.md) |
| कोई payload चाहिए | [API_Contract_v1.md](API_Contract_v1.md) — §13 library |
| Connect के Events पर काम है | [Events_API_v1.md](Events_API_v1.md) — **यही authority है** |
| Feedback वाला हिस्सा | [feedback.md](feedback.md) |
| Notifications वाला हिस्सा | [push-notifications.md](push-notifications.md) |
| APK या iOS build बनानी है | [mobile-apps.md](mobile-apps.md) |
| Product का इरादा जानना है | [PRD_v2.md](PRD_v2.md) — banners ज़रूर पढ़ें |
| Code लिखने जा रहे हैं | `../AGENTS.md` — **पहले** |

## आठ फ़ाइलें, एक-एक पंक्ति में

**[API_Contract_v1.md](API_Contract_v1.md)** — हर payload पर authority.
यह **BE की copy है** (`MDApp/docs/api/API_Contract_v1.md`). यहाँ कभी edit मत
कीजिए — वहाँ बदलिए और दोबारा copy कीजिए। जाँचने के लिए:

```bash
diff "MDApp/docs/api/API_Contract_v1.md" "MD-App-FE/docs/API_Contract_v1.md"
```

**[Events_API_v1.md](Events_API_v1.md)** — Connect → Events का पूरा contract.
यह भी **BE की copy है** (`MDApp/docs/api/Events_API_v1.md`) — यहाँ कभी edit मत
कीजिए। इसका §0 पूरे module को आकार देता है: **bucket, badge, prabodhak की
"Multiple" पंक्ति, card की location, category का रंग — सब server से बना-बनाया
आता है, FE इनमें से कुछ भी दोबारा compute नहीं करता।** §5 बताता है कि Centres
और Links अभी बने ही नहीं।

**[design-system.md](design-system.md)** — designer की 11 अगस्त 2026 वाली finished
Originals screens से बना token layer और साझा components, comps से किए गए हर
deviation की वजह, और "दोबारा न बहकने" के सात नियम। दिखने वाला रूप
**`/design`** पर है (सिर्फ़ development में; production में 404)।

**[reader.md](reader.md)** — book reader और PDF reader, दोनों पूरी viewport क्यों
लेते हैं, chrome ख़ुद क्यों हटता है, display system के दो axes (app की theme और
किताब का काग़ज़ — दोनों अलग), offline text बनाम offline audio, और **highlights**
— एक highlight असल में क्या है, spans offsets पर क्यों नहीं टिके, और store में
पड़ा highlight पन्ने पर न दिखने वाला bug दो बार क्यों लौटा (§6).

**[library.md](library.md)** — `/library/[id]` हर गहराई पर एक ही component क्यों
है, URLs workspace-neutral क्यों हैं, browse और find के बीच का एक-test वाला
switch, sieve की chips का क्रम, और यह search कहाँ जाकर रुक जाती है।

**[feedback.md](feedback.md)** — चार दरवाज़े, context में क्या जाता है और क्या
कभी नहीं, offline queue, और pixel-screenshot क्यों नहीं है।

**[push-notifications.md](push-notifications.md)** — FCM setup, दो service
workers दो scopes में क्यों हैं, और iOS की सीमा।

**[mobile-apps.md](mobile-apps.md)** — Android और iOS apps इसी codebase से कैसे
बनती हैं, native shell app को bundle करने के बजाय deployment से load क्यों करता
है, दोनों platforms के exact commands, और store पर जाने से पहले क्या-क्या बाक़ी है।

**[PRD_v2.md](PRD_v2.md)** — 27 जुलाई 2026 का product spec. **इसका
non-book वाला पूरा हिस्सा superseded है** — ऊपर का banner पढ़िए। पाँच-workspace
model, reader, search की दो lanes, personal features, PWA, analytics और type/रंग
के फ़ैसले अब भी खड़े हैं।

## दूसरे repo में

| चाहिए | कहाँ |
|---|---|
| Content कैसे अंदर आता है | `MDApp/docs/manuals/library_manager_manual.md` — §9 हर panel action को पाठक की screen से जोड़ता है |
| Book कैसे जुड़ती है | `MDApp/docs/manuals/how-to-add-a-book.md` |
| Non-book content का model | `MDApp/docs/product/Content_Model_v3.md` |
| तीन searches का फ़र्क़ | `MDApp/docs/product/Catalogue_Search.md` |
| पूरा docs index | `MDApp/docs/README.md` |

## जब ये दस्तावेज़ बहक जाएँ

BE repo का **`docs/dev/doc_audit.md`** चलाइए। वह दोनों repos पर लागू होता है,
और उसका rule 5 इसीलिए है कि पिछली बार की सबसे बुरी ख़ामी **उसी session में लिखी
गई फ़ाइल में गढ़ा हुआ एक route** था।
