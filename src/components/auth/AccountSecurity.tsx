"use client";

// Display name and password, for a signed-in reader.
//
// Changing the password takes the *old* password rather than mailing a link.
// That is not a shortcut around the usual reset flow — it is the reason there
// is a working one at all: no mail server is configured yet, and a reset link
// that never arrives is worse than no button. A reader who has genuinely
// forgotten their password is reset by a manager until SMTP is switched on,
// at which point the link flow can be added alongside this without replacing
// it (changing a known password is a normal thing to want either way).

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ctaPrimary } from "@/components/ui";
import { changePassword, updateMe } from "@/lib/me";

type Status = { kind: "ok" | "error"; message: string } | null;

export function AccountSecurity() {
  const { user, refresh } = useAuth();

  // The field seeds from the account and is the reader's to edit thereafter.
  // Adjusting it during render — rather than in an effect — keeps a freshly
  // loaded profile from flashing an empty box first, and re-seeds it if the
  // account underneath changes (sign out, sign in as someone else).
  const serverName = (user?.name as string) ?? "";
  const [name, setName] = useState(serverName);
  const [seededFrom, setSeededFrom] = useState(serverName);
  if (seededFrom !== serverName) {
    setSeededFrom(serverName);
    setName(serverName);
  }
  const [nameStatus, setNameStatus] = useState<Status>(null);
  const [savingName, setSavingName] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwStatus, setPwStatus] = useState<Status>(null);
  const [savingPw, setSavingPw] = useState(false);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    setNameStatus(null);
    try {
      await updateMe(name.trim());
      await refresh();
      setNameStatus({ kind: "ok", message: "Name saved." });
    } catch {
      setNameStatus({ kind: "error", message: "Couldn't save. Please try again." });
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPw(true);
    setPwStatus(null);
    try {
      const res = await changePassword(current, next);
      if (res.status === 200) {
        setCurrent("");
        setNext("");
        setPwStatus({ kind: "ok", message: "Password changed. Other devices stay signed in." });
      } else {
        setPwStatus({
          kind: "error",
          message:
            res.errors?.[0]?.message ??
            "Couldn't change it — check your current password, and pick a longer new one.",
        });
      }
    } catch {
      setPwStatus({ kind: "error", message: "Couldn't reach the server. Please try again." });
    } finally {
      setSavingPw(false);
    }
  };

  const field =
    "mt-1 w-full rounded-xl border border-rule bg-card p-2.5 text-sm outline-none focus:border-(--ws-color)";
  const button = `mt-2 self-start ${ctaPrimary}`;

  return (
    <div className="mt-3 space-y-3">
      <form onSubmit={saveName} className="flex flex-col rounded-2xl border border-rule bg-card p-4">
        <label className="text-sm font-medium">
          Display name
          <input
            type="text"
            value={name}
            maxLength={80}
            placeholder="How you'd like to be addressed"
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </label>
        <Notice status={nameStatus} />
        <button type="submit" disabled={savingName} className={button} style={{ background: "var(--ws-color)" }}>
          {savingName ? "Saving…" : "Save name"}
        </button>
      </form>

      <form onSubmit={savePassword} className="flex flex-col rounded-2xl border border-rule bg-card p-4">
        <p className="text-sm font-medium">Change password</p>
        <label className="mt-2 text-sm">
          Current password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={field}
          />
        </label>
        <label className="mt-2 text-sm">
          New password
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={field}
          />
        </label>
        <Notice status={pwStatus} />
        <button type="submit" disabled={savingPw} className={button} style={{ background: "var(--ws-color)" }}>
          {savingPw ? "Changing…" : "Change password"}
        </button>
      </form>
    </div>
  );
}

function Notice({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p
      role={status.kind === "error" ? "alert" : "status"}
      className={`mt-2 rounded-xl px-3 py-2 text-sm ${
        status.kind === "error" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800"
      }`}
    >
      {status.message}
    </p>
  );
}
