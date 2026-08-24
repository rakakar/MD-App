/**
 * The study path, as the designer's 19A screens describe it.
 *
 * Nine stages in four levels, from the first seven-day camp to अनुभव. It is
 * **editorial content, not data** — the BE has no notion of a stage — so it
 * lives here, versioned with the screens that draw it. The day a manager needs
 * to edit it without a deploy, this file is the shape the endpoint should
 * return.
 *
 * Two rules from the comps that everything below is built to keep:
 *
 * 1. **No global progress.** No "3 of 9", no percentage, no streak. A stage is
 *    somewhere you say you are, never something the app scores you on.
 * 2. **Signals, not verdicts.** The path is opt-in, the durations say "unfolds
 *    over" rather than naming a deadline, and the source's own caveat — that
 *    this is one student's estimate — is quoted where the path is shown.
 */

import type { BookSummary } from "./types";

export type StageId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type LevelId = 1 | 2 | 3 | 4;

export interface Stage {
  id: StageId;
  level: LevelId;
  /** the stage's own name, as the source gives it */
  hi: string;
  /** the English gloss, where the source offers one */
  en?: string;
  /** what happens in it */
  note: string;
  /** how long it usually takes — never a deadline */
  duration: string;
  /**
   * The source's own flag on the stage. `optional` is अवलोकन's, and it is the
   * source's word rather than ours.
   */
  flag?: "optional";
  /**
   * Which shelf genres this stage's reading is drawn from — the join the BE
   * does not carry. `genre` is served on every book, so a stage names genres
   * and the books follow, which means a book added to `darshan` next month
   * turns up in stage 4 without anybody editing this file.
   *
   * `null` where the stage has no reading of its own: the camps that precede
   * the books, the years where the whole library is the material, and the
   * last three, which the app deliberately does not track at all.
   */
  genres: string[] | null;
}

export interface Level {
  id: LevelId;
  hi: string;
  en: string;
  stages: StageId[];
  duration: string;
}

export const LEVELS: Level[] = [
  {
    id: 1,
    hi: "प्राथमिक आधार",
    en: "Basic Foundation",
    stages: [1, 2, 3],
    duration: "unfolds over 2–3 years",
  },
  {
    id: 2,
    hi: "क्रमबद्ध अध्ययन",
    en: "Systematic Study (Shravan)",
    stages: [4, 5],
    duration: "unfolds over 5–11 years",
  },
  {
    id: 3,
    hi: "विधिवत अभ्यास",
    en: "Systematic Practice (Manan)",
    stages: [6],
    duration: "unfolds over 4–6 years, ongoing",
  },
  {
    id: 4,
    hi: "समझ — साक्षात्कार, बोध, अनुभव",
    en: "Understanding & Knowledge",
    stages: [7, 8, 9],
    duration: "no fixed duration",
  },
];

export const STAGES: Stage[] = [
  {
    id: 1,
    level: 1,
    hi: "परिचय शिविर",
    en: "Jeevan Vidya Parichay",
    note: "7-day camp — human purpose, family, society, nature. Suggested with more than one Prabodhak.",
    duration: "1–2 camps over 6 months to 1 year",
    // JVEP — जीवन विद्या एक परिचय — is this camp's reading, and ABVP the next
    // one's; both are filed `parichay`, so the stage takes the genre and
    // `stageBooks` orders them.
    genres: ["parichay"],
  },
  {
    id: 2,
    level: 1,
    hi: "अध्ययन बिंदु शिविर",
    en: "Adhyayan Bindu",
    note: "8–10 days. The 44-point booklet — coexistence, jeevan gyan, humane conduct, vivek and vigyan.",
    duration: "1–2 camps over 6–9 months",
    genres: ["parichay"],
  },
  {
    id: 3,
    level: 1,
    hi: "अवलोकन शिविर",
    en: "Avlokan",
    note: "12–15 days. Summary view of the whole literature and how to approach reading it.",
    duration: "about 6 months to 1 year",
    flag: "optional",
    // A survey of everything rather than a text of its own.
    genres: null,
  },
  {
    id: 4,
    level: 2,
    hi: "अध्ययन शिविर",
    en: "first reading of the books",
    note: "Systematic study of the core literature — darshan, vaad, shastra, Paribhasha Samhita, Manaviya Samvidhan.",
    duration: "part-time 2–3 years · full-time 6 months–3 years",
    genres: ["darshan", "vaad", "shastra"],
  },
  {
    id: 5,
    level: 2,
    hi: "श्रवण — अध्ययन-अभ्यास गोष्ठी",
    note: "Re-reading in small groups, testing one's own conclusions. Language synthesises into aphorism.",
    duration: "2–8 rounds over 4–8 years",
    // The same core literature, read again — so the same genres.
    genres: ["darshan", "vaad", "shastra"],
  },
  {
    id: 6,
    level: 3,
    hi: "मनन — मनन-अभ्यास गोष्ठी",
    note: "Understanding turns into inner and outer change. Needs the entire library — published and unpublished, all audio and video, sankalan and shodh patra.",
    duration: "many years · depends on sanskar and intensity of desire",
    // "The app stops suggesting and simply stays stocked."
    genres: null,
  },
  {
    id: 7,
    level: 4,
    hi: "अवधारणा",
    note: "Stability in nyaya-dharma-satya. Dependence on written words begins to fall away.",
    duration: "no fixed duration",
    genres: null,
  },
  {
    id: 8,
    level: 4,
    hi: "बोध / पूर्ण बोध",
    note: "Firmness in what has been realised. “पुस्तक छूट जाती है” — the book is left behind.",
    duration: "no fixed duration",
    genres: null,
  },
  {
    id: 9,
    level: 4,
    hi: "अनुभव",
    note: "Knowledge and conduct complete. May occur alongside purna bodh.",
    duration: "no fixed duration",
    genres: null,
  },
];

/** The source's own caveat, quoted wherever the path is drawn. */
export const PATH_CAVEAT =
  "“यह मेरे अब तक के व्यतिलगत अध्ययन यात्रा एवं सर्वेक्षण पर आधारित अनुमान मात्र है।”";

/**
 * The onboarding question's five answers.
 *
 * Each names a stage the reader is *in*, not one they have finished: someone
 * who has attended the parichay camp is standing in परिचय शिविर with its
 * reading still ahead of them, which is why "attended" and "just exploring"
 * land on the same stage. What separates them is not the app's business —
 * "this only decides what the app shows you first".
 */
export const ONBOARDING_OPTIONS: {
  value: string;
  hi: string;
  en: string;
  stage: StageId;
}[] = [
  { value: "exploring", hi: "अभी देख रहा हूँ", en: "Just exploring", stage: 1 },
  {
    value: "parichay",
    hi: "परिचय शिविर किया है",
    en: "Attended the 7-day parichay shivir",
    stage: 1,
  },
  {
    value: "bindu",
    hi: "अध्ययन बिंदु किया है",
    en: "Done Adhyayan Bindu",
    stage: 2,
  },
  { value: "reading", hi: "पुस्तकें पढ़ रहा हूँ", en: "Reading the books", stage: 4 },
  { value: "longtime", hi: "वर्षों से अध्ययनरत", en: "Long-time student", stage: 5 },
];

export function stageById(id: number | null | undefined): Stage | null {
  return STAGES.find((s) => s.id === id) ?? null;
}

export function levelOf(stage: Stage): Level {
  // `!` is safe by construction: every stage names a level that exists, and
  // the pair is a literal table rather than anything a user can influence.
  return LEVELS.find((l) => l.id === stage.level)!;
}

/** The stage after this one, or null at the end of the path. */
export function nextStage(stage: Stage): Stage | null {
  return STAGES.find((s) => s.id === stage.id + 1) ?? null;
}

/**
 * This stage's reading, in the order it should be met.
 *
 * The two `parichay` books are the exception the source names outright: परिचय
 * शिविर is JVEP's camp and अध्ययन बिंदु is ABVP's, so the stage that owns each
 * asks for it first rather than taking whichever the API listed first.
 */
const STAGE_LEADS: Partial<Record<StageId, string>> = { 1: "JVEP", 2: "ABVP" };

export function stageBooks(stage: Stage, books: BookSummary[]): BookSummary[] {
  if (!stage.genres) return [];
  const genres = stage.genres;

  const inStage = books.filter(
    (b) =>
      b.genre &&
      genres.includes(b.genre) &&
      // **Originals only.** A translation inherits its original's genre by
      // contract (§12), so `?genre=darshan` answers with the English MVD as
      // well as the Hindi one — and without this the path offered a student's
      // rendering as the core literature, which is the one thing the
      // Translations note says it is not. Translations stay readable and still
      // appear in the reading history; they are simply not what a stage names.
      !b.translation_of
  );

  // Genre order first, as the stage lists them — darshan before vaad before
  // shastra — then the shelf's own order inside each. Left to the API's order
  // alone, stage 4 opened on whichever book happened to come back first
  // rather than on the first of the darshan set.
  return [...inStage].sort((a, b) => {
    const lead = STAGE_LEADS[stage.id];
    if (lead) {
      if (a.code === lead) return -1;
      if (b.code === lead) return 1;
    }
    const ga = genres.indexOf(a.genre!);
    const gb = genres.indexOf(b.genre!);
    if (ga !== gb) return ga - gb;
    return books.indexOf(a) - books.indexOf(b);
  });
}
