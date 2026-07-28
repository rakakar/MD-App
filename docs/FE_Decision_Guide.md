# MDApp Frontend (FE) Decision Guide

**यह document क्यों:** हमारा Django + PostgreSQL backend (library, TTS, AV, welfare search, RBAC, tasks) testing के लिए तैयार है। अब public-facing frontend बनाना है। यह document FE developer के साथ discussion का baseline है — इसमें हमारी ज़रूरतें, technology के options (pros/cons के साथ), और recommendations लिखी हैं, ताकि हम सोच-समझकर long-term decision लें।

**Last updated:** 2026-07-27

---

## 1. हमारी ज़रूरतें (Requirements)

1. **Best book-reading experience** — MD original books (Hindi content, English UI) का premium reader।
2. **Optional sign-in** — बिना login के भी books पढ़ी जा सकें; login करने पर extra features मिलें।
3. **FE chat assistant** — (a) navigation में help, (b) paribhasha/books में word search, (c) future में audio/video content की search भी। साथ में traditional organized UI भी रहे — chat सिर्फ़ एक सहायक layer है।
4. **Audio** — books का TTS audio सुनना + embedded YouTube videos।
5. **Push notifications** — BE panel से compose/configure हों, users को FE पर मिलें।
6. **SEO + LLM visibility** — MD books Google search और future में LLM training (Anthropic, Google आदि) में visible हो सकें।
7. **User accounts** — signup/signin के लिए क्या वही Django + Postgres काफ़ी है?

**Guiding principle:** long-term सोचकर decision लेना है, सिर्फ़ जल्दी पूरा करने के लिए नहीं।

---

## 2. FE Framework का चुनाव

### सबसे decisive factor: SEO

Books को Google और LLM crawlers में दिखना है, इसलिए pages **server-rendered HTML** होने चाहिए। सिर्फ़ browser-side JavaScript app (plain React/Vue SPA) crawlers के लिए कमज़ोर होती है। इसलिए framework ऐसा चाहिए जो **SSR (Server-Side Rendering)** / **SSG (Static Site Generation)** दे।

### Options की तुलना

| Option | Language | SEO/SSR | Ecosystem | सीखने में | Verdict |
|---|---|---|---|---|---|
| **Next.js** | React/TypeScript | Excellent | सबसे बड़ा | Medium | ✅ **Recommended** |
| **Nuxt** | Vue/TypeScript | Excellent | अच्छा | React से आसान | Solid #2 |
| **SvelteKit** | Svelte | Excellent | छोटा | सबसे आसान | अच्छा, पर hiring/ecosystem risk |
| Plain React SPA (Vite) | React | ❌ Poor | बड़ा | Medium | SEO के कारण reject |
| Flutter Web | Dart | ❌ Very poor | — | — | Reject (canvas rendering, SEO नहीं) |

### Next.js क्यों (long-term reasoning)

- **SSR + SSG mixed** — book/chapter pages statically generate होंगे (fast + SEO-perfect); chat/profile जैसे dynamic हिस्से client-side रहेंगे।
- **React ecosystem सबसे बड़ा है** — audio players, chat UI, reader components सब ready-made मिलते हैं। FE developer की hiring/replacement भी सबसे आसान।
- **PWA support** — installable app, offline reading, push notifications — सब Next.js + service worker से हो जाता है, बिना अलग mobile app बनाए।
- **Future mobile app** — अगर कभी native app चाहिए, तो React का knowledge सीधे **React Native/Expo** में reuse होता है। यह long-term का सबसे बड़ा फ़ायदा है।

### FE dev के साथ discussion point

अगर FE dev का Vue में strong experience है तो **Nuxt भी पूरी तरह valid** है — SEO-wise बराबर है। Framework से ज़्यादा ज़रूरी दो बातें हैं: **SSR हो** और **TypeScript use हो**। दोनों options खुले हों तो Next.js चुनें।

### Architecture

```
[Next.js FE]  ←— REST API (docs/API_Contract_v1.md) —→  [Django BE + PostgreSQL]
     |                                                        |
  Coolify पर अलग service (same Hetzner VPS)              existing deployment
```

- Django सिर्फ़ **API backend** रहेगा — API contract already frozen है (`docs/API_Contract_v1.md`)।
- `feapp` (/app/) test-bed के रूप में रहेगा; production FE अलग Next.js project होगा।

---

## 3. Best Reading Experience — क्या-क्या चाहिए

हमारा API already chapter-unit/page-display, page navigation, prev/next support करता है। FE में ये features हों:

- **Typography** — Hindi के लिए **Noto Serif Devanagari** (self-hosted fonts)। Devanagari को Latin से ज़्यादा line-height चाहिए — इसका ध्यान रहे।
- **Reader controls** — font-size slider, light/dark/sepia themes, page-mode vs continuous-scroll toggle (`book_type` print/digital इसी पर map होगा)।
- **Resume position** — logged-in users का server पर saved; anonymous का browser localStorage में; login करने पर sync।
- **Prefetching** — अगला chapter background में load हो, ताकि page-turn instant लगे।
- **Offline (PWA)** — user एक book "download" करे, फिर बिना internet पढ़े — travel/कम network वाली जगहों में बहुत valuable।
- **Deep links** — हर chapter/page का अपना URL (जैसे `/books/slug/chapter-3/page-12`) — SEO और sharing दोनों के लिए ज़रूरी।

---

## 4. Chat Assistant — हमारा BE already ~70% ready है

हमारी `welfare/` library (embeddings + semantic search + ask) ही इसका engine है। FE पर सिर्फ़ chat widget चाहिए जो BE endpoints से बात करे।

### (a) Navigation help
- BE के LLM call को app का "route map" (सारे pages/features की list) system prompt में दें।
- Assistant जवाब के साथ एक action भेजे — जैसे `{"navigate": "/books/xyz"}` — FE उस पर "Take me there" button दिखाए।
- यह **tool-calling pattern** है — simple और reliable।

### (b) Paribhasha / book word search
- यह directly welfaresearch का existing semantic search है — chat सिर्फ़ उसका conversational wrapper है।
- Results में **source citation + exact page का link** दें — हमारा page-resolver API इसी के लिए perfect है।

### (c) Audio/video search (future)
- इसके लिए AV content के **transcripts** चाहिए होंगे (YouTube captions या Whisper-type transcription), फिर वही welfare embedding pipeline उन पर चलेगी।
- Architecture same रहेगा — सिर्फ़ नया content-type embed होगा। अभी build नहीं करना।
- **अभी सिर्फ़ यह करें:** chat के response format को ऐसा design करें कि result के साथ `type: text | audio | video` + timestamp आ सके — ताकि future में UI बदलना न पड़े।

### UX
- Floating chat button — traditional UI के ऊपर overlay; मुख्य navigation हमेशा traditional रहेगा।
- **Streaming responses (SSE — Server-Sent Events)** — जवाब type होता हुआ दिखे।
- Anonymous users के लिए rate-limit BE पर।

---

## 5. Audio — TTS + YouTube

- हमारा TTS v2 (ChapterAudio) multi-voice audio files already बनाता है।
- FE पर **persistent audio player** (bottom bar) — page बदलने पर भी चलता रहे।
- **Media Session API** use करें — इससे phone की lock screen पर play/pause/next controls आते हैं, बिल्कुल music app जैसा। यह web पर possible है — native app की ज़रूरत नहीं।
- Playback speed (0.75×–2×), sleep timer।
- **Follow-along** (audio के साथ text highlight) — future enhancement; इसके लिए TTS timestamps चाहिए होंगे।
- **YouTube** — official **YouTube IFrame Player API** से embed करें। यह compliant भी है और FE को play/pause events भी देता है। YouTube का audio download/extract करना TOS violation है — सिर्फ़ embed करना है।

---

## 6. Push Notifications — Web Push, Firebase की ज़रूरत नहीं

- **Web Push (VAPID protocol)** — browser-native, free, कोई third-party account नहीं चाहिए।
  - FE का service worker subscribe करता है → subscription tokens हमारे Postgres में save → Django से `pywebpush` library notifications भेजती है।
  - Android Chrome, desktop browsers सब पर काम करता है। **iOS Safari पर भी अब काम करता है**, पर user को पहले app को home screen पर "Add" करना पड़ता है।
- **BE side** — एक नया `notifications` Django app:
  - Compose UI हमारे panel में (RBAC के साथ — कौन भेज सकता है, control रहेगा)।
  - Segments — all users / logged-in / specific book readers।
  - Scheduling + delivery logs।
- अगर future में native mobile apps बनें, तब **FCM (Firebase Cloud Messaging)** add करना पड़ेगा — पर वह तब की बात है; अभी Web Push काफ़ी है।

---

## 7. SEO + LLM Training Visibility — honest answer

### SEO (यह पूरी तरह हमारे control में है)
- SSR pages + clean semantic HTML।
- **sitemap.xml** + **schema.org structured data** (`Book`, `Chapter`) + Hindi `lang` tags।
- Original Hindi content Google पर **कम competition** वाला space है — well-structured होने पर ranking realistic है।

### LLM training (यह सिर्फ़ partially हमारे control में है)
- LLM companies (Anthropic, Google, OpenAI) publicly crawlable web से data लेती हैं — mostly **Common Crawl** और अपने crawlers से (`ClaudeBot`, `Google-Extended`, `GPTBot`)।
- हम `robots.txt` में इन bots को **allow** करके consent signal दे सकते हैं — यह visibility की *possibility* बनाता है, **guarantee कोई नहीं** कि content training में include होगा।
- Practically सबसे ज़्यादा help करता है: content का **publicly accessible, server-rendered, stable URLs** पर होना और सालों तक online रहना।
- **Login-walled content कभी train नहीं होता** — इसलिए "without sign-in reading" का decision यहाँ भी सही है।
- ⚠️ **One-way door:** एक बार content crawl हो गया तो वापस नहीं आता। अगर MD books पर copyright/publication rights का कोई question है, तो crawlers को allow करने से पहले वह clear कर लें। Selective approach भी possible है — जैसे paribhasha/excerpts open, full books partial।
- Nearer-term realistic benefit: **AI search** (ChatGPT search, Perplexity, Google AI Overviews) में citations मिलना — यह training से पहले और ज़्यादा visible होगा।

---

## 8. User Accounts — हाँ, वही Django + Postgres

नया system बिल्कुल नहीं चाहिए। Django का auth system 20 साल से battle-tested है।

- **`django-allauth` (headless mode)** — email/password + **Google Sign-In** दोनों देता है, API-first FE के लिए।
- **External services (Firebase Auth, Auth0, Supabase) मत लें** — extra cost, vendor lock-in, और user data बाहर चला जाता है, जबकि Django यह सब free में करता है।
- **Session-cookie auth (httpOnly)** — JWT के बजाय recommend; same-domain setup में simpler और safer।
- **ज़रूरी architectural decision:** public readers को panel/RBAC users से **logically अलग** रखें:
  - same `User` table चलेगा, पर एक अलग **`ReaderProfile`** model बनाएँ — reading progress, bookmarks, push subscriptions, preferences।
  - Panel capabilities public users को कभी न मिलें — हमारा existing principle: *public users never see panel*।
- **Anonymous → logged-in upgrade path:**
  - बिना login सब कुछ पढ़ा जा सके।
  - Login सिर्फ़ तब prompt हो जब user bookmark / progress-sync / personalization चाहे।
  - localStorage का data login पर server से merge हो जाए।

---

## 9. एक-नज़र Summary (FE dev के लिए)

| Area | Decision |
|---|---|
| Framework | **Next.js + TypeScript**; Django सिर्फ़ API (existing contract); Coolify पर अलग service |
| Reader | SSG chapter pages, Noto Serif Devanagari, themes, resume, PWA offline, deep links |
| Chat | welfare BE के ऊपर SSE-streaming widget; navigation tool-calling; cited search results; AV search future में transcripts से |
| Audio | Persistent player + Media Session API; YouTube सिर्फ़ IFrame API से |
| Push | Web Push (VAPID) + Django `notifications` app; panel से compose |
| Auth | django-allauth (headless), Google + email, session cookies, अलग ReaderProfile |
| SEO/LLM | SSR + sitemap + schema.org; robots.txt में AI crawlers की policy एक conscious decision — rights clear करके लें |

---

## 10. ✅ Finalized decisions (2026-07-27, FE dev के साथ discussion के बाद)

| # | Question | Decision |
|---|---|---|
| 1 | Framework | **Next.js** (App Router + TypeScript) — final |
| 2 | Design system | **Custom design** — FE dev (UI/UX designer) खुद decide करेंगे। हमारा suggestion (optional): **Tailwind CSS** styling के लिए — custom design के साथ भी अच्छा जाता है और AI-assisted coding में सबसे productive है। Component library (जैसे shadcn/ui) लेना या न लेना पूरी तरह उनकी choice। |
| 3 | Hosting | **Vercel free account** — नीचे §10.1 की technical बातें ज़रूर पढ़ें |
| 4 | robots.txt | **AI crawlers allowed** — books open हैं, crawling agreed। FE में `robots.txt` explicit allow करे (`GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`) + `sitemap.xml` ज़रूर हो |
| 5 | Analytics | **Google Analytics 4** — साथ में consent banner ज़रूरी (GA cookies use करता है); EU-style consent mode simple रखें |

### 10.1 Vercel hosting — ज़रूरी technical implications

BE Hetzner पर है और FE Vercel पर होगा — यानी **दो अलग domains**। इसके दो असर हैं:

1. **Session-cookie auth cross-domain काम नहीं करता** अगर domains बिल्कुल अलग हों (जैसे `something.vercel.app` ↔ `mdbe.welfareinfo.net`)। **Solution: FE को custom domain पर रखें, same parent domain के अंदर** — जैसे FE = `welfareinfo.net` (या `www.welfareinfo.net`) और BE = `mdbe.welfareinfo.net`। तब cookie `Domain=.welfareinfo.net; SameSite=Lax` पर share हो जाती है। Vercel free plan में custom domain allowed है — यह ज़रूर करें।
2. **CORS** — BE (`django-cors-headers`) में FE का origin allow करना होगा + `CORS_ALLOW_CREDENTIALS = True` + Django `CSRF_TRUSTED_ORIGINS` में FE domain। यह एक छोटा BE task है — हमारी तरफ़ pending।

**Vercel free plan limits** (अभी काफ़ी हैं, बाद में देखेंगे): 100 GB bandwidth/माह, commercial use technically hobby plan पर restricted — traffic बढ़े तो या Pro plan या Coolify पर self-host (Next.js दोनों जगह same चलता है, lock-in नहीं)।

---

## 11. Environments (BE deployment)

| Environment | Base URL | Notes |
|---|---|---|
| **Production BE** | `https://mdbe.welfareinfo.net` | API root: `https://mdbe.welfareinfo.net/api/v1/` · Swagger: `https://mdbe.welfareinfo.net/api/v1/docs/` |
| Production FE | *(tbd — custom domain, §10.1)* | Vercel |

FE में base URL **hardcode न करें** — environment variable (`NEXT_PUBLIC_API_BASE_URL`) में रखें, ताकि BE URL बदलने पर सिर्फ़ Vercel dashboard में एक value बदलनी पड़े।

---

## 12. अगला step — FE PRD (FE dev अपने AI के साथ बनाएँ)

FE dev को दिए गए inputs: यह document + `API_Contract_v1.md`। PRD बनाते समय यह structure recommend है:

1. **Scope v1 (सिर्फ़ जो अभी live BE में है)** — reader (§3), AV browsing (contract §9 की live endpoints), keyword search, sign-in + notes/bookmarks/progress (`/api/v1/me/`)। **Chat assistant और push v1 के scope में नहीं** — BE endpoints अभी बने नहीं हैं (contract §9 में "not yet built"); PRD में इन्हें "v2 — UI placeholder only" रखें।
2. **Page/route map** — हर screen की list URL के साथ (home, book list, book TOC, chapter reader, page deep-link, AV pages, search, profile)। Contract §4 के URL conventions follow करें।
3. **हर screen का spec** — किस endpoint से data, loading/empty/error states, anonymous vs signed-in में क्या फ़र्क़।
4. **Reader spec सबसे detail में** — §3 की सारी बातें (typography, themes, resume, prefetch, offline, audio player + `para_timings` highlight)।
5. **Non-functional** — SEO (SSG/ISR, sitemap, schema.org), performance budget (chapter first-paint), PWA, GA4 events की list (कौन-कौन से actions track होंगे)।
6. **Out of scope v1** — chat, push, AV transcript search — explicitly लिखें ताकि scope creep न हो।

PRD draft बनने पर हमें review के लिए भेजें — हम BE feasibility के हिसाब से check कर देंगे।
