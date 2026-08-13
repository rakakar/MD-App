"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { track } from "@/lib/analytics";
import { registerForEvent } from "@/lib/api";
import { ctaPrimary } from "@/components/ui";

type Status = "idle" | "busy" | "done" | "duplicate" | "error";

/**
 * Event registration (PRD §8): anonymous allowed, login optional. Guests get
 * a minimal name + phone/email form; logged-in users get it prefilled.
 * Success, duplicate and error states are all explicit.
 */
export function RegisterForm({ eventId, open }: { eventId: number; open: boolean }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [prefilled, setPrefilled] = useState(false);

  if (user && !prefilled) {
    setPrefilled(true);
    if (!email && typeof user.email === "string") setEmail(user.email);
    if (!name && typeof user.name === "string") setName(user.name);
  }

  if (!open) {
    return (
      <p className="rounded-xl bg-ink/[.04] px-4 py-3 text-sm text-ink-soft">
        Registration is closed for this event.
      </p>
    );
  }

  if (status === "done") {
    return (
      <div role="status" className="rounded-xl border border-rule bg-card px-4 py-4 text-center">
        <p className="text-sm font-semibold" style={{ color: "var(--ws-ink)" }}>
          You&apos;re registered ✓
        </p>
        <p className="mt-1 text-xs text-ink-soft">We look forward to seeing you.</p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("busy");
    try {
      await registerForEvent(eventId, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      track("event_register", { auth: user ? "logged_in" : "guest" });
      setStatus("done");
    } catch (err) {
      const status = (err as { status?: number }).status;
      setStatus(status === 409 || status === 400 ? "duplicate" : "error");
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <label className="text-sm font-medium">
        Name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          className="mt-1 w-full rounded-xl border border-rule bg-card p-2.5 text-sm outline-none focus:border-(--ws-color)"
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Phone
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            className="mt-1 w-full rounded-xl border border-rule bg-card p-2.5 text-sm outline-none focus:border-(--ws-color)"
          />
        </label>
        <label className="text-sm font-medium">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="mt-1 w-full rounded-xl border border-rule bg-card p-2.5 text-sm outline-none focus:border-(--ws-color)"
          />
        </label>
      </div>
      <p className="text-xs text-ink-soft">Phone or email — at least one, so we can confirm.</p>

      {status === "duplicate" && (
        <p role="alert" className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Looks like you&apos;re already registered for this event.
        </p>
      )}
      {status === "error" && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          Registration failed — please try again in a moment.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "busy" || (!phone.trim() && !email.trim())}
        className={`mt-1 ${ctaPrimary}`}
        style={{ background: "var(--ws-color)" }}
      >
        {status === "busy" ? "Registering…" : "Register"}
      </button>
    </form>
  );
}
