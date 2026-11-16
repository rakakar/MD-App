"use client";

import Link from "next/link";
import { FIRST_RUN_DONE } from "@/components/journey/StagePrompt";
import Script from "next/script";
import { useEffect, useState } from "react";
import { GA_ID, applyConsent } from "@/lib/analytics";
import { getPrefs, setPrefs } from "@/lib/storage";
import { ctaPrimary, ctaSecondary } from "@/components/ui";

/**
 * GA4 with consent mode (PRD §1): gtag boots with analytics_storage denied,
 * no analytics cookies before an explicit choice. The banner is the only
 * consent UI — kept deliberately simple.
 */
export function Analytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script id="ga-consent-default" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
gtag('js', new Date());
gtag('config', '${GA_ID}', { anonymize_ip: true });`}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
    </>
  );
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getPrefs().consent;
    if (consent !== null) {
      applyConsent(consent === "granted");
      return;
    }
    // Not over the first-run deck (15 Nov 2026). A new reader met the launch
    // screen, six cards, then this card over the tab bar and a notification
    // ask on Home — three asks before reading a line. It waits for the deck
    // to close; nothing is collected meanwhile, since consent is still unset.
    if (getPrefs().onboardingSeen) {
      setVisible(true);
      return;
    }
    const show = () => setVisible(getPrefs().consent === null);
    window.addEventListener(FIRST_RUN_DONE, show);
    return () => window.removeEventListener(FIRST_RUN_DONE, show);
  }, []);

  if (!visible) return null;

  const choose = (granted: boolean) => {
    setPrefs({ consent: granted ? "granted" : "denied" });
    applyConsent(granted);
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      // Above the phone's tab bar, not over it: `--bottom-nav-h` is the bar's
      // measured height (Nav publishes it, safe area included), 0 where there
      // is no bar. Covering it hid the five ways into the app on first visit.
      className="fixed inset-x-0 bottom-[var(--bottom-nav-h,0px)] z-50 border-t border-rule bg-card p-4 pb-[max(1rem,calc(env(safe-area-inset-bottom)-var(--bottom-nav-h,0px)))] shadow-raised lg:bottom-4 lg:left-auto lg:right-4 lg:max-w-sm lg:rounded-card lg:border lg:pb-4"
    >
      <p className="text-sm text-ink">
        We use Google Analytics to understand how the app is used. No analytics
        cookies are set unless you agree.
      </p>
      {/* The same in plain Hindi, for the reader this app is mostly for —
          asked before they have seen a page, in English jargon, it was the
          one question on first visit most of them could not read. */}
      <p lang="hi" className="hi-note mt-1.5 text-sm text-ink-soft">
        ऐप कैसे उपयोग हो रहा है, यह समझने के लिए हम Google Analytics का उपयोग करते हैं। आपकी अनुमति के बिना कुछ भी नहीं लिया जाता।
      </p>
      <Link
        href="/privacy"
        className="mt-1.5 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-2"
        style={{ color: "var(--ws-ink)" }}
      >
        What we keep
      </Link>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => choose(true)}
          className={ctaPrimary}
          style={{ background: "var(--ws-color)" }}
        >
          Allow
        </button>
        <button
          type="button"
          onClick={() => choose(false)}
          className={ctaSecondary}
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
