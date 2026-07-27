"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getMe, logout as apiLogout, mergeGuestData } from "@/lib/me";
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
    if (me) {
      // covers the Google-redirect return path too: mergeGuestData no-ops
      // when there is no local data, and clears local after a merge
      void mergeGuestData().catch(() => undefined);
    }
    return me;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onAuthenticated = useCallback(async () => {
    // guest→login merge: union by canonical_ref, server wins, clear local
    try {
      await mergeGuestData();
    } catch {
      // merge is best-effort; server data remains authoritative
    }
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh, onAuthenticated, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
