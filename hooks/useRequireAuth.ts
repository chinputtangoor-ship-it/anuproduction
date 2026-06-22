"use client";

import { useAuth } from "@/lib/auth/AuthProvider";
import type { SessionUser } from "@/lib/auth/types";

type RequireAuthResult = {
  user: SessionUser | null;
  loading: boolean;
};

/** Returns the current session user once auth state is ready. Redirects are handled by AuthProvider. */
export function useRequireAuth(): RequireAuthResult {
  const { user, loading } = useAuth();
  return { user, loading };
}
