import { CountedSegmented } from "@/components/ui";

/**
 * Centres | City-wise contacts — the two halves of the Centres page as tabs
 * (designer's comp, 23 Oct 2026), on a phone and a desktop alike.
 *
 * Links, not buttons: each half is its own URL, so either can be shared and
 * each is prerendered. Either count can be missing when its request failed —
 * the tab is still drawn, just without a number it does not have.
 *
 * Full width on a phone, where it is the row; sized to its labels on a
 * desktop, where it shares the row with the state picker.
 */
export function CentresTabs({
  active,
  centres,
  contacts,
}: {
  active: "centres" | "contacts";
  centres?: number;
  contacts?: number;
}) {
  return (
    <div className="lg:w-fit lg:[&_a]:px-5">
      <CountedSegmented
        label="Centres"
        value={active}
        segments={[
          { value: "centres", label: "Centres", count: centres, href: "/connect/centres" },
          {
            value: "contacts",
            label: "City-wise contacts",
            count: contacts,
            href: "/connect/centres/contacts",
          },
        ]}
      />
    </div>
  );
}
