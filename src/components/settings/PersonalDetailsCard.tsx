"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { EditProfile } from "@/components/profile/EditProfile";
import { displayPhone } from "@/lib/me";
import { profileFor, type ReaderProfile } from "@/lib/profile";
import type { ProfileField } from "@/components/auth/ProfileFields";
import { CARD, SettingsSection } from "./parts";

const FIELDS: ProfileField[] = ["mobile", "email", "state", "city", "updates"];

/**
 * **Personal details** in Settings — mobile, email, state, city and the
 * WhatsApp-updates opt-in, the answers to "A little about you", editable any
 * time.
 *
 * The sign-in step asks for them once, on a new account; this is where they
 * change after that (as on the Profile page). The name stays in the Account
 * card above, where it always was.
 *
 * They are the server's contact card (`/me/`'s `profile`, via
 * `lib/profile.ts`). The email or number the reader signs in with is on it
 * and shows read-only in the editor; the other one is theirs to add.
 *
 * Renders nothing signed out — there is no account to describe.
 */
export function PersonalDetailsSection({
  desktop,
  onSaved,
}: {
  desktop: boolean;
  onSaved: (message: string) => void;
}) {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<ReaderProfile | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user) setProfile(profileFor(user));
  }, [user]);

  if (loading || !user) return null;

  const phone = (user.phone as string | undefined) ?? "";
  const mobile = profile?.mobile ? `+91${profile.mobile}` : phone;
  const email = profile?.email ?? ((user.email as string | undefined) || "");

  return (
    <SettingsSection
      id="personal"
      title="Personal details"
      action={
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={
            desktop
              ? "inline-flex min-h-11 items-center rounded-control border border-rule bg-card px-4 text-sm font-semibold text-ink transition-colors hover:bg-inset"
              : "inline-flex min-h-11 items-center px-1 text-sm font-semibold text-accent-ink"
          }
        >
          Edit
        </button>
      }
    >
      <dl className={`${CARD} divide-y divide-rule ${desktop ? "px-7" : "px-5"}`}>
        <Row desktop={desktop} label="Mobile number">
          {mobile ? displayPhone(mobile) : null}
        </Row>
        <Row desktop={desktop} label="Email">
          {email || null}
        </Row>
        <Row desktop={desktop} label="State">
          {profile?.state || null}
        </Row>
        <Row desktop={desktop} label="City">
          {profile?.city || null}
        </Row>
        <Row desktop={desktop} label="WhatsApp updates">
          {profile?.updates_opt_in ? "On" : "Off"}
        </Row>
      </dl>

      <EditProfile
        open={editing}
        desktop={desktop}
        user={user}
        profile={profile}
        fields={FIELDS}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setProfile(profileFor(user));
          setEditing(false);
          onSaved("Details saved");
        }}
      />
    </SettingsSection>
  );
}

/** Label | value at a desk, as the Account card's rows; label over value on a phone. */
function Row({ desktop, label, children }: { desktop: boolean; label: string; children: ReactNode }) {
  const value = children ?? <span className="text-ink-soft">Not added</span>;
  return desktop ? (
    <div className="grid grid-cols-[11rem_minmax(0,1fr)] items-center gap-x-4 py-4">
      <dt className="text-title font-medium text-ink">{label}</dt>
      <dd className="min-w-0 break-words text-title text-ink-soft">{value}</dd>
    </div>
  ) : (
    <div className="py-3.5">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="mt-0.5 min-w-0 break-words text-title text-ink">{value}</dd>
    </div>
  );
}
