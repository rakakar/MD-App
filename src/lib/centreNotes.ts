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
  | { kind: "strong"; text: string }
  /** a section heading inside the note — set in the display serif */
  | { kind: "h"; text: string }
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
 * **The one thing here that is not written down: where "here" goes.**
 *
 * Both notes point at a caution note published elsewhere — "which can be read
 * here", "जिसे आप यहाँ पढ़ सकते हैं" — and the address for it has not been
 * given. Until it is, `{{here}}` renders as plain text rather than as a link,
 * because a link that goes nowhere is worse on this screen than a sentence that
 * merely mentions a document: this is the page telling a reader why a centre
 * was removed, and a dead link there reads as the app hiding the evidence.
 *
 * Set this and both notes light up; nothing else has to change.
 */
export const CAUTION_NOTE_URL: string | null = null;

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
