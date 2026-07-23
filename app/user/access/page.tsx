"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAccess } from "@/lib/auth/AccessProvider";
import { canManageUsers } from "@/lib/auth/permissions";
import { resolveGrantsForTarget } from "@/lib/auth/access";
import {
  GRANTABLE_MENU_KEYS,
  MENU_KEY_META,
  type AccessLevel,
  type GrantScope,
  type GrantableMenuKey,
} from "@/lib/auth/menu-catalog";
import { POSITIONS } from "@/lib/auth/permissions";
import { DEPARTMENTS } from "@/lib/constants/departments";
import { saveAccessMatrix } from "@/lib/data/access-grants";
import { useI18n } from "@/lib/i18n/context";
import { sortByAsc } from "@/lib/sort/asc";
import { supabase } from "@/lib/supabase";

type Mode = GrantScope;

const LEVELS: AccessLevel[] = ["none", "read", "edit"];

export default function AccessControlPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, loading: authLoading } = useRequireAuth();
  const { grants, refresh, loading: accessLoading } = useAccess();

  const [mode, setMode] = useState<Mode>("department_position");
  const [users, setUsers] = useState<{ id: string; fullname: string; username: string }[]>([]);
  const [userId, setUserId] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [position, setPosition] = useState<string>("operator");
  const [levels, setLevels] = useState<Partial<Record<GrantableMenuKey, AccessLevel>>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    if (!canManageUsers(user.role)) {
      router.replace("/dashboard");
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, fullname, username")
        .eq("is_active", true)
        .order("fullname");
      const sorted = sortByAsc(data ?? [], (u) => `${u.fullname} ${u.username}`);
      setUsers(sorted);
      if (sorted[0]) setUserId(sorted[0].id);
    })();
  }, [authLoading, user, router]);

  // Load current matrix for selected target from grants
  useEffect(() => {
    const next: Partial<Record<GrantableMenuKey, AccessLevel>> = {};
    for (const key of GRANTABLE_MENU_KEYS) {
      next[key] = resolveGrantsForTarget(
        key,
        {
          scope: mode,
          userId,
          department,
          position,
        },
        grants,
      );
    }
    setLevels(next);
  }, [mode, userId, department, position, grants]);

  const cardStyle = {
    background: "var(--color-anu-surface)",
    borderColor: "var(--color-anu-border)",
  };

  const modes: { key: Mode; label: string }[] = useMemo(
    () => [
      { key: "user", label: t("access.mode_user") },
      { key: "department_position", label: t("access.mode_dept_pos") },
      { key: "position", label: t("access.mode_position") },
    ],
    [t],
  );

  async function handleSave() {
    if (!user?.id) return;
    if (mode === "user" && !userId) {
      alert(t("access.pick_user"));
      return;
    }
    if (mode === "department_position" && (!department || !position)) {
      alert(t("access.pick_target"));
      return;
    }
    if (mode === "position" && !position) {
      alert(t("access.pick_target"));
      return;
    }

    setSaving(true);
    setMsg("");
    try {
      await saveAccessMatrix({
        scope: mode,
        userId: mode === "user" ? userId : null,
        department: mode === "department_position" ? department : null,
        position: mode === "user" ? null : position,
        levels,
        actorId: user.id,
      });
      await refresh();
      setMsg(t("access.saved"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user || accessLoading) return <FormSkeleton />;
  if (!canManageUsers(user.role)) return <FormSkeleton />;

  return (
    <div className="w-full min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.push("/user")}
            className="text-sm px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5"
            style={cardStyle}
          >
            <AppIcon name="arrowLeft" size={14} />
            {t("common.back")}
          </button>
          <h1
            className="text-xl font-bold inline-flex items-center gap-2"
            style={{ color: "var(--color-anu-text)" }}
          >
            <AppIcon name="sliders" size={22} />
            {t("access.title")}
          </h1>
        </div>

        <p className="text-sm mb-2" style={{ color: "var(--color-anu-muted)" }}>
          {t("access.subtitle")}
        </p>
        <p className="text-xs mb-6" style={{ color: "var(--color-anu-warning)" }}>
          {t("access.revoke_hint")}
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {modes.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className="px-4 py-2 rounded-lg text-sm font-medium border min-h-[44px]"
              style={
                mode === m.key
                  ? {
                      background: "var(--color-anu-accent)",
                      color: "#fff",
                      borderColor: "var(--color-anu-accent)",
                    }
                  : cardStyle
              }
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4" style={cardStyle}>
          {mode === "user" && (
            <div className="sm:col-span-3">
              <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                {t("access.user")}
              </p>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none min-h-[44px]"
                style={{
                  background: "var(--color-anu-elevated)",
                  borderColor: "var(--color-anu-border)",
                  color: "var(--color-anu-text)",
                }}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullname} ({u.username})
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === "department_position" && (
            <>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                  {t("user.department")}
                </p>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none min-h-[44px]"
                  style={{
                    background: "var(--color-anu-elevated)",
                    borderColor: "var(--color-anu-border)",
                    color: "var(--color-anu-text)",
                  }}
                >
                  {sortByAsc(DEPARTMENTS, (d) => t(`department.${d}`)).map((d) => (
                    <option key={d} value={d}>
                      {t(`department.${d}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                  {t("access.position")}
                </p>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none min-h-[44px]"
                  style={{
                    background: "var(--color-anu-elevated)",
                    borderColor: "var(--color-anu-border)",
                    color: "var(--color-anu-text)",
                  }}
                >
                  {sortByAsc(POSITIONS, (p) => t(`position.${p}`)).map((p) => (
                    <option key={p} value={p}>
                      {t(`position.${p}`)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {mode === "position" && (
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                {t("access.position")}
              </p>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none min-h-[44px]"
                style={{
                  background: "var(--color-anu-elevated)",
                  borderColor: "var(--color-anu-border)",
                  color: "var(--color-anu-text)",
                }}
              >
                {sortByAsc(POSITIONS, (p) => t(`position.${p}`)).map((p) => (
                  <option key={p} value={p}>
                    {t(`position.${p}`)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border mb-6" style={{ borderColor: "var(--color-anu-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--color-anu-elevated)" }}>
                <th className="px-3 py-3 text-left font-medium" style={{ color: "var(--color-anu-muted)" }}>
                  {t("access.menu")}
                </th>
                <th className="px-3 py-3 text-left font-medium" style={{ color: "var(--color-anu-muted)" }}>
                  {t("access.section")}
                </th>
                <th className="px-3 py-3 text-left font-medium" style={{ color: "var(--color-anu-muted)" }}>
                  {t("access.level")}
                </th>
              </tr>
            </thead>
            <tbody>
              {GRANTABLE_MENU_KEYS.map((key, i) => {
                const meta = MENU_KEY_META[key];
                return (
                  <tr
                    key={key}
                    style={{
                      background: i % 2 === 0 ? "var(--color-anu-surface)" : "var(--color-anu-void)",
                      borderTop: "1px solid var(--color-anu-border)",
                    }}
                  >
                    <td className="px-3 py-2.5 font-medium" style={{ color: "var(--color-anu-text)" }}>
                      {t(meta.labelKey)}
                      <span className="block text-xs font-normal" style={{ color: "var(--color-anu-muted)" }}>
                        {key}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "var(--color-anu-muted)" }}>
                      {t(meta.sectionKey)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-2">
                        {LEVELS.map((lv) => {
                          const active = (levels[key] ?? "none") === lv;
                          return (
                            <button
                              key={lv}
                              type="button"
                              onClick={() => setLevels((prev) => ({ ...prev, [key]: lv }))}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold border min-h-[36px]"
                              style={
                                active
                                  ? {
                                      background:
                                        lv === "edit"
                                          ? "var(--color-anu-success)"
                                          : lv === "read"
                                            ? "var(--color-anu-warning)"
                                            : "var(--color-anu-muted)",
                                      color: "#fff",
                                      borderColor: "transparent",
                                    }
                                  : {
                                      background: "var(--color-anu-elevated)",
                                      borderColor: "var(--color-anu-border)",
                                      color: "var(--color-anu-muted)",
                                    }
                              }
                            >
                              {t(`access.level_${lv}`)}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {msg && (
          <p
            className="mb-4 text-sm"
            style={{
              color: msg === t("access.saved") ? "var(--color-anu-success)" : "var(--color-anu-danger)",
            }}
          >
            {msg}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-6 py-3 rounded-xl text-sm font-bold min-h-[44px] disabled:opacity-50 inline-flex items-center gap-2"
          style={{ background: "var(--color-anu-accent)", color: "#fff" }}
        >
          <AppIcon name="save" size={16} />
          {saving ? t("common.saving") : t("access.save")}
        </button>
      </div>
    </div>
  );
}
