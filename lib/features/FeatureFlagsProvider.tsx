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
import { fetchFeatureFlagMap } from "@/lib/features/load-flags";
import {
  defaultFlagMap,
  type FeatureFlagKey,
} from "@/lib/features/registry";
import { useAuth } from "@/lib/auth/AuthProvider";

type FeatureFlagsContextValue = {
  flags: Record<FeatureFlagKey, boolean>;
  loading: boolean;
  isEnabled: (key: FeatureFlagKey) => boolean;
  refresh: () => Promise<void>;
};

const FeatureFlagsContext = createContext<FeatureFlagsContextValue>({
  flags: defaultFlagMap(),
  loading: true,
  isEnabled: () => false,
  refresh: async () => {},
});

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [flags, setFlags] = useState(defaultFlagMap);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setFlags(defaultFlagMap());
      return;
    }
    const next = await fetchFeatureFlagMap();
    setFlags(next);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    refresh().finally(() => setLoading(false));
  }, [authLoading, refresh]);

  const value = useMemo(
    () => ({
      flags,
      loading,
      isEnabled: (key: FeatureFlagKey) => flags[key] === true,
      refresh,
    }),
    [flags, loading, refresh],
  );

  return (
    <FeatureFlagsContext.Provider value={value}>{children}</FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const { isEnabled } = useFeatureFlags();
  return isEnabled(key);
}
