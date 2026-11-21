import { collectContext } from "@/lib/feedback";
import { setPrefs } from "@/lib/storage";

/**
 * **The beta release (24 Nov 2026).**
 *
 * One switch for the whole of it: the rail's बीटा chip, the account-menu row
 * and its dot, the Home card, the one-time welcome after the first-run deck,
 * and the sheet they all open (`components/beta/Beta`). Turning it off removes
 * those and nothing else. The plan behind the copy
 * (why a proof copy, why WhatsApp) is the team's "MD Study beta release plan"
 * doc.
 */
export const BETA = true;

/**
 * Hindi first, English under it, as every tester message was in the study.
 *
 * **The proof copy is the whole argument.** "Testing" reads to a reader over
 * forty as "broken, don't rely on it yet"; a book's प्रूफ़-प्रति is something
 * they already know is read so mistakes can be put right, and asks them to
 * help. Nothing here promises that data survives the beta, and nothing warns
 * that it might not: the first would be a promise nobody has made yet, the
 * second stops people saving anything.
 */
export const BETA_COPY = {
  chip: "बीटा",
  chipLabel: "Beta: what it means, and how to tell us something",
  sheetTitle: "बीटा · Beta",
  /*
   * Short on purpose (designer, 21 Nov 2026): the welcome also carries the
   * analytics question, and with both languages in full it ran past a phone
   * screen. Hindi says it; the English under it is one line, set smaller.
   * "बीटा" is already the sheet's title, so the copy does not repeat it.
   */
  titleHi: "यह MD Study का पहला संस्करण है",
  bodyHi:
    "किताब की प्रूफ़-प्रति की तरह, यह आपके सुझावों से सुधरेगा। कुछ अटके या कोई शब्द ग़लत दिखे, तो “बताएँ” दबाइए।",
  en: "The first version. Like a proof copy, it improves with your feedback.",
  /**
   * Welcome only: where the door is once the sheet has gone. Three answers,
   * because it is in three places — the rail's chip on a desktop, the account
   * menu on a phone, and for a phone guest (no account menu, only Sign in)
   * the card on Home.
   */
  where: {
    desktop: {
      hi: "जब भी कुछ बताना हो, बाईं ओर “MD Study” के पास “बीटा” दबाइए।",
      en: "Whenever you want to tell us something, tap बीटा next to MD Study on the left.",
    },
    menu: {
      hi: "जब भी कुछ बताना हो, खाते के मेनू में “बीटा” दबाइए।",
      en: "Whenever you want to tell us something, open your account menu and tap बीटा.",
    },
    card: {
      hi: "जब भी कुछ बताना हो, होम पर बीटा कार्ड में “बताएँ” दबाइए।",
      en: "Whenever you want to tell us something, tap Tell us on the beta card on Home.",
    },
  },
  menuRow: "बीटा · सुझाव दें",
  cardTitle: "यह पहला संस्करण (बीटा) है",
  cardBody: "आपके सुझावों से यह ऐप सुधरेगा।",
  cardEn: "This is the first version of MD Study. Your feedback shapes it.",
  cardCta: "बताएँ · Tell us",
  cardClose: "Hide the beta card",
  movedToMenu: "बीटा अब खाते के मेनू में है",
  movedToRail: "बीटा बाईं ओर, “MD Study” के पास है",
  welcomeCta: "ठीक है, शुरू करें",
  /**
   * The analytics question, asked inside the welcome (21 Nov 2026) instead of
   * by a banner of its own, because during the beta it has the same reason:
   * seeing where readers get stuck is how a proof copy gets corrected.
   */
  consentHi:
    "क्या हम Google Analytics से देख सकें कि ऐप कैसे उपयोग हो रहा है? आपकी अनुमति के बिना कुछ नहीं लिया जाता।",
  consentEn: "May we see how the app is used? Nothing is collected unless you agree.",
  consentAllow: "हाँ · Allow",
  consentDeny: "नहीं · No thanks",
  consentLink: "What we keep",
  /** phone guest, welcome only: no card until the next visit, so the door is here */
  tellNow: "अभी कुछ बताना है?",
  tell: "बताएँ · Tell us",
  whatsapp: "WhatsApp पर बताएँ",
  whatsappHint: "No account needed. Voice notes welcome.",
} as const;

/** Fired by `FirstRunGate` when the welcome sheet closes, however it closed. */
export const BETA_WELCOME_DONE = "md:beta-welcome-done";

/** Fired when the beta has done its job for this reader; see `markBetaUsed`. */
export const BETA_USED = "md:beta-used";

/**
 * The reader has told us something through the beta — sent feedback opened
 * from it, or opened WhatsApp from its sheet. The Home card has done its job
 * and retires; the account-menu row stays.
 */
export function markBetaUsed(): void {
  setPrefs({ betaCardDismissed: true });
  window.dispatchEvent(new Event(BETA_USED));
}

/**
 * The team's WhatsApp number, digits only with the country code
 * (`NEXT_PUBLIC_FEEDBACK_WHATSAPP=91XXXXXXXXXX`). Unset, every WhatsApp door
 * stays hidden rather than pointing at nobody.
 */
const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_FEEDBACK_WHATSAPP ?? "").replace(/\D/g, "");

/**
 * A WhatsApp chat with the team, the message pre-filled.
 *
 * For the reader who will not sign in to send a note, or would rather speak
 * than type Devanagari on a phone. The last line carries what the in-app form
 * attaches on its own (build, platform, page), so a voice note that only says
 * "यह नहीं चल रहा" still arrives with a place. Nothing personal: no account,
 * no notes, no reading history.
 *
 * Built at the moment it is drawn, client-side only — the page is part of it.
 */
export function whatsappFeedbackHref(message = ""): string | null {
  if (!WHATSAPP_NUMBER || typeof window === "undefined") return null;
  const c = collectContext();
  const text = [
    message.trim() || "MD Study के बारे में:",
    "",
    `— MD Study ${c.app_version} · ${c.platform} · ${c.route}`,
  ].join("\n");
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}
