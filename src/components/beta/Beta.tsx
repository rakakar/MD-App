"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { useToast } from "@/components/settings/parts";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { CloseIcon } from "@/components/shell/icons";
import { ctaPrimary, ctaPrimaryCompact, ctaSecondary } from "@/components/ui";
import { Dialog, useIsDesktop } from "@/components/ui/Dialog";
import { Sheet } from "@/components/ui/Sheet";
import Link from "next/link";
import { applyConsent, track } from "@/lib/analytics";
import { visitNumber } from "@/lib/firstRun";
import { BETA, BETA_COPY, BETA_USED, markBetaUsed, whatsappFeedbackHref } from "@/lib/beta";
import { getPrefs, setPrefs } from "@/lib/storage";

/** Where the sheet was opened from — for `beta_open`, and the welcome's one button. */
type Source = "chip" | "menu" | "card" | "welcome";

interface BetaApi {
  /** `onDone` runs once, whichever way the sheet is closed */
  open: (source: Source, onDone?: () => void) => void;
}

const BetaContext = createContext<BetaApi>({ open: () => {} });

export function useBeta(): BetaApi {
  return useContext(BetaContext);
}

/**
 * **The beta's doors, and the one sheet they all open** (24 Nov 2026 release).
 *
 * - Desktop: the बीटा chip beside "MD Study" in the rail, which has the room.
 * - Phone, signed in: the first row of the account menu, with a dot on the
 *   account button until that menu has been opened once. The chip used to sit
 *   in the app bar and took the switcher's width (designer, 21 Nov 2026).
 * - Home, everyone: a card, for discovery — see `BetaCard`.
 * - Once, after the first-run deck: the same sheet as the welcome.
 *
 * Inside `FeedbackProvider`, because "बताएँ" here is the same composer the
 * account menu opens: the beta adds doors to feedback, not a second inbox.
 */
export function BetaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ source: Source; onDone?: () => void } | null>(null);

  const open = useCallback((source: Source, onDone?: () => void) => {
    track("beta_open", { source });
    setState({ source, onDone });
  }, []);
  const api = useMemo(() => ({ open }), [open]);

  const close = () => {
    state?.onDone?.();
    setState(null);
  };

  return (
    <BetaContext.Provider value={api}>
      {children}
      {BETA && state && <BetaSheet welcome={state.source === "welcome"} onClose={close} />}
    </BetaContext.Provider>
  );
}

/**
 * **The rail's chip** (desktop). The word, not an icon: an icon would have to
 * be learnt, and "बीटा" is the term the announcement, the welcome and the
 * WhatsApp group all use. A pill drawn small inside a full 44px target, quiet
 * (card and hairline, workspace ink) beside the name it qualifies.
 */
export function BetaChip({ className = "" }: { className?: string }) {
  const { open } = useBeta();
  if (!BETA) return null;
  return (
    <button
      type="button"
      onClick={() => open("chip")}
      aria-label={BETA_COPY.chipLabel}
      className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center ${className}`}
    >
      <span
        lang="hi"
        className="hi-note rounded-full border border-rule bg-card px-2.5 py-0.5 text-xs font-semibold"
        style={{ color: "var(--ws-ink)" }}
      >
        {BETA_COPY.chip}
      </span>
    </button>
  );
}

/**
 * Where the beta lives for this reader, once a sheet or card has gone: the
 * rail on a desktop, the account menu for a signed-in phone, and the Home card
 * itself for a phone guest — who has a Sign in button where the menu would be.
 */
function useBetaHome(): "desktop" | "menu" | "card" {
  const desktop = useIsDesktop();
  const { user } = useAuth();
  return desktop ? "desktop" : user ? "menu" : "card";
}

/**
 * **The Home card.** The beta's door for discovery, under the Sutra and the
 * resume row like the notification banner beside it, and for the same
 * reason: it appears after hydration (it reads storage), and at the top it
 * would shove the page down under the reader's thumb.
 *
 * Retires two ways: its ×, or the reader having used the beta to tell us
 * something (`markBetaUsed`). Either way the beta is still a tap away where
 * `useBetaHome` says — and the × says so, in a toast, on the way out.
 *
 * **Not on the first visit** (lib/firstRun): that one belongs to the welcome
 * sheet, and the card is the same ask again.
 *
 * **No × for a phone guest.** They have no account menu, so this card is
 * their only door to the beta after the welcome; closing it would leave
 * WhatsApp and the guest note unreachable. It still retires once used.
 */
export function BetaCard({ className = "" }: { className?: string }) {
  const { open } = useBeta();
  const home = useBetaHome();
  const [toast, showToast] = useToast();
  const [hidden, setHidden] = useState(true); // assume hidden until read

  useEffect(() => {
    // From the second visit (lib/firstRun): the first is the welcome sheet's,
    // and a card restating it on the Home behind it is the same ask twice.
    setHidden(getPrefs().betaCardDismissed || visitNumber() < 2);
    const used = () => setHidden(true);
    window.addEventListener(BETA_USED, used);
    return () => window.removeEventListener(BETA_USED, used);
  }, []);

  if (!BETA) return null;
  // The toast outlives the card: it is the card saying where it went.
  if (hidden) return <>{toast}</>;

  const dismiss = () => {
    setPrefs({ betaCardDismissed: true });
    setHidden(true);
    track("beta_card_dismiss");
    showToast(home === "desktop" ? BETA_COPY.movedToRail : BETA_COPY.movedToMenu);
  };

  return (
    <>
      <div
        className={`relative flex items-start gap-3 rounded-2xl border bg-accent-tint p-4 ${className}`}
        style={{ borderColor: "color-mix(in srgb, var(--ws-color) 35%, transparent)" }}
      >
        <div className="min-w-0 flex-1 pe-8">
          <p lang="hi" className="hi-note text-base font-semibold" style={{ color: "var(--ws-ink)" }}>
            {BETA_COPY.cardTitle}
          </p>
          <p lang="hi" className="hi-note mt-0.5 text-sm text-ink">
            {BETA_COPY.cardBody}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">{BETA_COPY.cardEn}</p>
          <button
            type="button"
            onClick={() => open("card")}
            className={`${ctaPrimaryCompact} mt-3`}
            style={{ background: "var(--ws-color)" }}
          >
            {BETA_COPY.cardCta}
          </button>
        </div>
        {home !== "card" && (
          <button
            type="button"
            onClick={dismiss}
            aria-label={BETA_COPY.cardClose}
            className="absolute end-1 top-1 flex h-11 w-11 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {toast}
    </>
  );
}

function BetaSheet({ welcome, onClose }: { welcome: boolean; onClose: () => void }) {
  const desktop = useIsDesktop();
  const home = useBetaHome();
  const { workspace } = useWorkspace();
  const feedback = useFeedback();
  const whatsapp = whatsappFeedbackHref();
  const where = BETA_COPY.where[home];
  /* Asked here while it is unanswered — on a first visit, always. The
     banner that used to ask it waits for this sheet and stays away once it
     has an answer. Read once, on open: answering closes the sheet. */
  const [consentOwed] = useState(() => welcome && getPrefs().consent === null);

  const choose = (granted: boolean) => {
    setPrefs({ consent: granted ? "granted" : "denied" });
    applyConsent(granted);
    onClose();
  };

  const tell = () => {
    onClose();
    feedback.open({ source: "beta" });
  };

  const body = (
    <>
      <p lang="hi" className="hi text-base font-semibold text-ink">
        {BETA_COPY.titleHi}
      </p>
      <p lang="hi" className="hi mt-1 text-sm text-ink">
        {BETA_COPY.bodyHi}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{BETA_COPY.en}</p>
      {welcome && home !== "card" && (
        <div className="mt-4 rounded-control bg-ink/5 px-3.5 py-2.5">
          <p lang="hi" className="hi-note text-sm text-ink">
            {where.hi}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">{where.en}</p>
        </div>
      )}
      {/* A phone guest has no account menu, and the Home card waits for the
          next visit — so on this one, the door is in the sheet itself. */}
      {welcome && home === "card" && (
        <p lang="hi" className="hi-note mt-3 text-sm text-ink-soft">
          {BETA_COPY.tellNow}{" "}
          <button
            type="button"
            onClick={tell}
            className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2"
            style={{ color: "var(--ws-ink)" }}
          >
            {BETA_COPY.tell}
          </button>
        </p>
      )}
      {consentOwed && (
        <div className="mt-3 border-t border-rule pt-3">
          <p lang="hi" className="hi-note text-sm text-ink">
            {BETA_COPY.consentHi}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">{BETA_COPY.consentEn}</p>
          <Link
            href="/privacy"
            onClick={onClose}
            className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-2"
            style={{ color: "var(--ws-ink)" }}
          >
            {BETA_COPY.consentLink}
          </Link>
        </div>
      )}
    </>
  );

  /* The welcome ends in one decision — carry on — so it has one button.
     Everywhere else the sheet is opened to say something, so it is "बताएँ",
     with WhatsApp beside it for the reader who will not sign in or would
     rather speak. */
  const actions = consentOwed ? (
    /* One decision, two answers: either one closes the welcome. */
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => choose(true)}
        className={`${ctaPrimary} flex-1 lg:flex-none`}
        style={{ background: "var(--ws-color)" }}
      >
        <span lang="hi" className="hi-note">{BETA_COPY.consentAllow}</span>
      </button>
      <button
        type="button"
        onClick={() => choose(false)}
        className={`${ctaSecondary} flex-1 lg:flex-none`}
      >
        <span lang="hi" className="hi-note">{BETA_COPY.consentDeny}</span>
      </button>
    </div>
  ) : welcome ? (
    <button
      type="button"
      onClick={onClose}
      className={`${ctaPrimary} w-full lg:w-auto`}
      style={{ background: "var(--ws-color)" }}
    >
      <span lang="hi" className="hi-note">{BETA_COPY.welcomeCta}</span>
    </button>
  ) : (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={tell}
          className={`${ctaPrimary} flex-1 lg:flex-none`}
          style={{ background: "var(--ws-color)" }}
        >
          {BETA_COPY.tell}
        </button>
        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              track("feedback_whatsapp", { source: "beta" });
              markBetaUsed();
              onClose();
            }}
            className={`${ctaSecondary} flex-1 lg:flex-none`}
          >
            <span lang="hi" className="hi-note">{BETA_COPY.whatsapp}</span>
          </a>
        )}
      </div>
      {whatsapp && <p className="text-xs text-ink-soft">{BETA_COPY.whatsappHint}</p>}
    </div>
  );

  if (desktop) {
    return (
      <Dialog
        open
        onClose={onClose}
        label={BETA_COPY.sheetTitle}
        accent={workspace.color}
        className="flex w-full max-w-md flex-col"
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-6">
          <h2 className="text-lg font-semibold">{BETA_COPY.sheetTitle}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-me-2 flex h-11 w-11 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <CloseIcon className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="px-6 pb-5">{body}</div>
        <div className="border-t border-rule bg-inset px-6 py-4">{actions}</div>
      </Dialog>
    );
  }

  return (
    <Sheet open onClose={onClose} title={BETA_COPY.sheetTitle} accent={workspace.color} footer={actions}>
      <div className="px-5 pb-5 pt-3">{body}</div>
    </Sheet>
  );
}
