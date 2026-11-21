"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { clearConversations, hasConversations } from "@/lib/assistant/conversations";
import {
  ACCOUNT_DELETED,
  SESSION_ENDED_KEY,
  deleteAccount as apiDeleteAccount,
  getMe,
  logout as apiLogout,
} from "@/lib/me";
import {
  announceSync,
  flushPersonal,
  hasUnsyncedPersonal,
  syncPersonal,
  watchConnectivity,
} from "@/lib/personal";
import { adoptLocalProfile } from "@/lib/profile";
import { clearLocalStore } from "@/lib/storage";
import type { MeUser } from "@/lib/types";

interface AuthState {
  user: MeUser | null;
  /** true until the first session check completes */
  loading: boolean;
  refresh: () => Promise<MeUser | null>;
  /** called after a successful login/signup: merge guest data, then refresh */
  onAuthenticated: () => Promise<void>;
  /** `false` when the reader chose to stay signed in (unsent work, offline) */
  logout: () => Promise<boolean>;
  /**
   * Delete the account for good (contract §6.4). Throws what the server said,
   * so the sheet can show it; on success this device is wiped as on sign-out.
   */
  deleteAccount: (password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  refresh: async () => null,
  onAuthenticated: async () => {},
  logout: async () => false,
  deleteAccount: async () => {},
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    let me = await getMe();
    // Answers kept on this device before the server had a contact card go up
    // once, so the welcome step does not ask for them again (lib/profile).
    if (me) me = (await adoptLocalProfile(me)) ?? me;
    setUser(me);
    setLoading(false);
    // Covers the Google-redirect return path too. Whatever was saved while
    // signed out is already in the local store, so this one call is both the
    // merge and the pull — there is no separate migration step (lib/personal).
    if (me) void syncPersonal();
    return me;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // pending writes go up as soon as the network returns. The listener outlives
  // any one render, so it reads the current user through a ref rather than
  // being torn down and rebuilt on every sign-in.
  const userRef = useRef<MeUser | null>(null);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  useEffect(() => watchConnectivity(() => userRef.current !== null), []);

  // Offline, the user above may be the copy cached on this device (lib/me).
  // Ask the server again once the network is back, so a session revoked
  // elsewhere still ends and the profile is current.
  useEffect(() => {
    const onOnline = () => {
      if (userRef.current) void refresh();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh]);

  const onAuthenticated = useCallback(async () => {
    await refresh();
  }, [refresh]);

  /** Leave nothing of the reader on this device — sign-out and deletion alike. */
  const forgetDevice = useCallback(() => {
    setUser(null);
    // The rows belong to the account, not the device. Leaving them behind
    // would show one person's bookmarks to whoever reads next on a shared
    // phone — and they are safe on the server either way.
    clearLocalStore();
    // Device-only, so not the account's to keep: see the warning in logout.
    clearConversations();
    // Anything already on screen — the reader's painted lines, an open
    // list — re-reads the now-empty store instead of showing the last
    // reader's highlights until a reload.
    announceSync();
  }, []);

  const logout = useCallback(async () => {
    // Last chance to push anything still pending, while the cookie is valid —
    // and a fresh sweep, not one already running, which would have missed the
    // highlight made a second ago.
    const pushed = await flushPersonal().catch(() => false);
    // The store is about to be wiped. If something on it never reached the
    // account (offline, usually), wiping it loses it for good, so ask.
    //
    // The Assistant's conversations go with it (UX audit ST7), and they never
    // reach an account at all — there is nowhere on the server to put them — so
    // they are always "not there yet", and one message covers both.
    const unsynced = !pushed && hasUnsyncedPersonal();
    const conversations = hasConversations();
    if (unsynced || conversations) {
      const lines = [
        unsynced
          ? "Some of your highlights or notes haven’t reached your account yet — you may be offline."
          : null,
        conversations
          ? "Your Assistant conversations and saved research are kept on this device only, not on your account."
          : null,
      ].filter(Boolean);
      if (
        !window.confirm(
          `${lines.join(" ")}\n\nSigning out now removes them from this device. Sign out anyway?`
        )
      ) {
        return false;
      }
    }
    try {
      await apiLogout();
    } finally {
      forgetDevice();
    }
    return true;
  }, [forgetDevice]);

  const deleteAccount = useCallback(
    async (password?: string) => {
      // No flush first, unlike sign-out: whatever is pending is about to be
      // deleted along with the account it would have gone to.
      await apiDeleteAccount(password);
      // Said once on the next screen, so the reader knows it went through.
      // Set before the wipe: Profile reads it to send the reader home rather
      // than to Sign in, the moment it sees them signed out.
      try {
        localStorage.setItem(SESSION_ENDED_KEY, ACCOUNT_DELETED);
      } catch {
        // blocked storage: deleted without the note
      }
      forgetDevice();
    },
    [forgetDevice]
  );

  return (
    <AuthContext.Provider value={{ user, loading, refresh, onAuthenticated, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}
