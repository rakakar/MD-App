"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CodeEntry } from "@/components/auth/CodeEntry";
import { Sheet } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { confirmVerify, displayPhone, requestVerify, verifyErrorOf } from "@/lib/me";
import { APP_ACCENT } from "@/lib/workspaceConfig";

/**
 * Verify the contact a reader did *not* sign up with — the email on a mobile
 * reader's card, the mobile on an email reader's. A code goes to it as the
 * sheet opens; once entered, it is theirs and a second way to sign in
 * (contract §6.3). A sheet on a phone, a dialog at a desk, as Edit is.
 */
export function VerifyContact({
  open,
  desktop,
  channel,
  value,
  onClose,
  onVerified,
}: {
  open: boolean;
  desktop: boolean;
  channel: "email" | "mobile";
  /** an email, or "+91…" */
  value: string;
  onClose: () => void;
  onVerified: () => void;
}) {
  const { refresh } = useAuth();
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const asked = useRef(false);

  const send = async (): Promise<string | null> => {
    try {
      await requestVerify(channel, value);
      setSent(true);
      return null;
    } catch (e) {
      const err = verifyErrorOf(e);
      if (err.code === "too_soon") {
        setSent(true);
        return null;
      }
      return err.message;
    }
  };

  // Mounted per verification (the caller renders it while one is open), so
  // "once" is once per opening.
  useEffect(() => {
    if (!open || asked.current) return;
    asked.current = true;
    void send().then(setSendError);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per opening
  }, [open]);

  const confirm = async (code: string): Promise<string | null> => {
    try {
      await confirmVerify(channel, code);
      await refresh();
      onVerified();
      return null;
    } catch (e) {
      return verifyErrorOf(e).message;
    }
  };

  const title = channel === "email" ? "Verify email" : "Verify mobile number";
  const shown = channel === "email" ? value : displayPhone(value);

  const body = (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        Once verified, you can also sign in with this {channel === "email" ? "email" : "number"}.
      </p>
      {sendError && (
        <p role="alert" className="rounded-tile border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {sendError}
        </p>
      )}
      {sent && (
        <CodeEntry
          idPrefix={`verify-${channel}`}
          sentTo={shown}
          via={channel === "email" ? "email" : "whatsapp"}
          onSubmit={confirm}
          onResend={send}
        />
      )}
    </div>
  );

  if (desktop) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
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
    <Sheet open={open} onClose={onClose} title={title} accent={APP_ACCENT}>
      <div className="px-5 pb-6 pt-1">{body}</div>
    </Sheet>
  );
}
