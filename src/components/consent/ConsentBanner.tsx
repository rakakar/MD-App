"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { GA_ID, applyConsent } from "@/lib/analytics";
import { getPrefs, setPrefs } from "@/lib/storage";

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
    if (consent === null) {
      setVisible(true);
    } else {
      applyConsent(consent === "granted");
    }
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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-white p-4 shadow-2xl lg:bottom-4 lg:left-auto lg:right-4 lg:max-w-sm lg:rounded-2xl lg:border"
    >
      <p className="text-sm text-ink">
        We use Google Analytics to understand how the app is used. No analytics
        cookies are set unless you agree.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => choose(true)}
          className="rounded-full px-4 py-1.5 text-sm font-semibold text-white"
          style={{ background: "var(--ws-color)" }}
        >
          Allow analytics
        </button>
        <button
          type="button"
          onClick={() => choose(false)}
          className="rounded-full border border-rule px-4 py-1.5 text-sm font-semibold text-ink"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
