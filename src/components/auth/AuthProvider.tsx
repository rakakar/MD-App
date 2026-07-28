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
import { syncPersonal, watchConnectivity } from "@/lib/personal";
import { clearLocalStore } from "@/lib/storage";
import type { MeUser } from "@/lib/types";

interface AuthState {
  user: MeUser | null;
  /** true until the first session check completes */
  loading: boolean;
  refresh: () => Promise<MeUser | null>;
  /** called after a successful login/signup: merge guest data, then refresh */
  onAuthenticated: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  refresh: async () => null,
  onAuthenticated: async () => {},
  logout: async () => {},
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const me = await getMe();
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

  const onAuthenticated = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      // last chance to push anything still pending, while the cookie is valid
      await syncPersonal();
    } catch {
      // best effort — the server copy is the one that survives a sign-out
    }
    try {
      await apiLogout();
    } finally {
      setUser(null);
      // The rows belong to the account, not the device. Leaving them behind
      // would show one person's bookmarks to whoever reads next on a shared
      // phone — and they are safe on the server either way.
      clearLocalStore();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, onAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
