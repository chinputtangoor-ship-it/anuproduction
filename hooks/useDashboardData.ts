"use client";

import useSWR from "swr";
import { fetchDeptDashboardBundle, fetchDashboardPlans } from "@/lib/data/dashboard";
import { useFeatureFlag } from "@/lib/features/FeatureFlagsProvider";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";
import { useAuth } from "@/lib/auth/AuthProvider";

export const DASHBOARD_BUNDLE_KEY = "dashboard:bundle";
export const DASHBOARD_PLANS_KEY = "dashboard:plans";

export function useDashboardBundle() {
  const { user, loading: authLoading } = useAuth();
  const swrEnabled = useFeatureFlag("swr_client_cache");
  const realtimeOn = useFeatureFlag("realtime");

  const swr = useSWR(
    !authLoading && user ? DASHBOARD_BUNDLE_KEY : null,
    fetchDeptDashboardBundle,
    {
      revalidateOnFocus: true,
      keepPreviousData: swrEnabled,
      revalidateIfStale: true,
    },
  );

  useRealtimeTables({
    enabled: realtimeOn && !!user,
    tables: ["boxes", "production_plan", "rejection"],
    onEvent: () => {
      void swr.mutate();
    },
  });

  return swr;
}

export function useDashboardPlans() {
  const { user, loading: authLoading } = useAuth();
  const swrEnabled = useFeatureFlag("swr_client_cache");
  const realtimeOn = useFeatureFlag("realtime");

  const swr = useSWR(
    !authLoading && user ? DASHBOARD_PLANS_KEY : null,
    fetchDashboardPlans,
    {
      revalidateOnFocus: true,
      keepPreviousData: swrEnabled,
    },
  );

  useRealtimeTables({
    enabled: realtimeOn && !!user,
    tables: ["production_plan"],
    onEvent: () => {
      void swr.mutate();
    },
  });

  return swr;
}
