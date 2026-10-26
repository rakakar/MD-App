/**
 * The reader's "A little about you" answers — the first of the two questions
 * asked straight after signing in (the second is the journey stage).
 *
 * **Name goes to the server; the rest stays on this device for now.** The BE's
 * `PATCH /me/` accepts `name` and nothing else (API contract §6), so mobile,
 * state and city are kept here, keyed by account, until it grows fields for
 * them. That is also why "done" is a per-device fact today: a reader who signs
 * in on a second phone is asked again. The day `/me/` returns these fields,
 * `profileFor` should read them from the user and this store can go.
 *
 * Kept apart from `clearLocalStore` on purpose: signing out must not mean
 * being asked the same four questions on the next sign-in. Keyed by account,
 * so one reader's answers are never shown to another on a shared device.
 */

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
  saved_at: string;
}

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

export function profileFor(user: MeUser): ReaderProfile | null {
  const key = accountKey(user);
  return key ? (readStore()[key] ?? null) : null;
}

export function saveProfile(user: MeUser, profile: Omit<ReaderProfile, "saved_at">): void {
  const key = accountKey(user);
  if (!key) return;
  try {
    const store = readStore();
    store[key] = { ...profile, saved_at: new Date().toISOString() };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(store));
  } catch {
    // storage full or blocked — the reader is asked again next time, no worse
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
