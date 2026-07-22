"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import useSWR from "swr";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  canAccessPathWithGrants,
  canEditAccess,
  canReadAccess,
  resolveAllAccess,
  resolveMenuAccess,
  type AccessGrantRow,
} from "@/lib/auth/access";
import { fetchAccessGrants } from "@/lib/data/access-grants";
import type { AccessLevel, MenuKey } from "@/lib/auth/menu-catalog";
import { menuKeyForPath } from "@/lib/auth/menu-catalog";
import { useFeatureFlag } from "@/lib/features/FeatureFlagsProvider";

const ACCESS_KEY = "access:grants";

type AccessContextValue = {
  grants: AccessGrantRow[];
  loading: boolean;
  accessMap: Partial<Record<MenuKey, AccessLevel>>;
  getAccess: (menuKey: MenuKey) => AccessLevel;
  canRead: (menuKey: MenuKey) => boolean;
  canEdit: (menuKey: MenuKey) => boolean;
  refresh: () => Promise<AccessGrantRow[] | undefined>;
};

const AccessContext = createContext<AccessContextValue>({
  grants: [],
  loading: true,
  accessMap: {},
  getAccess: () => "none",
  canRead: () => false,
  canEdit: () => false,
  refresh: async () => undefined,
});

export function AccessProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const swrEnabled = useFeatureFlag("swr_client_cache");

  const swr = useSWR(
    !authLoading && user ? ACCESS_KEY : null,
    async () => {
      try {
        return await fetchAccessGrants();
      } catch {
        // Table missing / RLS — fall back to empty → legacy resolve
        return [] as AccessGrantRow[];
      }
    },
    {
      revalidateOnFocus: true,
      keepPreviousData: swrEnabled,
    },
  );

  const grants = swr.data ?? [];

  const subject = useMemo(
    () =>
      user
        ? { id: user.id, role: user.role, department: user.department }
        : null,
    [user],
  );

  const accessMap = useMemo(() => {
    if (!subject) return {};
    return resolveAllAccess(subject, grants);
  }, [subject, grants]);

  const getAccess = useCallback(
    (menuKey: MenuKey): AccessLevel => {
      if (!subject) return "none";
      return resolveMenuAccess(menuKey, subject, grants);
    },
    [subject, grants],
  );

  const canRead = useCallback(
    (menuKey: MenuKey) => canReadAccess(getAccess(menuKey)),
    [getAccess],
  );

  const canEdit = useCallback(
    (menuKey: MenuKey) => canEditAccess(getAccess(menuKey)),
    [getAccess],
  );

  useEffect(() => {
    if (authLoading || swr.isLoading || !user || !subject) return;
    if (pathname === "/login" || pathname === "/dashboard") return;

    if (!canAccessPathWithGrants(pathname, subject, grants)) {
      router.replace("/dashboard");
    }
  }, [authLoading, swr.isLoading, user, subject, pathname, grants, router]);

  const value = useMemo(
    () => ({
      grants,
      loading: authLoading || (!!user && swr.isLoading),
      accessMap,
      getAccess,
      canRead,
      canEdit,
      refresh: swr.mutate,
    }),
    [grants, authLoading, user, swr.isLoading, accessMap, getAccess, canRead, canEdit, swr.mutate],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  return useContext(AccessContext);
}

export function useMenuAccess(menuKey: MenuKey) {
  const { getAccess, canRead, canEdit, loading } = useAccess();
  return {
    level: getAccess(menuKey),
    canRead: canRead(menuKey),
    canEdit: canEdit(menuKey),
    loading,
  };
}

export function usePathAccess() {
  const pathname = usePathname();
  const key = menuKeyForPath(pathname);
  const access = useAccess();
  if (!key) {
    return { menuKey: null as MenuKey | null, level: "edit" as AccessLevel, canRead: true, canEdit: true, loading: access.loading };
  }
  const level = access.getAccess(key);
  return {
    menuKey: key,
    level,
    canRead: canReadAccess(level),
    canEdit: canEditAccess(level),
    loading: access.loading,
  };
}
