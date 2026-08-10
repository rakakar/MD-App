# Android और iOS apps — एक ही codebase से

यह वही Next.js app है। Play Store के लिए `.aab`, App Store के लिए `.ipa`, और
वेब — तीनों इसी repo से निकलते हैं, और **web app की एक भी line इसके लिए नहीं
बदली**।

यह फ़ाइल पहले वह फ़ैसला बताती है जिस पर सब टिका है, फिर मशीन का एक-बार वाला
setup, फिर Android और Apple के अपने-अपने अध्याय।

---

## 1. यह कैसे काम करता है

`android/` और `ios/` में जो native apps हैं, वे **app को bundle नहीं करतीं** —
वे उसे network से load करती हैं, उसी deployment से जो browser खोलता है।

```
capacitor.config.ts → server.url = https://md-app-liart.vercel.app
                             ↓
        android/  (WebView)        ios/  (WKWebView)
```

### Bundle क्यों नहीं करते

Bundle करने का मतलब होता `output: "export"`, और यह app export हो ही नहीं सकती।
Next 16 जिन features को static export में unsupported बताता है, उनमें से चार
यहाँ इस्तेमाल हो रहे हैं:

| Unsupported | कहाँ |
|---|---|
| ISR / `revalidate` | चौदह route files — `layout.tsx`, `page.tsx`, पूरी library/books tree |
| `dynamicParams: true` | `library/[id]`, `books/[code]`, दोनों readers |
| `redirects()` | `next.config.ts` — पुराने `/audio`, `/videos` slots |
| Server Components से live BE fetch | पूरी tree Django BE से server-side पढ़ती है |

Export करने का मतलब होता पूरी tree को client-side fetching पर ले जाना, और web
app को धीमा व SEO-blind बनाना — सिर्फ़ इसलिए कि एक store build बन सके। वह सौदा
जान-बूझकर नहीं लिया गया।

### इसकी क़ीमत, और वह क्यों चुकाई जा सकती है

Cold start के लिए network चाहिए। `public/sw.js` यह पहले से सँभालता है — shell,
offline page और downloaded chapter audio cache में हैं। WKWebView remote https
origin पर service workers चलाता है, इसलिए iOS को भी वही offline reading मिलती
है जो Android को।

Auth बिना छेड़े पार हो जाता है: `src/lib/me.ts` session को cookie के बजाय
`X-Session-Token` header में localStorage से भेजता है, तो third-party-cookie के
वे सारे नियम यहाँ लागू ही नहीं होते। BE इस origin को CORS में allow करता है,
`x-session-token` header समेत — जाँचने के लिए:

```bash
curl -s -i -X OPTIONS "https://mdbe.welfareinfo.net/api/v1/me/" -H "Origin: https://md-app-liart.vercel.app" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: x-session-token" | grep -i "access-control-allow"
```

### इसका सबसे बड़ा फ़ायदा

**Vercel पर deploy करते ही बदलाव फ़ोन पर पहुँच जाता है।** App दोबारा बनाने और
store में भेजने की ज़रूरत सिर्फ़ तब है जब **native** चीज़ बदले — icon, splash,
plugin, permission, या `capacitor.config.ts`. Content, layout, routes, styling —
इनमें से कुछ भी store review से नहीं गुज़रता।

### Repo में क्या है

| | |
|---|---|
| `capacitor.config.ts` | अकेला फ़ैसला-वाला file — appId, appName, `server.url` |
| `android/` | Gradle project. Capacitor generated, पर **commit होता है** — इसमें हमारे अपने बदलाव हैं |
| `ios/` | Xcode project, वही बात |
| `assets/` | `icon.png` और `splash*.png` — जिनसे दोनों platforms के सारे sizes बनते हैं |

Capacitor 8.5.0, plugins: `@capacitor/app` (Android back button के लिए — नीचे
देखें)।

---

## 2. मशीन का setup — एक बार

Node तो पहले से है। बाक़ी platform-दर-platform:

### Android के लिए (~4 GB)

```bash
brew install openjdk@21 && brew install --cask android-commandlinetools
```

JDK 21 चाहिए — 26 नहीं। Android Gradle Plugin नए JDKs पर नहीं चलता।

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

ये चार लाइनें `~/.zshrc` में डाल दीजिए, वरना हर नए terminal में दोहरानी पड़ेंगी।

SDK components (licenses accept होंगी — Google की terms हैं):

```bash
yes | /opt/homebrew/share/android-commandlinetools/cmdline-tools/latest/bin/sdkmanager --sdk_root="$HOME/Library/Android/sdk" --licenses
```

```bash
/opt/homebrew/share/android-commandlinetools/cmdline-tools/latest/bin/sdkmanager --sdk_root="$HOME/Library/Android/sdk" "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

> **एक फँसाने वाली बात.** Homebrew, cmdline-tools को `/opt/homebrew/share/` में
> रखता है, SDK के अंदर नहीं। `sdkmanager` को इससे फ़र्क़ नहीं पड़ता, पर
> `avdmanager` अपना SDK root अपनी ही जगह से निकालता है और फिर कहता है
> *"Package path is not valid… null"* — जबकि package installed होता है। ठीक
> करने के लिए उसे SDK के अंदर **copy** कीजिए (symlink से नहीं होगा — वह वापस
> असली path पर resolve हो जाता है):
>
> ```bash
> mkdir -p "$HOME/Library/Android/sdk/cmdline-tools" && cp -R /opt/homebrew/share/android-commandlinetools/cmdline-tools/latest "$HOME/Library/Android/sdk/cmdline-tools/latest"
> ```

### Apple के लिए (~40 GB)

Xcode, Mac App Store से। Command Line Tools काफ़ी नहीं हैं। यह असली बाधा है —
जगह देखकर ही शुरू कीजिए:

```bash
df -h /
```

---

# अध्याय — Android

## APK बनाना

```bash
npx cap sync android
```

```bash
cd android && ./gradlew assembleDebug
```

APK यहाँ मिलेगी — लगभग 4.3 MB:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

`cap sync` तब ज़रूरी है जब `capacitor.config.ts` बदली हो या कोई plugin जुड़ा हो।
सिर्फ़ APK दोबारा चाहिए तो अकेला `gradlew` काफ़ी है।

## Server URL बदलना

Config छूने की ज़रूरत नहीं — env var काफ़ी है:

```bash
CAP_SERVER_URL=https://naya-domain.net npx cap sync android
```

अपनी मशीन के dev server पर test करने के लिए **LAN address** चाहिए, `localhost`
नहीं — फ़ोन पर `localhost` का मतलब ख़ुद फ़ोन है:

```bash
ipconfig getifaddr en0
```

```bash
CAP_SERVER_URL=http://192.168.31.82:3000 npx cap sync android
```

http इसलिए चलता है कि `android/app/src/debug/AndroidManifest.xml` में
`usesCleartextTraffic` है। वह जान-बूझकर `debug` source set में है — release
build सिर्फ़ `main` merge करता है, इसलिए store वाली build में यह छेद जा ही नहीं
सकता, भले ही config में http URL छूट जाए।

**ऐसी build किसी को मत भेजिए।** वह आपके dev server से बँधी है: server बंद, या
फ़ोन दूसरे wifi पर — और app `ERR_CONNECTION_REFUSED` दिखाएगी।

## फ़ोन पर install

APK फ़ोन तक पहुँचाइए (AirDrop, WhatsApp, USB), खोलिए, "unknown sources" allow
कीजिए। Package एक ही है (`net.welfareinfo.mdstudy`), इसलिए पुरानी build के ऊपर
सीधे install हो जाती है।

## Emulator पर verify करना

फ़ोन के बिना जाँचने के लिए। एक बार:

```bash
/opt/homebrew/share/android-commandlinetools/cmdline-tools/latest/bin/sdkmanager --sdk_root="$HOME/Library/Android/sdk" "emulator" "system-images;android-36;google_apis;arm64-v8a"
```

```bash
"$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager" create avd -n md_test -k "system-images;android-36;google_apis;arm64-v8a"
```

`-d pixel_7` जैसा device profile मत दीजिए — यह setup उस पर
*"Could not load devices from … devices.xml"* देता है। बिना profile के default
1080×2400 मिलता है, जो काफ़ी है।

फिर हर बार:

```bash
emulator -avd md_test -no-window -no-audio -gpu swiftshader_indirect &
```

```bash
adb wait-for-device && adb install -r android/app/build/outputs/apk/debug/app-debug.apk && adb shell am start -n net.welfareinfo.mdstudy/.MainActivity
```

देखने और जाँचने के लिए:

```bash
adb exec-out screencap -p > /tmp/screen.png
```

```bash
adb logcat -d | grep -E "Capacitor: Loading|Capacitor/Console|ERR_"
```

`Capacitor: Loading app at …` वाली line बताती है कि build किस URL से बँधी है —
सबसे पहले यही देखिए। बंद करने के लिए `adb emu kill`.

## Push notifications

Shell web push नहीं कर सकती (WebView में Push API होती ही नहीं), इसलिए वह
`@capacitor/push-notifications` से चलती है। Backend में कुछ नहीं बदलता — token
उसी `/api/push/register/` पर जाता है, बस `platform: "android"` के साथ।

**अब कुछ हाथ से डालना नहीं है।** `android/app/google-services.json` repo में है
(Firebase project `mdapp-push`, Android app `net.welfareinfo.mdstudy`, वही
project जिससे web push जाती है — इसलिए दोनों तरह के tokens एक ही panel से
address होते हैं)। वह secret नहीं है: वही file हर installed APK के अंदर पड़ी
होती है, और भेजने का अधिकार सिर्फ़ backend वाले service-account JSON के पास है।

नया clone बस यह चलाए:

```bash
npx cap sync android && cd android && ./gradlew assembleDebug
```

अगर कभी वह file हटी, तो `android/app/build.gradle` google-services plugin लगाना
छोड़ देता है — build तब भी **पास** हो जाती है और ग़लती सिर्फ़ device पर दिखती है:
Enable दबाने के 20 सेकंड बाद "FCM did not return a device token"। इस feature की
सबसे आम ख़राबी यही है, और यही वजह है कि उस timeout का message उस file का नाम लेता
है।

Firebase Console में यह app दोबारा बनानी पड़े तो: Project settings → *Your apps*
→ **Add app → Android** → package ठीक `net.welfareinfo.mdstudy`.

Web app की पाँच `NEXT_PUBLIC_FIREBASE_*` env vars shell के लिए ज़रूरी **नहीं**
हैं — app अपनी पहचान `google-services.json` से लेती है। वे सिर्फ़ browser वाले
readers के लिए हैं।

### जाँचना

```bash
adb logcat -c && adb logcat | grep -iE "PushNotifications|FirebaseApp|Capacitor/Console"
```

App → Settings → Enable notifications → Android 13+ पर permission dialog आना
चाहिए → फिर panel (`/panel/notifications/`) की Audience count एक बढ़ जाएगी।

App खुली हो तब notification tray में नहीं आती — Android उसे दबा देता है — वह
in-app toast बनकर आती है (`PushProvider`)। यह bug नहीं है; tray वाली शक़्ल देखने
के लिए app को background में कीजिए।

**यह पूरा रास्ता emulator पर चलकर देखा गया है** (android-36, `google_apis`
image — Play Store वाली image ज़रूरी नहीं, FCM को सिर्फ़ Play Services चाहिए):
permission dialog → FCM token → prod पर register (`platform: "android"`) →
foreground toast → tray notification → tap से reader खुलना, सब।

पूरी audience को test message भेजने की ज़रूरत नहीं — और भेजना नहीं चाहिए, वह
असली लोगों की lock screens पर जाता है। एक ही token को भेजिए:

```python
# uv run python — MDApp (backend) repo से
import firebase_admin
from firebase_admin import credentials, messaging
app = firebase_admin.initialize_app(credentials.Certificate("<service-account.json>"), name="one-off")
messaging.send(messaging.Message(
    token="<device token from logcat>",
    notification=messaging.Notification(title="Test", body="Tap me."),
    data={"click_url": "/books/ADVD/0#p-i-1", "title": "Test", "body": "Tap me.", "image_url": ""},
), app=app)
```

`data` की keys वही रखिए जो `apps/notifications/services.py` भेजता है — app उन्हीं
को पढ़ती है, `notification` block को नहीं।

## Play Store के लिए release build

यह अभी तक **किसी ने चलाया नहीं है** — नीचे का हिस्सा standard Android है, इस
project पर आज़माया हुआ नहीं। Play `.aab` माँगता है, APK नहीं।

Keystore बनाइए (एक बार, और इसे कभी मत खोइए — यही app की पहचान है; खो गया तो
वही app दोबारा update नहीं हो सकती):

```bash
keytool -genkey -v -keystore ~/md-study-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias md-study
```

फिर `android/app/build.gradle` में `signingConfigs` जोड़कर:

```bash
cd android && ./gradlew bundleRelease
```

Keystore और उसके passwords **repo में कभी नहीं** जाते।

Play Console: $25, एक बार। Webview-आधारित apps के साथ Play उदार है।

## Android पर जो जानना ज़रूरी है

**Back button — `@capacitor/app` हटाइएगा मत.** Capacitor 8 के core में back
handling है ही नहीं; वह इसी plugin से आती है। इसके बिना reader में back दबाने पर
app **बंद** हो जाती है, book page पर लौटने के बजाय। एक reading app में यह सबसे
ज़्यादा इस्तेमाल होने वाले gesture की सबसे बुरी binding है। (targetSdk 36 पर
predictive back का manifest opt-out आज़माया गया था — उससे नहीं बना; असली fix यही
plugin है, इसलिए manifest साफ़ है।)

**Edge-to-edge के लिए कोई setting नहीं है.** Android 15+ इसे ख़ुद लागू करता है
और web layer पहले से पूरी height लेता है। `capacitor.config.ts` में `android`
block जान-बूझकर नहीं है — पहले वहाँ `adjustMarginsForEdgeToEdge` लिखा गया था, जो
Capacitor 8 में मौजूद ही नहीं (runtime चुपचाप ignore करता है, TypeScript पकड़ता
है)।

**Web push shell में काम नहीं करती — native push जुड़ चुकी है.** Android WebView
में `PushManager` और `Notification` दोनों नहीं होतीं, इसलिए `isPushSupported()`
वहाँ false थी और notifications वाली पूरी row चुपचाप ग़ायब रहती थी — न button, न
prompt, न कोई वजह। अब shell `@capacitor/push-notifications` से चलती है
(`src/lib/push-native.ts`), और वही token उसी `/api/push/register/` पर
`platform: "android"` के साथ जाता है। पूरी बात नीचे "Push notifications" में।

---

# अध्याय — Apple

## स्थिति

`ios/` project पूरा तैयार है — Xcode project, Swift Package setup (Capacitor 8
में CocoaPods नहीं), icons, और light/dark splash. **बस build नहीं हुई है**,
क्योंकि जिस मशीन पर यह सब बना उसमें Xcode के लिए जगह नहीं थी। इस अध्याय में
setup वाला हिस्सा सच है और verified नहीं है, यह फ़र्क़ याद रखिए।

## Build करना

Xcode install करने के बाद:

```bash
npx cap sync ios
```

```bash
npx cap open ios
```

Xcode में Signing & Capabilities → अपनी team चुनिए → Run.

## अपने iPhone पर आज़माना — $99 के बिना

Xcode की **free personal team** से अपने ही device पर install हो जाता है, 7 दिन के
लिए। USB से फ़ोन जोड़िए, Xcode में उसे चुनिए, Run. Store के लिए ही $99/साल वाला
Apple Developer Program चाहिए।

## App Store के लिए

Xcode → Product → Archive → Distribute App. यही `.ipa` बनाता और upload करता है।

## Apple पर जो जानना ज़रूरी है

**Guideline 4.2 सबसे बड़ी बाधा है.** सिर्फ़ website को webview में लपेटा हुआ app
Apple reject करता है। बचाव यह है कि app में असली native value हो — और इस project
में वे तीन चीज़ें स्वाभाविक रूप से मौजूद हैं:

1. **Native push** — जुड़ चुकी है; iOS पर सिर्फ़ APNs key बाक़ी है
2. **Offline downloaded books** — `public/sw.js` पहले से करता है
3. **Background audio** — device TTS screen lock के बाद नहीं टिकता; native
   audio session टिकेगा

ये cosmetic additions नहीं हैं — **यही approval की दलील हैं**। Submit करने से
पहले कम से कम एक native रूप में मौजूद होनी चाहिए।

**ATS और local network.** `ios/App/App/Info.plist` में `NSAllowsLocalNetworking`
है, `NSAllowsArbitraryLoads` नहीं। पहला सिर्फ़ local addresses खोलता है; दूसरा
पूरा internet खोल देता है और App Review में उसका औचित्य देना पड़ता है। जब app
सिर्फ़ deployed https origin पर जाए, तो ये keys हटाई जा सकती हैं।

**`ios.contentInset` शायद बदलनी पड़ेगी.** App अपनी जगह `env(safe-area-inset-*)`
से बनाती है, और WKWebView अपने insets उसके ऊपर जोड़ सकता है — दोहरा padding। यह
`capacitor.config.ts` में जान-बूझकर default पर छोड़ा गया है, क्योंकि iOS पर कुछ
चला ही नहीं है। जब देख सकें तब तय कीजिए; बिना जाँचे value और उसके बग़ल में
आत्मविश्वास से लिखा comment — default से बुरा है।

---

## Icons और splash

दोनों platforms के सारे sizes `assets/` की दो files से बनते हैं। बदलनी हों तो
`assets/icon.png` (1024×1024) और `assets/splash*.png` बदलकर:

```bash
npx @capacitor/assets generate --iconBackgroundColor '#fdfbf8' --iconBackgroundColorDark '#14110f' --splashBackgroundColor '#fdfbf8' --splashBackgroundColorDark '#14110f'
```

रंग `src/app/globals.css` के `--color-surface` से आते हैं — light और dark।

> **चलाने के बाद दो चीज़ें हटाइए.** यह tool बिन माँगे `public/manifest.webmanifest`
> और `icons/` भी बना देता है। पहली वाली **`src/app/manifest.ts` को shadow कर
> देती है** — `public/` की static file उस route को हरा देती है, और PWA का
> manifest चुपचाप वह पुराना हो जाता है जो tool ने लिखा।
>
> ```bash
> rm -f public/manifest.webmanifest && rm -rf icons
> ```

---

## जब कुछ टूटे

| दिखता क्या है | असल में |
|---|---|
| `ERR_CONNECTION_REFUSED` | Build dev server से बँधी है, और वह चल नहीं रहा। `adb logcat \| grep "Capacitor: Loading"` से URL देखिए, फिर `CAP_SERVER_URL` के साथ दोबारा sync |
| Reader से back पर app बंद | `@capacitor/app` गायब है |
| `Package path is not valid… null` | cmdline-tools SDK root के अंदर नहीं हैं — §2 का box |
| `Unable to locate a Java Runtime` | `JAVA_HOME` set नहीं है |
| `adjustMarginsForEdgeToEdge does not exist` | Capacitor 7 की property 8 में नहीं है — हटा दीजिए |
| PWA का manifest पुराना अटका है | `public/manifest.webmanifest` पड़ा है, ऊपर वाला box |

---

## जो अभी नहीं हुआ

- **iOS पर कुछ भी चलाया नहीं गया** — Xcode ही नहीं था
- **Release signing / `.aab`** — keystore नहीं बना, `bundleRelease` नहीं चला
- **iOS push** — code साझा है और चलेगा, पर उसके लिए Firebase में APNs key
  चढ़ानी होगी और iOS पर अभी कुछ भी build नहीं हुआ
- **Background audio** — native audio session नहीं है, और Apple के सामने यही
  सबसे मज़बूत दलील होती
