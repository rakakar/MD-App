"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  ProfileFields,
  fieldErrorsOf,
  profileReady,
  type FieldErrors,
  type ProfileField,
} from "@/components/auth/ProfileFields";
import { Sheet, ctaPrimary } from "@/components/ui";
import { Dialog } from "@/components/ui/Dialog";
import { lockedFields, storeProfile, type ProfileValues, type ReaderProfile } from "@/lib/profile";
import { APP_ACCENT } from "@/lib/workspaceConfig";
import type { MeUser } from "@/lib/types";

/**
 * Edit personal details — the profile fields in a sheet on a phone and a
 * dialog at a desk. The Profile page edits all five; Settings edits mobile,
 * email, state, city and the WhatsApp-updates opt-in (its Account card
 * already has the name). The email or number the reader signs in with shows
 * read-only (`lockedFields`).
 *
 * Unlike the sign-in step, a field may be left empty here — only what is
 * typed must be whole (see `profileReady`).
 */
export function EditProfile({
  open,
  desktop,
  user,
  profile,
  fields,
  title = "Personal details",
  onClose,
  onSaved,
}: {
  open: boolean;
  desktop: boolean;
  user: MeUser;
  profile: ReaderProfile | null;
  fields: ProfileField[];
  title?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { refresh } = useAuth();
  const [values, setValues] = useState<ProfileValues>(() => initialValues(user, profile));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Fresh from what is saved each time it opens — not what was typed and
  // abandoned last time.
  useEffect(() => {
    if (open) {
      setValues(initialValues(user, profile));
      setError(null);
      setFieldErrors({});
    }
  }, [open, user, profile]);

  const ready = profileReady(values, fields);

  const save = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await storeProfile(user, values);
      await refresh();
      onSaved();
    } catch (err) {
      const byField = fieldErrorsOf(err);
      if (byField) setFieldErrors(byField);
      else setError("Couldn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const formId = `edit-profile-${fields.join("-")}`;

  const saveButton = (
    <button
      type="submit"
      form={formId}
      disabled={!ready || busy}
      className={`${ctaPrimary} min-h-12 w-full lg:w-auto lg:px-7`}
      style={{ background: "var(--ws-color)" }}
    >
      {busy ? "Saving…" : "Save"}
    </button>
  );

  const form = (
    <form
      id={formId}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <ProfileFields
        value={values}
        onChange={setValues}
        fields={fields}
        split={desktop}
        idPrefix={formId}
        locked={lockedFields(user)}
        errors={fieldErrors}
      />
      {error && (
        <p role="alert" className="mt-4 rounded-tile border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );

  if (desktop) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        label={title}
        accent={APP_ACCENT}
        className="w-full max-w-xl rounded-hero bg-card p-8 shadow-raised"
      >
        <h2 className="font-display text-2xl font-medium text-ink">{title}</h2>
        <div className="mt-6">{form}</div>
        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 shrink-0 items-center rounded-control border border-rule bg-card px-4 text-sm font-semibold text-ink transition-colors hover:bg-inset"
          >
            Cancel
          </button>
          {saveButton}
        </div>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onClose={onClose} title={title} accent={APP_ACCENT} footer={saveButton}>
      <div className="px-5 pb-4 pt-1">{form}</div>
    </Sheet>
  );
}

function initialValues(user: MeUser, profile: ReaderProfile | null): ProfileValues {
  const fromPhone = /^\+91(\d{10})$/.exec((user.phone as string | undefined) ?? "")?.[1] ?? "";
  return {
    name: ((user.name as string | undefined) || (user.first_name as string | undefined) || profile?.name || "").trim(),
    mobile: profile?.mobile || fromPhone,
    email: profile?.email ?? ((user.email as string | undefined) || ""),
    state: profile?.state ?? "",
    city: profile?.city ?? "",
    updates_opt_in: profile?.updates_opt_in ?? false,
  };
}
