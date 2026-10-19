"use client";

import { CARD, SettingsSection, SwitchRow } from "@/components/settings/parts";
import { usePush } from "./usePush";

/**
 * The notifications row in Settings — the permanent home of this control,
 * where someone who dismissed the banner (or wants to turn it back off) can
 * always find it.
 *
 * Drawn as the comps' switch (19 Oct 2026); the words are the ones it already
 * had. Off and on are the two buttons it used to be: on calls `enable`, off
 * calls `disable`. Where the choice is not the reader's to make here — iPhone
 * in a tab, or blocked in the OS — the switch is drawn off and inert, and the
 * box under it says what to do instead.
 *
 * The one hard rule: `enable` hangs off onClick with nothing awaited in
 * between. Safari grants `Notification.requestPermission()` only inside a user
 * gesture, and an `await` before it drops the gesture — the request is then
 * refused without the reader ever seeing a prompt, on the exact platform where
 * this feature is most fragile.
 */
export function NotificationSetting({ desktop }: { desktop: boolean }) {
  const { status, native, busy, error, enable, disable } = usePush();

  // Nothing to offer, and nothing worth explaining: no Firebase project
  // configured, or a browser with no push at all.
  if (status === "loading" || status === "unconfigured" || status === "unsupported") return null;

  const box = "mt-4 rounded-tile bg-inset p-4 text-sm text-ink-soft";

  return (
    <SettingsSection id="notifications" title="Notifications">
      <div className={`${CARD} ${desktop ? "px-7" : "px-5"} py-5`}>
        <SwitchRow
          title="Notifications"
          description={
            status === "granted"
              ? "You'll hear about new chapters, shivirs and announcements."
              : status === "denied"
                ? native
                  ? "Turned off in your phone's settings."
                  : "Blocked in your browser settings."
                : status === "ios-install"
                  ? "Available once the app is on your home screen."
                  : "New chapters, shivirs and announcements."
          }
          checked={status === "granted"}
          disabled={busy || status === "ios-install" || status === "denied"}
          onChange={(on) => (on ? void enable() : void disable())}
        />

        {status === "ios-install" && (
          <div className={box}>
            <p className="font-medium text-ink-soft">
              On iPhone and iPad, notifications work only when the app is installed.
            </p>
            <ol className="mt-3 flex flex-col gap-2.5 text-ink">
              <Step n={1}>
                Tap <strong>Share</strong> in Safari
              </Step>
              <Step n={2}>
                Then <strong>Add to Home Screen</strong>
              </Step>
              <Step n={3}>And open MD Study from that icon</Step>
            </ol>
          </div>
        )}
        {status === "denied" &&
          (native ? (
            <p className={box}>
              Notifications are switched off for MD Study. Only you can turn them back on — open
              your phone&apos;s <strong>Settings</strong>, then <strong>Apps</strong> →{" "}
              <strong>MD Study</strong> → <strong>Notifications</strong>.
            </p>
          ) : (
            <p className={box}>
              Your browser is blocking notifications for this site. Only you can undo that — look
              for the lock or ⓘ icon beside the address, or this site&apos;s entry in your
              browser&apos;s notification settings.
            </p>
          ))}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </div>
    </SettingsSection>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rule bg-card text-xs font-semibold text-accent-ink"
      >
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}
