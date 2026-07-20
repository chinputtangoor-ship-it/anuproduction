"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { canManageUsers } from "@/lib/auth/permissions";
import { FEATURE_REGISTRY, type FeatureFlagKey } from "@/lib/features/registry";
import { useFeatureFlags } from "@/lib/features/FeatureFlagsProvider";
import { useI18n } from "@/lib/i18n/context";

type FlagRow = {
  key: FeatureFlagKey;
  enabled: boolean;
  updated_at: string | null;
};

export default function FeaturesSettingsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, loading: authLoading } = useRequireAuth();
  const { refresh: refreshFlags } = useFeatureFlags();
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/features");
    if (res.status === 403) {
      router.replace("/dashboard");
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t("common.error"));
      setLoading(false);
      return;
    }
    setFlags(data.flags ?? []);
    setLoading(false);
  }, [router, t]);

  useEffect(() => {
    if (authLoading || !user) return;
    if (!canManageUsers(user.role)) {
      router.replace("/dashboard");
      return;
    }
    load();
  }, [authLoading, user, load, router]);

  async function toggle(key: FeatureFlagKey, enabled: boolean) {
    setSaving(key);
    setError("");
    const res = await fetch("/api/admin/features", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, enabled }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? t("common.error"));
      setSaving(null);
      return;
    }
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled, updated_at: data.flag?.updated_at ?? f.updated_at } : f)),
    );
    await refreshFlags();
    setSaving(null);
  }

  if (authLoading || !user || loading) {
    return <PageSkeleton />;
  }

  if (!canManageUsers(user.role)) return null;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <AppIcon name="sliders" size={24} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-anu-text)" }}>
            {t("features.title")}
          </h1>
          <p className="text-sm" style={{ color: "var(--color-anu-muted)" }}>
            {t("features.subtitle")}
          </p>
        </div>
      </div>

      {error && (
        <p className="mb-4 text-sm rounded-lg border px-3 py-2" style={{ color: "var(--color-anu-danger)", borderColor: "var(--color-anu-danger)" }}>
          {error}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {FEATURE_REGISTRY.map((meta) => {
          const row = flags.find((f) => f.key === meta.key);
          const enabled = row?.enabled ?? meta.defaultEnabled;
          return (
            <li
              key={meta.key}
              className="rounded-xl border p-4 flex items-start justify-between gap-4"
              style={{ background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" }}
            >
              <div className="min-w-0">
                <p className="font-semibold text-sm" style={{ color: "var(--color-anu-text)" }}>
                  {t(meta.labelKey)}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-anu-muted)" }}>
                  {t(meta.descriptionKey)}
                </p>
              </div>
              <button
                type="button"
                disabled={saving === meta.key}
                onClick={() => toggle(meta.key, !enabled)}
                className="shrink-0 min-h-[44px] min-w-[72px] rounded-lg px-3 text-sm font-semibold transition"
                style={{
                  background: enabled ? "var(--color-anu-success)" : "var(--color-anu-elevated)",
                  color: enabled ? "#fff" : "var(--color-anu-muted)",
                  border: "1px solid var(--color-anu-border)",
                }}
                aria-pressed={enabled}
              >
                {saving === meta.key
                  ? t("common.saving")
                  : enabled
                    ? t("features.on")
                    : t("features.off")}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
