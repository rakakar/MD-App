"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Sheet } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { displayPhone } from "@/lib/me";
import { APP_ACCENT } from "@/lib/workspaceConfig";

const CONTACT = "app@madhyasth.org";

/**
 * Delete account — the reader's own way out (contract §6.4). App Store and
 * Play both require one in the app once it lets people sign up; until now the
 * only route was an email to us, named on /privacy.
 *
 * One step, said plainly: what goes, that it cannot come back, then a proof.
 * The proof is the password where the account has one, so a session left
 * open on a shared phone cannot erase its owner. A mobile-only account has no
 * password to give; there it is a tick, which at least makes the decision a
 * second, deliberate act.
 *
 * The button is outlined in `danger`, not filled: dark theme's danger is a
 * light rose, and white text on it would not read.
 */
export function DeleteAccount({
  open,
  desktop,
  onClose,
}: {
  open: boolean;
  desktop: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { user, deleteAccount } = useAuth();
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReactNode>(null);

  if (!user) return null;

  const email = (user.email as string) || "";
  const hasPassword = user.has_password ?? email !== "";
  const signIn = email || displayPhone(user.phone as string | undefined);
  const ready = hasPassword ? password !== "" : understood;

  const close = () => {
    if (busy) return;
    setPassword("");
    setUnderstood(false);
    setError(null);
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(hasPassword ? password : undefined);
      router.replace("/");
    } catch (err) {
      const { status, data } = err as { status?: number; data?: Record<string, unknown> };
      if (status === 400 && data?.password) {
        setError("That password isn’t right.");
      } else if (status === 404 || status === 405 || status === 501) {
        // A server that cannot delete yet — say how it can still be done.
        setError(
          <>
            Deleting from the app isn’t switched on yet. Write to{" "}
            <a href={`mailto:${CONTACT}`} className="font-semibold underline">
              {CONTACT}
            </a>{" "}
            from {signIn} and we will delete it for you.
          </>
        );
      } else {
        setError("Couldn’t delete your account. Check your connection and try again.");
      }
      setBusy(false);
    }
  };

  const title = "Delete account";

  const body = (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="text-base leading-relaxed text-ink">
        <p>
          This deletes your MD Study account, <span className="whitespace-nowrap">{signIn}</span>, and
          everything saved on it:
        </p>
        <ul className="mt-2 list-disc ps-5 text-ink-soft">
          <li>your name and contact details</li>
          <li>highlights, notes and bookmarks, on every device</li>
          <li>where you stopped reading and listening</li>
          <li>Assistant conversations on this device</li>
        </ul>
        <p className="mt-3 font-semibold">It can’t be undone.</p>
        <p className="mt-1 text-sm text-ink-soft">You can still read as a guest afterwards.</p>
      </div>

      {hasPassword ? (
        <div>
          <label htmlFor="delete-password" className="mb-2 block text-sm font-semibold text-ink-soft">
            Your password, to confirm
          </label>
          <input
            id="delete-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-control border border-rule bg-card px-4 text-base text-ink outline-none focus:border-danger focus:ring-3 focus:ring-danger/15"
          />
        </div>
      ) : (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base text-ink">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-danger"
          />
          I understand this can’t be undone
        </label>
      )}

      {error && (
        <p role="alert" className="rounded-tile border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className={desktop ? "flex items-center justify-end gap-2" : "flex flex-col-reverse gap-2"}>
        <button
          type="button"
          onClick={close}
          className="inline-flex min-h-12 items-center justify-center rounded-control px-4 text-sm font-semibold text-ink transition-colors hover:bg-inset"
        >
          Keep my account
        </button>
        <button
          type="submit"
          disabled={!ready || busy}
          aria-busy={busy}
          className="inline-flex min-h-12 items-center justify-center rounded-control border-2 border-danger bg-card px-5 text-sm font-semibold text-danger transition-colors not-disabled:hover:bg-danger/8 disabled:border-rule disabled:text-ink-soft"
        >
          {busy ? "Deleting…" : "Delete my account"}
        </button>
      </div>
    </form>
  );

  if (desktop) {
    return (
      <Dialog
        open={open}
        onClose={close}
        label={title}
        accent={APP_ACCENT}
        className="w-full max-w-md rounded-hero bg-card p-8 shadow-raised"
      >
        <h2 className="mb-5 font-display text-2xl font-medium text-ink">{title}</h2>
        {body}
      </Dialog>
    );
  }
  return (
    <Sheet open={open} onClose={close} title={title} accent={APP_ACCENT}>
      <div className="px-5 pb-6 pt-1">{body}</div>
    </Sheet>
  );
}
