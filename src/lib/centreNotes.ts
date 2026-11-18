/**
 * The two standing notes on the Centres screen (comps 6B and 6C).
 *
 * **Editorial content, not data.** `Connect_Directory_v1` carries `centres/`,
 * `contacts/` and `links/` and nothing else; there is no notes endpoint and §6
 * does not plan one. So these live here, versioned with the screens that draw
 * them — the same arrangement `lib/journey.ts` makes for the study path, and
 * for the same reason: the day a manager needs to edit this without a deploy,
 * this file is the shape the endpoint should return.
 *
 * They are not decoration. One of them names a centre that has been removed
 * from the recommended list and says why, which is the single most consequential
 * sentence in this workspace — a reader deciding where to travel to study. It
 * is why both are a screen of their own rather than a paragraph folded into the
 * list, and why the cards that open them sit above the contacts banner rather
 * than under it.
 */

export type NoteTone = "caution" | "info";

export type NoteBlock =
  | { kind: "p"; text: string; lang?: "hi" }
  | { kind: "strong"; text: string; lang?: "hi" }
  /**
   * a section heading inside the note — set in the display serif. `id` makes
   * it a place a link can land on.
   */
  | { kind: "h"; text: string; lang?: "hi"; id?: string }
  /** a bulleted list, or a numbered one when `ordered` */
  | { kind: "list"; items: string[]; ordered?: boolean; lang?: "hi" }
  /** the comps' "~" — a breath between two parts of an argument */
  | { kind: "rule" }
  /** the tinted box, in the note's own tone */
  | { kind: "callout"; text: string; sub?: string };

export interface CentreNote {
  slug: string;
  tone: NoteTone;
  /** the small caps label over the title */
  eyebrow: string;
  /** what the card on the Centres screen says */
  cardTitle: string;
  /** the note's own title, which may carry both scripts */
  title: string;
  blocks: NoteBlock[];
  /** the other note, offered at the foot as "Read next" */
  next?: string;
}

/**
 * Where "here" goes — "which can be read here", "जिसे आप यहाँ पढ़ सकते हैं".
 *
 * The caution note itself, which the students' group issued on 18 Aug 2020,
 * now sits at the foot of the caution page (added 18 Nov 2026 from the signed
 * PDF), so "here" is an anchor on the same page rather than an address
 * elsewhere. A `#…` value links in place; an `https:` one opens a new tab.
 */
export const CAUTION_NOTE_URL: string | null = "#caution-note";

export const CENTRE_NOTES: CentreNote[] = [
  {
    slug: "caution",
    tone: "caution",
    eyebrow: "Caution note",
    cardTitle: "MCVK, Indore, no longer ‘Madhyasth Darshan Center’",
    title: "MCVK Indore Caution Note | MCVK इंदौर सावधानी पत्रक",
    next: "basis",
    blocks: [
      {
        kind: "callout",
        text: "Manav Chetna Vikas Kendra (MCVK) Indore, is no longer a recommended location for the introduction to Jeevan Vidya or Madhyasth Darshan adhyayan.",
      },
      {
        kind: "p",
        text: "Rarely, an existing center may be omitted from the ‘recommended list’ since they are found to not be having some or all the needed characteristics (free of pardhan, parnaari-parpurush & parpeeda… towards other centers & co-students, respect for distance between men & women, etc).",
      },
      {
        kind: "p",
        text: "For instance, MCVK Indore मानव चेतना विकास केंद्र, इंदौर as of 17th August 2020 has been omitted from this list until further change due to straying away from these characteristics. An unfortunate series of misrepresentation, misinterpretation, etc have caused this.",
      },
      {
        kind: "p",
        text: "This is not unexpected in the evolution of any darshan, where practitioners tend to ‘mix’ their previous pravritti or tendencies with that given in the ‘darshan’. This can be ‘rectified’ by sticking to the ‘adhyayan-vidhi’ by Shri Nagaraj. A group of concerned students have furthered a caution note, which can be read {{here}}.",
      },
      {
        kind: "p",
        text: "Every person is free to pursue their path wherever they deem fit.",
      },
      { kind: "rule" },
      {
        kind: "p",
        lang: "hi",
        text: "कभी-कभार, कोई स्थान हमारे सुझाए गए स्थानों से लोपित किया जाता है, क्योंकि वहां के कार्य एक या अनेक आवश्यक नियमों का उल्लंघन किये हैं, अथवा वहां के कार्य स्थगित हो गए हों।",
      },
      {
        kind: "p",
        lang: "hi",
        text: "उदाहरण के रूप में MCVK इंदौर, १७ अगस्त २०२० से यहाँ से लोपित किया गया है, क्योंकि वे कुछ नियमों से भटक गए हैं। कुछ दुर्भाग्यपूर्ण मिथ्यावचन, अपविवेचन के कारण यह हुआ है।",
      },
      {
        kind: "p",
        lang: "hi",
        text: "किसी भी दर्शन के विकासक्रम में यह असामान्य नहीं है, क्योंकि प्रचलित प्रवृत्तियों एवं पूर्व मान्यताओं को ‘दर्शन’ के साथ मिला लेते हैं। इसका परिषोधन, नागराजजी द्वारा दिए अध्ययन विधि को मानने से हो सकता है। कुछ चिंतित विद्यार्थियों ने एक सावधानी पत्रक प्रकाशित किया है, जिसे आप {{here}} पढ़ सकते हैं।",
      },
      {
        kind: "p",
        lang: "hi",
        text: "प्रत्येक व्यक्ति, जहाँ उचित समझे, वहाँ अपने मार्ग का अनुसरण करने के लिए स्वतंत्र है।",
      },
      { kind: "rule" },
      // The note "here" points to: the students' caution note of 18 Aug 2020,
      // as signed. Wording kept as written; only the "|" dandas are set as "।".
      { kind: "h", lang: "hi", id: "caution-note", text: "सावधानी पत्रक — सामान्य जानकारी" },
      { kind: "p", lang: "hi", text: "दिनांक: 18 अगस्त २०२०" },
      { kind: "strong", lang: "hi", text: "इस लेख का सन्दर्भ, भूमिका" },
      {
        kind: "list",
        lang: "hi",
        items: [
          "MCVK इंदौर में पिछले एक-दो वर्ष में हुए घटनाओं को लेकर कुछ १५-२० मित्रों से पिछले २ माह से whats-app पर वार्तालाप हुई।",
          "इसमें एक मत हमारे सामूहिक प्रचार-प्रसार में MCVK से दूरी बनाना आया।",
          "कुछ मित्र MCVK के व्यवस्थापकों के साथ संवाद स्थापित किये हैं।",
          "कुछ मित्रों को इसके सन्दर्भ में अपना मत स्पष्ट करने की आवश्यकता प्रतीत हुई, इसीलिए यह नोट जारी किया जा रहा है।",
        ],
      },
      { kind: "p", lang: "hi", text: "श्री ए. नागराजजी द्वारा प्रतिपादित ‘मध्यस्थ दर्शन सहअस्तित्ववाद’ मानव के सभी आयामों का विकल्पात्मक समाधान प्रस्तुत करता है। इसके लोकव्यापीकरण हेतु परिचयात्मक ‘जीवन विद्या/अध्ययन-पठन शिविर’ देशभर में 25-30 वर्षों से चल रहे हैं।" },
      { kind: "p", lang: "hi", text: "अनेक वर्षों से इसे समझने, जीने में अभ्यास करने और इसके लोकव्यापीकरण करने हेतु कई प्रतिभाशाली, श्रमशील, शुभ चाहने वाले व्यक्ति, समूह अनेक जगह प्रयास करते आ रहे हैं। इनमें से एक स्थान ‘मानव चेतना विकास केंद्र’ पिवड़य, इंदौर (MCVK Indore) में सन २०१०-१२ से कार्यरत है। इसके संस्थापक हमारे मित्र हैं।" },
      { kind: "p", lang: "hi", text: "MCVK के द्रुत गति एवं सफलताओं को लेकर हम सभी आशान्वित एवं गौरावन्वित रहे हैं। वहां एक परिवार का अपने धन को शुभ कार्यों के लिए समर्पित करना, सामूहिक श्रमशीलता, सहभागिता, उत्पादन इत्यादि से हम सभी उत्साहित हुए। और अनेकों परिवारों द्वारा ऐसा आचरण एवं समर्पण देख कर हमारी आशा और बनी।" },
      { kind: "p", lang: "hi", text: "यह हमें अत्यंत खेदजनक लग रहा है कि पिछले एक-दो वर्षों में MCVK में कई घटनाएं चिंता का कारण बन गए। इसलिए ध्यानाकर्षण के लिये, इस कथन की आवश्यकता हुई।" },
      { kind: "strong", lang: "hi", text: "इस कथन का उद्देश्य:" },
      {
        kind: "list",
        lang: "hi",
        ordered: true,
        items: [
          "‘चुप रहना’ अनुमोदन लग रहा है। हमारे पास अन्य कोई विकल्प नहीं रहा, इसीलिए सामाजिक दायित्व के निर्वहन की आवश्यकता प्रतीत हुई है।",
          "जो मध्यस्थ दर्शन, जीवन विद्या को समझने में जुड़ना चाहते हैं, उन्हें अवगत करना आवश्यक लगा।",
        ],
      },
      { kind: "strong", lang: "hi", text: "यह हमारा उद्देश्य नहीं है:" },
      {
        kind: "list",
        lang: "hi",
        ordered: true,
        items: [
          "किसी व्यक्ति अथवा परिवार विशेष पर दोषारोपण करना।",
          "किसी व्यक्ति/स्थान की स्वतंत्रता पर आक्षेप करना, सुधारना।",
          "जीवन विद्या के लोकव्यापीकरण/ शुभ के रास्ते में विघ्न पैदा करना।",
        ],
      },
      { kind: "strong", lang: "hi", text: "हमारे अनुसार, MCVK में निम्न बिंदु मध्यस्थ दर्शन-सह अस्तित्ववाद के प्रतिपादन से मेल नहीं खाती हैं:" },
      {
        kind: "list",
        lang: "hi",
        ordered: true,
        items: [
          "प्रतिपादित अध्ययन विधि, एवं संस्था का लिखित अवधारणा।",
          "संस्कृति /उत्सव मनाने के विधि - विशेष रूप से ‘भावोत्सव’ का स्वरूप।",
          "सभ्यता - नर-नारियों में शिष्टाचार विधि (स्थानीय स्वीकृति के विपरीत होना)।",
          "सामूहिक धन का उपयोग विधि।",
          "दर्शन के अन्य स्थानों एवं अध्येयताओं को निम्न बताना।",
          "श्रद्धेय नागराजजी के साथ रहे समय, उनके आचरण के कुछ पक्ष जो हमें सुनने में आये है, वे असत्य उल्लेख हैं।",
        ],
      },
      { kind: "p", lang: "hi", text: "हमारा उपरोक्त को कहने का आधार MCVK में घटित घटनाएं हैं, जो कथित, लिखित, विडियो, ऑडियो, तथा वहां रहे अनेकों व्यकित, परिवारों के कथन पर आधारित हैं, उनमें से कुछ आज भी चर्चा, प्रसारण (पब्लिक डोमेन) में उपलब्ध हैं।" },
      { kind: "p", lang: "hi", text: "यह कथन प्रस्तुत करते हुए हमें अच्छा नहीं लग रहा है।" },
      { kind: "strong", lang: "hi", text: "जिम्मेदारी" },
      {
        kind: "list",
        lang: "hi",
        ordered: true,
        items: [
          "हम लोग अपने व्यक्तिगत अधिकार पर इस दस्तावेज को क्रियान्वित व जारी कर रहे हैं।",
          "यह किसी संस्था, ‘केन्द्रीय समिति’ इत्यादि के पक्ष से या किसी दुसरे के ओर से नहीं लिख रहे हैं। (नोट: जीवन विद्या में ‘केन्द्रीय समिति’ का कोई ढांचा नहीं है। प्रत्येक व्यक्ति, परिवार, परिवार समूह/संस्थान या मित्र समूह व्यवस्था के अपेक्षा/अर्थ में एक दुसरे के लिए, कोई सामूहिक-सार्वजानिक कार्यक्रम के लिए विधि-सहित पूरक होने प्रस्तुत होता है, अभ्यासरत है।)",
          "यह अधोउल्लेखित लोगों की सामूहिक जिम्मेदारी है। जो आपस में दो माह तक विचार-विमर्श और आपसी सहमति से तय हुई है।",
          "हम सभी पिछले १५-२०-२५ वर्षों से श्रद्धेय नागराजजी को निकट रूप से जाने हैं, हम में से कुछ उनके साथ जीए हैं, तथा मध्यस्थ दर्शन के अध्ययन, अभ्यास, अध्यापन में अग्रसर हैं।",
        ],
      },
      { kind: "p", lang: "hi", text: "हमारी कामना यही है कि शीघ्र ही MCVK पुन: मध्यस्थ दर्शन के अनुसार/अनुकूल हो जाए। इसके लिए कुछ आवर मित्र संवाद पूर्वक संलग्न हैं। इसके लिए हमारी जो भी भूमिका विधि विहित रूप से हो सकती है, हम करेंगे।" },
      { kind: "p", lang: "hi", text: "आगे शुभ के अपेक्षा के साथ," },
      {
        kind: "list",
        lang: "hi",
        ordered: true,
        items: [
          "सुरेन्द्र पाठक, अहमदाबाद",
          "सुनीता पाठक, अहमदाबाद",
          "राकेश गुप्ता, बैंगलोर",
          "प्रियंका गुप्ता, बैंगलोर",
          "श्रीराम नरसिम्हन, पुणे",
          "गौरी श्रीहरी, पुणे",
          "साधन भट्टाचार्य, किरितपुर",
          "बी आर अग्रवाल, रायपुर",
          "सुवर्णा शास्त्री, पुणे",
          "योगेश शास्त्री, अछोटी",
        ],
      },
    ],
  },
  {
    slug: "basis",
    tone: "info",
    eyebrow: "Important note",
    cardTitle: "Basis for listing a ‘recommended center’",
    title: "Basis for listing a ‘recommended center’",
    blocks: [
      {
        kind: "p",
        text: "Anyone that came in touch with (late) Shri A.Nagraj and/or Madhyasth Darshan literature is free to ‘teach’ or start a ‘center’ institution, etc using the Madhyasth Darshan tag. There is no ‘granting agency’ that permits or validates a center.",
      },
      {
        kind: "p",
        text: "The ‘centers’ or locations must ideally have certain characteristics in line with Madhyasth Darshan teachings.",
      },
      { kind: "h", text: "How ‘we’ Function" },
      {
        kind: "p",
        text: "Jeevan Vidya, Madhyasth Darshan does not have a ‘central committee’ of any kind and follows a broad, decentralized model that is mutually cooperative. Individuals/Families living at a location are responsible for their own decisions. They are not ‘monitored’ by any ‘outside group’. Individuals & Families from across the Country have taken up certain responsibilities of their own accord (such as website, sms, printing, distribution, sammelan, textbooks, research work, translations etc) & carry them out in consultation with other friends.",
      },
      {
        kind: "p",
        text: "Those that have been with this darshan since a long time periodically come together as various assemblies (सभा) & share their common concerns in various platforms/groups. The discussions/decisions in such ‘sabhas’ are reflections of the individual understanding (समझ), perspectives (दृष्टि) & discrimination (विवेक) of its participants.",
      },
      {
        kind: "p",
        text: "Members thus join the activities/groups they agree with or are interested in and this is how ‘things get done’.",
      },
      { kind: "rule" },
      {
        kind: "p",
        text: "The final proposed method of working is Family based Village Organisation (परिवार मूलक ग्राम स्वराज्य व्यवस्था) in which assembly-committees or ‘sabhas’ consist of awakened individuals (जागृत व्यक्ति). Till such time, each location/center functions based on its understanding & practice which are a reflection of its inhabitants, which are constantly evolving.",
      },
      {
        kind: "p",
        text: "People from these locations meet periodically to share their individual and collective progress at goshtis and the rashtriya sammelan (national confluence).",
      },
      { kind: "strong", text: "All this put together is ‘we’." },
      { kind: "rule" },
      { kind: "h", text: "Importance of “Stable Reference” for the student" },
      {
        kind: "p",
        text: "We recommend that the serious student keep the Original Works of Shri A.Nagraj as the reference baseline for their study. Any ‘center’ or location exists to only facilitate a student/aspirants study and provide a space for them to learn & practice.",
      },
      {
        kind: "p",
        text: "It thus becomes imperative to choose the ‘appropriate person & place’ to further one’s study.",
      },
      {
        kind: "callout",
        text: "An in-person survey of the locations below is highly recommended before one finalizes a place to pursue ones study or stay. It is important to keep in mind the Method of Study (अध्ययन विधि).",
        sub: "This is so until such time that a few of us do not become full realized (in developed consciousness) ourselves.",
      },
    ],
  },
];

export function centreNote(slug: string): CentreNote | null {
  return CENTRE_NOTES.find((n) => n.slug === slug) ?? null;
}
