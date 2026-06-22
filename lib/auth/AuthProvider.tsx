"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessRoute } from "@/lib/auth/roles";
import { profileToSessionUser, PROFILE_SELECT } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/client";
import type { SessionUser } from "@/lib/auth/types";

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      setUser(null);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", authUser.id)
      .single();

    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      setUser(null);
      return;
    }

    setUser(profileToSessionUser(profile));
  }, [supabase]);

  useEffect(() => {
    refresh().finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });

    return () => subscription.unsubscribe();
  }, [refresh, supabase]);

  useEffect(() => {
    if (loading || pathname === "/login") return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!canAccessRoute(user.role, pathname)) {
      router.replace("/dashboard");
    }
  }, [user, loading, pathname, router]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
  }, [router, supabase]);

  const value = useMemo(
    () => ({ user, loading, logout, refresh }),
    [user, loading, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
