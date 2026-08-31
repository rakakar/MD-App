"use client";

import { useId, useState } from "react";
import {
  ChevronDown,
  ExternalLinkIcon,
  PhoneIcon,
  PinIcon,
} from "@/components/shell/icons";
import { ctaPrimary } from "@/components/ui";
import { hasMoreDetails, type Centre } from "@/lib/directory";
import { contentLang } from "@/lib/script";
import { ContactRow } from "./ContactCard";

/**
 * One centre, as the comps draw it (7, 8, 9).
 *
 * **The card is the whole screen for this centre.** It expands in place —
 * there is no detail route and no second call — so everything the expansion
 * shows arrived with the list.
 *
 * Almost every block is conditional, and that is the design rather than
 * defensiveness: of the four cards in the comps, one carries an address and
 * three do not, and Bemetara's shows no pin row at all. The API sends empty
 * values for what a centre does not have, and the shorter card is correct.
 *
 * The teal rule across the top is the workspace's own colour, not a per-centre
 * accent. A centre has no category to be coloured by — unlike an event, whose
 * stripe carries its shivir category — so the one thing it could say is "you
 * are in Connect", which is what the comps draw.
 */
export function CentreCard({ centre }: { centre: Centre }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const n = contentLang(centre.name);
  const expandable = hasMoreDetails(centre);

  return (
    <article className="overflow-hidden rounded-card border border-rule bg-card shadow-card">
      <span
        aria-hidden
        className="block h-1 w-full"
        style={{ background: "var(--ws-color)" }}
      />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <h3
            {...n}
            className={`${n.className} ${
              n.lang === "hi" ? "hi-tight" : "font-display leading-snug"
            } min-w-0 flex-1 text-[1.3125rem] font-semibold`}
          >
            {centre.name}
          </h3>
          {/* Never derived here — the API sends "Est. 2011" or sends nothing.
              A year with no pill is a centre whose year the manager left out. */}
          {centre.est_label && (
            <span
              className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                background: "color-mix(in srgb, var(--ws-color) 12%, var(--color-card))",
                color: "var(--ws-ink)",
              }}
            >
              {centre.est_label}
            </span>
          )}
        </div>

        {centre.org_name && (
          <p
            {...contentLang(centre.org_name)}
            className={`${contentLang(centre.org_name).className} mt-1 text-title text-ink-soft`}
          >
            {centre.org_name}
          </p>
        )}

        {centre.address && (
          <div className="mt-3.5 flex gap-3 border-t border-rule pt-3.5">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{
                background: "color-mix(in srgb, var(--ws-color) 10%, var(--color-card))",
                color: "var(--ws-ink)",
              }}
            >
              <PinIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p
                {...contentLang(centre.address)}
                className={`${contentLang(centre.address).className} text-title`}
              >
                {centre.address}
                {/* The pincode is its own field so it can be printed in the
                    figures the rest of the app uses for numbers, wherever it
                    lands beside Devanagari. */}
                {centre.pincode && (
                  <>
                    {" "}
                    <span dir="ltr" className="tabular-nums">
                      {centre.pincode}
                    </span>
                  </>
                )}
              </p>
              {/* Drawn only with a link behind it. An address with no map URL
                  is still an address; a "View on map" that opens nothing is a
                  broken promise on the one row a traveller would trust. */}
              {centre.map_url && (
                <a
                  href={centre.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold"
                  style={{ color: "var(--ws-ink)" }}
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                  View on map
                </a>
              )}
            </div>
          </div>
        )}

        {/* **A real disclosure button, or nothing at all.**

            The comps put "More details ›" on every card, including the ones
            with nothing behind it — three of the four. A control that opens an
            empty panel is the deviation worth taking: `hasMoreDetails` decides,
            and a centre with no programmes, no contacts and no note simply ends
            after its address. */}
        {expandable && (
          <>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={panelId}
              className={`mt-3 flex min-h-11 w-full items-center justify-between gap-3 text-start text-title font-semibold ${
                centre.address ? "border-t border-rule pt-3" : ""
              }`}
            >
              More details
              <span
                aria-hidden
                className={`shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
                style={{ color: "var(--ws-ink)" }}
              >
                <ChevronDown />
              </span>
            </button>

            {/* Unmounted while closed rather than hidden with a class: the
                panel holds tappable phone numbers and mail links, and a
                `hidden` subtree that still answers to Tab is the accessibility
                bug this pattern usually ships with. */}
            {open && (
              <div id={panelId} className="mt-1">
                {centre.programmes.length > 0 && (
                  <section>
                    <h4 className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
                      Programmes
                    </h4>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {centre.programmes.map((p) => (
                        <li
                          key={p.code}
                          className="rounded-full bg-inset px-3.5 py-1.5 text-sm font-medium"
                        >
                          {p.name}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {centre.contacts.length > 0 && (
                  <section className="mt-4 border-t border-rule pt-3.5">
                    <h4 className="text-xs font-bold uppercase tracking-[0.09em] text-ink-soft">
                      Contact
                    </h4>
                    <ul className="mt-1.5">
                      {centre.contacts.map((c) => (
                        <li key={c.id}>
                          <ContactRow contact={c} />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {centre.note.trim() && (
                  <p
                    {...contentLang(centre.note)}
                    className={`${contentLang(centre.note).className} mt-4 whitespace-pre-line border-t border-rule pt-3.5 text-sm text-ink-soft`}
                  >
                    {centre.note}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Call and Visit Website, each drawn only when there is something
            behind it — the contract's own rule, and the reason `phone` and
            `website` are separate fields rather than one "contact" blob.

            `phone_href` is what is dialled and `phone` is never reformatted
            here: a client that tidies a number before dialling it is a client
            that eventually dials the wrong one. */}
        {(centre.phone || centre.website) && (
          <div
            className={`flex flex-wrap items-stretch gap-2.5 ${
              expandable || centre.address ? "mt-3.5 border-t border-rule pt-3.5" : "mt-4"
            }`}
          >
            {centre.phone && (
              /*
                The comps' black Call button, which is the card's primary
                action — stronger than the teal, because a centre is a place
                you telephone.

                **`--color-surface` as the label, not `text-white`.** `ctaPrimary`
                is white-on-workspace-colour, and it is white because every other
                CTA in the app sits on a saturated hue. This one sits on the ink,
                and the ink inverts with the theme: in dark it is near-white, so a
                white label on it was invisible — the bug this comment exists to
                keep fixed. Painting the label in the page's own ground inverts
                with it, which keeps the comp's high-contrast pairing in both
                themes rather than only in the one it was drawn in.
              */
              <a
                href={`tel:${centre.phone_href}`}
                className={`${ctaPrimary} flex-1`}
                style={{ background: "var(--color-ink)", color: "var(--color-surface)" }}
              >
                <PhoneIcon className="h-4 w-4" />
                Call
              </a>
            )}
            {centre.website && (
              <a
                href={centre.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-control border border-rule bg-card px-5 text-sm font-semibold transition-colors active:bg-ink/[.04]"
              >
                Visit Website
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
