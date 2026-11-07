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
import { getMe, logout as apiLogout } from "@/lib/me";
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
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  refresh: async () => null,
  onAuthenticated: async () => {},
  logout: async () => false,
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

  const logout = useCallback(async () => {
    // Last chance to push anything still pending, while the cookie is valid —
    // and a fresh sweep, not one already running, which would have missed the
    // highlight made a second ago.
    const pushed = await flushPersonal().catch(() => false);
    // The store is about to be wiped. If something on it never reached the
    // account (offline, usually), wiping it loses it for good, so ask.
    if (
      !pushed &&
      hasUnsyncedPersonal() &&
      !window.confirm(
        "Some of your highlights or notes haven't reached your account yet — you may be offline.\n\nSigning out now removes them from this device. Sign out anyway?"
      )
    ) {
      return false;
    }
    try {
      await apiLogout();
    } finally {
      setUser(null);
      // The rows belong to the account, not the device. Leaving them behind
      // would show one person's bookmarks to whoever reads next on a shared
      // phone — and they are safe on the server either way.
      clearLocalStore();
      // Anything already on screen — the reader's painted lines, an open
      // list — re-reads the now-empty store instead of showing the last
      // reader's highlights until a reload.
      announceSync();
    }
    return true;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, onAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
