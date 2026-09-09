"use client";

import { useId, useState } from "react";
import {
  ChevronDown,
  ExternalLinkIcon,
  PhoneIcon,
  PinIcon,
} from "@/components/shell/icons";
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
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          {/* The UI sans, not `font-display`. Newsreader is the app's face for
              a *page* title — the shelves, Translations, My Journey — and a
              centre's name is a card heading inside a list of them. The
              Devanagari case was already sans: `.hi` with a weight resolves to
              Mukta, since Tiro ships no bold. So the two scripts were coming
              out of different families on the same row of cards.

              20px, where the event card's title is 21px, and that is the two
              of them *matching* rather than drifting. Sans is what makes the
              difference: measured at 21px, Instrument Sans caps at 15.12px
              against Newsreader's 14.20 and Mukta's 13.23, so a centre's name
              set to the same number came out visibly the larger heading of the
              two cards. At 20px it caps at 14.40 — within 1.4% of the event
              title beside it, which is the size the eye actually compares. */}
          <h3
            {...n}
            className={`${n.className} ${
              n.lang === "hi" ? "hi-tight" : "leading-snug"
            } min-w-0 flex-1 text-[1.25rem] font-semibold`}
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
            className={`${contentLang(centre.org_name).className} mt-0.5 text-sm text-ink-soft`}
          >
            {centre.org_name}
          </p>
        )}

        {centre.address && (
          <div className="mt-3 flex gap-3 border-t border-rule pt-3">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
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
                className={`${contentLang(centre.address).className} text-sm`}
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

            {/* Rendered while closed now, so the panel has a height to animate
                from — `.disclosure` opens it from `0fr` to `1fr` rather than
                snapping. What kept it unmounted before was a real concern and
                not a style one: the panel holds tappable phone numbers and mail
                links, and a subtree that still answers to Tab while hidden is
                the accessibility bug this pattern usually ships with. `inert`
                is what answers that now — it takes the whole panel out of the
                tab order and the accessibility tree while it is closed. */}
            <div className="disclosure" data-open={open}>
              <div id={panelId} inert={!open}>
                <div className="mt-1">
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
                  <section className="mt-3.5 border-t border-rule pt-3">
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
                    className={`${contentLang(centre.note).className} mt-3.5 whitespace-pre-line border-t border-rule pt-3 text-sm text-ink-soft`}
                  >
                    {centre.note}
                  </p>
                )}
                </div>
              </div>
            </div>
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
              expandable || centre.address ? "mt-3 border-t border-rule pt-3" : "mt-3.5"
            }`}
          >
            {centre.phone && (
              /*
                Outlined, in the workspace's own ink — the same treatment as the
                event card's View Details, and the same three custom properties
                in the same order, so the two primary actions in Connect read as
                one thing rather than two.

                It used to be the comps' solid black, which was drawn to be the
                card's strongest mark and, in a list of cards, ended up being
                the only mark: a column of black bars down a screen of quiet
                white cards. Outlined it still leads — the neutral Visit Website
                beside it is bordered in `--color-rule`, this one in `--ws-ink`
                over a wash of the workspace colour — without shouting.

                That also retires a theme bug worth not reintroducing: the solid
                version painted its label `--color-surface` rather than
                `text-white`, because it sat on `--color-ink`, which inverts to
                near-white in dark and swallowed a white label whole. Nothing
                here sits on the ink any more, so the trap is gone with it.
              */
              <a
                href={`tel:${centre.phone_href}`}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-control border px-5 text-sm font-semibold transition-colors"
                style={{
                  borderColor: "var(--ws-ink)",
                  background: "color-mix(in srgb, var(--ws-color) 8%, var(--color-card))",
                  color: "var(--ws-ink)",
                }}
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
