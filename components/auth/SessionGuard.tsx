"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  clearLocalSession,
  getOrCreateDeviceId,
  readLocalSession,
  storeLocalSession,
} from "@/lib/auth/device";
import { useFeatureFlag } from "@/lib/features/FeatureFlagsProvider";
import { useRealtimeTables } from "@/hooks/useRealtimeTables";
import { useI18n } from "@/lib/i18n/context";

/** Polls / listens for single-session takeover and force-logouts this device. */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const singleSession = useFeatureFlag("single_session");
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [kicked, setKicked] = useState(false);

  const checkSession = useCallback(async () => {
    if (!singleSession || !user || kicked) return;
    const local = readLocalSession();
    if (!local) return;

    const deviceId = getOrCreateDeviceId();
    const res = await fetch("/api/auth/session");
    if (!res.ok) return;
    const data = await res.json();
    const remoteId = data.sessionId as string | null;
    const remoteVer = Number(data.version ?? 0);

    if (remoteId && remoteId !== deviceId) {
      setKicked(true);
      clearLocalSession();
      try {
        sessionStorage.setItem("anu_session_kicked", t("session.kicked"));
      } catch {
        /* ignore */
      }
      await logout();
      return;
    }

    if (remoteId === deviceId && remoteVer !== local.version) {
      storeLocalSession(deviceId, remoteVer);
    }
  }, [singleSession, user, kicked, logout, t]);

  useEffect(() => {
    if (!singleSession || !user) return;
    void checkSession();
    const id = window.setInterval(() => void checkSession(), 15_000);
    return () => window.clearInterval(id);
  }, [singleSession, user, checkSession]);

  useRealtimeTables({
    enabled: singleSession && !!user,
    tables: ["profiles"],
    filter: user ? `id=eq.${user.id}` : undefined,
    onEvent: () => {
      void checkSession();
    },
  });

  return <>{children}</>;
}
