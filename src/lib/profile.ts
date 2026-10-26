/**
 * The reader's "A little about you" answers — the first of the two questions
 * asked straight after signing in (the second is the journey stage).
 *
 * **The server holds them** (`/me/`'s `profile`, API contract §6): name,
 * mobile, email, state, city and the WhatsApp-updates opt-in, so they follow
 * the reader to every device and "answered" is an account fact, not a device
 * one. The email or number the reader signs in with is on the card too, and
 * `locked` there: shown, never editable here.
 *
 * **The device store below is the past and a fallback.** Before the server
 * had these fields they were kept in localStorage (`md.profile.v1`), keyed by
 * account. Two things still read it:
 *
 *  - `adoptLocalProfile` — once, on the first sign-in against a server that
 *    has the card, a reader's old answers are sent up and the device copy is
 *    dropped, so nobody is asked again for what they already told us;
 *  - a server older than the card (no `profile` on `/me/`) — everything works
 *    as it did, on this device, until the BE is deployed.
 *
 * Kept apart from `clearLocalStore` on purpose: signing out must not lose
 * answers that have not reached the server yet. Keyed by account, so one
 * reader's answers are never shown to another on a shared device.
 */

import { updateMe, updateProfile, type ProfilePatch } from "./me";
import type { MeUser } from "./types";

const PROFILE_KEY = "md.profile.v1";

/** sessionStorage: the profile step has been answered and the stage is next */
const ASK_STAGE_KEY = "md.askStage";

export interface ReaderProfile {
  name: string;
  /** ten digits, without the +91 */
  mobile: string;
  state: string;
  city: string;
  /** where to reach the reader — for a mobile sign-in, their only email */
  email?: string;
  /** "Send me updates on WhatsApp" — asked, never assumed */
  updates_opt_in?: boolean;
  /** device store only: when it was answered */
  saved_at?: string;
}

/** What the reader types — a profile before it is stamped. */
export type ProfileValues = Omit<ReaderProfile, "saved_at">;

/** The card's fields the reader signs in with, which only show here. */
export type LockedField = "mobile" | "email";

type Store = Record<string, ReaderProfile>;

function accountKey(user: MeUser): string | null {
  const key = user.id ?? user.email ?? user.phone;
  return key ? String(key) : null;
}

function readStore(): Store {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}") as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(store));
  } catch {
    // storage full or blocked — the reader is asked again next time, no worse
  }
}

/** "+919876543210" → "9876543210"; anything else as it came. */
function tenDigits(phone: string): string {
  return /^\+91(\d{10})$/.exec(phone)?.[1] ?? phone;
}

/** The reader's details: the server's card, else this device's answers. */
export function profileFor(user: MeUser): ReaderProfile | null {
  const card = user.profile;
  if (card) {
    return {
      name: card.name,
      mobile: tenDigits(card.mobile),
      email: card.email,
      state: card.state,
      city: card.city,
      updates_opt_in: card.updates_opt_in,
    };
  }
  const key = accountKey(user);
  return key ? (readStore()[key] ?? null) : null;
}

/** Whether "A little about you" has been answered — on any device, when the
 * server knows; on this one, when it does not yet. */
export function profileDone(user: MeUser): boolean {
  return user.profile ? user.profile.complete : profileFor(user) !== null;
}

export function lockedFields(user: MeUser): LockedField[] {
  return user.profile?.locked ?? [];
}

function toPatch(values: ProfileValues): ProfilePatch {
  const patch: ProfilePatch = {
    name: values.name.trim(),
    mobile: values.mobile,
    state: values.state,
    city: values.city.trim(),
  };
  if (values.email !== undefined) patch.email = values.email.trim();
  if (values.updates_opt_in !== undefined) patch.updates_opt_in = values.updates_opt_in;
  return patch;
}

/**
 * Save the answers to the reader's card. Against a server older than the
 * card, the name goes to the account and the rest stays on this device, as
 * before. Throws when the server refuses, so the form can say so.
 */
export async function storeProfile(user: MeUser, values: ProfileValues): Promise<void> {
  const patch = toPatch(values);
  if (user.profile) {
    await updateProfile(patch);
    return;
  }
  const name = patch.name ?? "";
  if (name !== (user.name ?? "").trim()) await updateMe(name);
  const key = accountKey(user);
  if (!key) return;
  const store = readStore();
  store[key] = { ...values, ...patch, name, saved_at: new Date().toISOString() } as ReaderProfile;
  writeStore(store);
}

/**
 * Move this device's old answers onto the server's card, once.
 *
 * Only into a card that has none of its own — where the server already knows
 * the reader's state or city, it is the newer word and the device copy just
 * goes. Locked fields are left out: they are the sign-in, which the server
 * already holds. Answers the server refuses (a malformed number from before
 * any check) are dropped too, since sending them again cannot succeed; a
 * network failure keeps them for the next sign-in.
 *
 * Resolves to the updated `/me/` when something was sent, else null.
 */
export async function adoptLocalProfile(user: MeUser): Promise<MeUser | null> {
  const card = user.profile;
  const key = accountKey(user);
  if (!card || !key) return null;
  const store = readStore();
  const local = store[key];
  if (!local) return null;

  const drop = () => {
    delete store[key];
    writeStore(store);
  };
  if (card.complete || card.state || card.city) {
    drop();
    return null;
  }

  const patch = toPatch(local);
  for (const field of card.locked) delete patch[field];
  if (!patch.name) delete patch.name;
  try {
    const me = await updateProfile(patch);
    drop();
    return me;
  } catch (e) {
    if ((e as { status?: number }).status === 400) drop();
    return null;
  }
}

/** Step 1 is done: open the journey question on the next ordinary screen. */
export function askForStage(): void {
  try {
    sessionStorage.setItem(ASK_STAGE_KEY, "1");
  } catch {
    // no session storage — the journey page still asks on its own
  }
}

export function stageAsked(): boolean {
  try {
    return sessionStorage.getItem(ASK_STAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearStageAsk(): void {
  try {
    sessionStorage.removeItem(ASK_STAGE_KEY);
  } catch {
    // nothing to clear
  }
}

/**
 * Every state and union territory, for the profile's State field.
 *
 * Held here although the Connect directory says not to hold a list of states
 * in the FE: that rule is about the directory's sheet, which must only list
 * states that have somebody in them. This asks where the *reader* lives, and
 * they can live anywhere.
 */
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

/** Last in the list, for readers outside India. */
export const OUTSIDE_INDIA = "Outside India";
