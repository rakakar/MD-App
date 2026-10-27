"use client";

// The reader's account: who they are, their display name, their password.
//
// Changing the password takes the *old* password. A reader who has forgotten
// it resets it with a code to their email (/forgot-password).
//
// One account, two shapes (the comps of 19 Oct 2026): at a desk each row opens
// in place — the name becomes a field, the password row grows its fields under
// it; on a phone each row is a tap into a bottom sheet, because a field that
// opens inside a scrolled card is one the keyboard covers.

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CheckIcon, ChevronRight, CloseIcon } from "@/components/shell/icons";
import { Sheet, ctaPrimary } from "@/components/ui";
import { useIsDesktop } from "@/components/ui/Dialog";
import { changePassword, displayPhone, setPassword, updateMe } from "@/lib/me";
import { APP_ACCENT } from "@/lib/workspaceConfig";
import { syncPersonal } from "@/lib/personal";
import { CARD } from "./parts";

/** The comp's counter reads n/40. */
const NAME_MAX = 40;
const PW_MIN = 8;

/** The checks the password sheet ticks off as the reader types. */
function passwordChecks(pw: string) {
  return [
    { label: `At least ${PW_MIN} characters`, ok: pw.length >= PW_MIN },
    { label: "Includes a number", ok: /\d/.test(pw) },
  ];
}

const FIELD =
  "h-11 w-full rounded-control border border-rule bg-inset px-4 text-base text-ink outline-none " +
  "placeholder:text-ink-soft focus:border-(--ws-color) focus:bg-card focus:ring-3 focus:ring-(--ws-color)/15";

/** The quiet bordered button at the end of a row — Edit, Change. */
const ROW_BUTTON =
  "inline-flex min-h-11 shrink-0 items-center rounded-control border border-rule px-4 text-sm font-semibold text-ink transition-colors hover:bg-inset";

const TEXT_BUTTON =
  "inline-flex min-h-11 shrink-0 items-center px-3 text-sm font-medium text-ink transition-colors hover:text-ink-soft";

export function AccountCard({ onSaved }: { onSaved: (message: string) => void }) {
  const { user, loading } = useAuth();
  const desktop = useIsDesktop();

  if (loading) return <div className={`${CARD} h-24`} aria-hidden />;

  if (!user) {
    return (
      <div className={`${CARD} flex items-center justify-between gap-3 p-5 lg:px-7`}>
        <p className="text-sm text-ink-soft">Reading as guest — saved on this device only.</p>
        <Link href="/login?next=/settings" className={ctaPrimary} style={{ background: "var(--ws-color)" }}>
          Sign in
        </Link>
      </div>
    );
  }

  const name = (user.name as string) || "";
  // A reader who signed up by mobile number has no password: they sign in
  // with a WhatsApp code. Once they have verified an email they may set one
  // (and sign in with email + password too) — "Set a password", with no old
  // one to give.
  const email = (user.email as string) || "";
  const hasPassword = user.has_password ?? email !== "";
  const canSetPassword = !hasPassword && email !== "" && user.email_verified === true;
  const contact = email || displayPhone(user.phone as string | undefined);
  // "Reader" for a number with no name, as the header menu does — never "+"
  const initial = (name || email || "Reader").trim().charAt(0).toUpperCase();

  const identity = (
    <div className="flex items-center gap-4">
      <span
        aria-hidden
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-rule bg-accent-tint text-xl font-semibold text-accent-ink lg:h-14 lg:w-14"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-title font-semibold text-ink">{name || contact}</p>
        {name && contact && <p className="truncate text-sm text-ink-soft">{contact}</p>}
      </div>
      {desktop && <SyncPill />}
    </div>
  );

  return desktop ? (
    <div className={`${CARD} px-7`}>
      <div className="py-6">{identity}</div>
      <NameRow name={name} onSaved={onSaved} />
      {(hasPassword || canSetPassword) && <PasswordRow setting={!hasPassword} onSaved={onSaved} />}
    </div>
  ) : (
    <PhoneAccount
      identity={identity}
      name={name}
      hasPassword={hasPassword}
      canSetPassword={canSetPassword}
      onSaved={onSaved}
    />
  );
}

/**
 * "Synced" only once a sync has actually gone through on this visit. Until then
 * it says it is syncing, and offline it says so — a green tick over data that
 * has not reached the account would be the one lie on this screen.
 */
function SyncPill() {
  const [state, setState] = useState<"syncing" | "synced" | "offline">("syncing");
  useEffect(() => {
    let live = true;
    const check = () => {
      if (!navigator.onLine) {
        setState("offline");
        return;
      }
      setState("syncing");
      void syncPersonal().then((ok) => live && setState(ok ? "synced" : "offline"));
    };
    check();
    window.addEventListener("online", check);
    window.addEventListener("offline", check);
    return () => {
      live = false;
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, []);
  const synced = state === "synced";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
        synced ? "bg-success-tint text-success" : "bg-inset text-ink-soft"
      }`}
    >
      {synced && <CheckIcon className="h-3.5 w-3.5" />}
      {synced ? "Synced" : state === "syncing" ? "Syncing…" : "Not synced"}
    </span>
  );
}

/* ---------------------------------------------------------------- desktop */

const ROW = "grid grid-cols-[11rem_minmax(0,1fr)_auto] items-center gap-x-4 border-t border-rule py-4";

function NameRow({ name, onSaved }: { name: string; onSaved: (m: string) => void }) {
  const { refresh } = useAuth();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setValue(name);
    setError(null);
    setEditing(true);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const next = value.trim();
    if (!next || next === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateMe(next);
      await refresh();
      setEditing(false);
      onSaved("Name saved");
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className={ROW}>
        <p className="text-title font-medium text-ink">Display name</p>
        <p className="truncate text-title text-ink-soft">{name || "Not set"}</p>
        <button type="button" onClick={open} className={ROW_BUTTON}>
          Edit
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={save} className={ROW}>
      <label htmlFor="settings-name" className="text-title font-medium text-ink">
        Display name
      </label>
      <input
        id="settings-name"
        autoFocus
        value={value}
        maxLength={NAME_MAX}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        className={FIELD}
      />
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setEditing(false)} className={TEXT_BUTTON}>
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !value.trim()}
          className={ctaPrimary}
          style={{ background: "var(--ws-color)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <ErrorLine className="col-start-2 col-end-4">{error}</ErrorLine>}
    </form>
  );
}

function PasswordRow({ setting = false, onSaved }: { setting?: boolean; onSaved: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const pw = usePasswordForm(() => {
    setOpen(false);
    onSaved(setting ? "Password set" : "Password updated");
  }, setting);

  const close = () => {
    pw.reset();
    setOpen(false);
  };

  return (
    <div className={`${ROW} pb-5`}>
      <p className="text-title font-medium text-ink">Password</p>
      {setting ? (
        <p className="text-title text-ink-soft">Not set</p>
      ) : (
        <p aria-hidden className="text-title tracking-[0.2em] text-ink">
          ••••••••
        </p>
      )}
      {open ? (
        <span />
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={ROW_BUTTON}>
          {setting ? "Set" : "Change"}
        </button>
      )}

      {open && (
        <form onSubmit={pw.submit} className="col-start-2 col-end-4 mt-4 flex flex-col gap-3">
          {!setting && (
            <input
              type="password"
              aria-label="Current password"
              placeholder="Current password"
              autoComplete="current-password"
              autoFocus
              value={pw.current}
              onChange={(e) => pw.setCurrent(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && close()}
              className={FIELD}
            />
          )}
          <input
            type="password"
            aria-label="New password"
            placeholder={`New password · at least ${PW_MIN} characters`}
            autoComplete="new-password"
            value={pw.next}
            onChange={(e) => pw.setNext(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && close()}
            className={FIELD}
          />
          {/* The comp shows only the length in the placeholder; the number
              rule is the phone sheet's, and one account cannot have two
              policies. So it appears here too — once there is a password to
              hold it against. */}
          {pw.next && <Checks pw={pw.next} />}
          {pw.error && <ErrorLine>{pw.error}</ErrorLine>}
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={close} className={TEXT_BUTTON}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={!pw.valid || pw.saving}
              className={ctaPrimary}
              style={{ background: "var(--ws-color)" }}
            >
              {pw.saving ? "Saving…" : setting ? "Set password" : "Update password"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ phone */

function PhoneAccount({
  identity,
  name,
  hasPassword,
  canSetPassword,
  onSaved,
}: {
  identity: ReactNode;
  name: string;
  hasPassword: boolean;
  canSetPassword: boolean;
  onSaved: (m: string) => void;
}) {
  const [sheet, setSheet] = useState<"name" | "password" | null>(null);
  const close = () => setSheet(null);
  const row =
    "flex min-h-14 w-full items-center gap-3 border-t border-rule text-start text-title text-ink";
  return (
    <>
      <div className={`${CARD} px-5`}>
        <div className="py-5">{identity}</div>
        <button type="button" onClick={() => setSheet("name")} className={row}>
          <span className="flex-1">Display name</span>
          <span className="max-w-[50%] truncate text-ink-soft">{name}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </button>
        {(hasPassword || canSetPassword) && (
          <button type="button" onClick={() => setSheet("password")} className={row}>
            <span className="flex-1">{hasPassword ? "Change password" : "Set a password"}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
          </button>
        )}
      </div>

      {sheet === "name" && (
        <NameSheet
          name={name}
          onClose={close}
          onSaved={() => {
            close();
            onSaved("Name saved");
          }}
        />
      )}
      {sheet === "password" && (
        <PasswordSheet
          setting={!hasPassword}
          onClose={close}
          onSaved={() => {
            close();
            onSaved(hasPassword ? "Password updated" : "Password set");
          }}
        />
      )}
    </>
  );
}

const SHEET_LABEL = "mb-2 block text-sm font-semibold text-ink-soft";
const SHEET_FIELD =
  "h-14 w-full rounded-tile border border-rule bg-card px-4 text-base text-ink outline-none " +
  "focus:border-(--ws-color) focus:ring-3 focus:ring-(--ws-color)/15";

function NameSheet({
  name,
  onClose,
  onSaved,
}: {
  name: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { refresh } = useAuth();
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = value.trim();
  const changed = next !== "" && next !== name;

  const save = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!changed) return;
    setSaving(true);
    setError(null);
    try {
      await updateMe(next);
      await refresh();
      onSaved();
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Display name"
      accent={APP_ACCENT}
      footer={
        <button
          type="button"
          onClick={() => void save()}
          disabled={!changed || saving}
          className={`${ctaPrimary} min-h-14 w-full text-title`}
          style={{ background: "var(--ws-color)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      }
    >
      <form onSubmit={save} className="px-5 pb-4 pt-4">
        <label htmlFor="sheet-name" className={SHEET_LABEL}>
          Display name
        </label>
        <div className="relative">
          <input
            id="sheet-name"
            autoFocus
            value={value}
            maxLength={NAME_MAX}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby="sheet-name-help"
            className={`${SHEET_FIELD} pe-14`}
          />
          {value && (
            <button
              type="button"
              onClick={() => setValue("")}
              aria-label="Clear"
              className="absolute inset-y-0 end-1 flex w-12 items-center justify-center"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-card">
                <CloseIcon className="h-3.5 w-3.5" />
              </span>
            </button>
          )}
        </div>
        <div className="mt-2 flex items-start justify-between gap-3 text-xs text-ink-soft">
          <p id="sheet-name-help">Shown on your notes and in shivir groups.</p>
          <p className="shrink-0 tabular-nums" aria-hidden>
            {value.length}/{NAME_MAX}
          </p>
        </div>
        {error && <ErrorLine className="mt-3">{error}</ErrorLine>}
      </form>
    </Sheet>
  );
}

function PasswordSheet({
  setting = false,
  onClose,
  onSaved,
}: {
  setting?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const pw = usePasswordForm(onSaved, setting);
  const matches = pw.confirm === pw.next;
  // Said once the second copy is as long as the first, not at its first letter.
  const mismatch = !matches && pw.confirm.length >= pw.next.length && pw.confirm !== "";

  return (
    <Sheet
      open
      onClose={onClose}
      title={setting ? "Set a password" : "Change password"}
      accent={APP_ACCENT}
      footer={
        <button
          type="submit"
          form="sheet-password"
          disabled={!pw.valid || !matches || pw.saving}
          className={`${ctaPrimary} min-h-14 w-full text-title`}
          style={{ background: "var(--ws-color)" }}
        >
          {pw.saving ? "Saving…" : setting ? "Set password" : "Update password"}
        </button>
      }
    >
      <form
        id="sheet-password"
        onSubmit={(e) => (matches ? pw.submit(e) : e.preventDefault())}
        className="flex flex-col gap-4 px-5 pb-4 pt-4"
      >
        {!setting && (
          <RevealField
            id="pw-current"
            autoFocus
            label="Current password"
            autoComplete="current-password"
            value={pw.current}
            onChange={pw.setCurrent}
          />
        )}
        <RevealField
          id="pw-new"
          label="New password"
          autoComplete="new-password"
          value={pw.next}
          onChange={pw.setNext}
        />
        <RevealField
          id="pw-confirm"
          label="Confirm new password"
          autoComplete="new-password"
          value={pw.confirm}
          onChange={pw.setConfirm}
          invalid={mismatch}
        />
        {mismatch && <ErrorLine>The two new passwords don&apos;t match.</ErrorLine>}
        <Checks pw={pw.next} />
        {/* The sign-in screen's reset: a code to the account's email. */}
        {!setting && (
          <Link
            href="/forgot-password?next=%2Fsettings"
            className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-accent-ink"
          >
            Forgot current password?
          </Link>
        )}
        {pw.error && <ErrorLine>{pw.error}</ErrorLine>}
      </form>
    </Sheet>
  );
}

function RevealField({
  id,
  label,
  autoComplete,
  value,
  onChange,
  invalid,
  autoFocus,
}: {
  id: string;
  autoFocus?: boolean;
  label: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={SHEET_LABEL}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          value={value}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`${SHEET_FIELD} pe-20 ${invalid ? "border-danger" : ""}`}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-label={`${shown ? "Hide" : "Show"} ${label.toLowerCase()}`}
          className="absolute inset-y-0 end-1 flex min-w-16 items-center justify-center px-3 text-sm font-semibold text-ink-soft"
        >
          {shown ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- shared */

/** `setting`: a first password, for a reader who has none — no old one asked. */
function usePasswordForm(onDone: () => void, setting = false) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = (setting || current !== "") && passwordChecks(next).every((c) => c.ok);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const res = setting ? await setPassword(next) : await changePassword(current, next);
      if (res.status === 200) {
        reset();
        onDone();
      } else {
        setError(
          res.errors?.[0]?.message ??
            "Couldn't change it — check your current password, and pick a longer new one."
        );
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return { current, setCurrent, next, setNext, confirm, setConfirm, saving, error, valid, reset, submit };
}

function Checks({ pw }: { pw: string }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {passwordChecks(pw).map((c) => (
        <li key={c.label} className={`flex items-center gap-2.5 text-sm ${c.ok ? "text-success" : "text-ink-soft"}`}>
          <span
            aria-hidden
            className={`flex h-5 w-5 items-center justify-center rounded-full ${
              c.ok ? "bg-success text-card" : "bg-ink/10 text-card"
            }`}
          >
            <CheckIcon className="h-3 w-3" />
          </span>
          {c.label}
          <span className="sr-only">{c.ok ? "— done" : "— not yet"}</span>
        </li>
      ))}
    </ul>
  );
}

function ErrorLine({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p role="alert" className={`text-sm text-danger ${className}`}>
      {children}
    </p>
  );
}
