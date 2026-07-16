"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import {
  APP_MENU,
  GLOBAL_MENU_ITEMS,
  getVisibleMenuItems,
  getVisibleSections,
} from "@/lib/navigation/menu";
import type { Department } from "@/lib/constants/departments";
import type { UserRole } from "@/lib/auth/types";
import { useI18n } from "@/lib/i18n/context";

export function Sidebar({
  role,
  department,
}: {
  role: string;
  department?: Department | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const userRole = role as UserRole;

  const initialOpen = APP_MENU.reduce<Record<string, boolean>>((acc, section) => {
    const hasActive = section.items.some((item) => item.href === pathname);
    acc[section.sectionKey] = hasActive;
    return acc;
  }, {});

  const [open, setOpen] = useState<Record<string, boolean>>(initialOpen);

  const toggle = (sectionKey: string) =>
    setOpen((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));

  const visibleSections = getVisibleSections(userRole, department);

  return (
    <aside
      className="hidden lg:flex flex-col w-56 shrink-0 border-r min-h-screen pt-4 pb-8"
      style={{ background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" }}
    >
      <nav className="flex flex-col gap-1 px-3 mb-2">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition"
          style={{
            background: pathname === "/dashboard" ? "rgba(124,92,255,0.15)" : "transparent",
            color: pathname === "/dashboard" ? "var(--color-anu-glow)" : "var(--color-anu-muted)",
            borderLeft: pathname === "/dashboard" ? "3px solid var(--color-anu-accent)" : "3px solid transparent",
          }}
        >
          <AppIcon name="home" size={18} />
          <span>{t("common.home")}</span>
        </button>
        {GLOBAL_MENU_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition"
              style={{
                background: active ? "rgba(124,92,255,0.15)" : "transparent",
                color: active ? "var(--color-anu-glow)" : "var(--color-anu-muted)",
                borderLeft: active ? "3px solid var(--color-anu-accent)" : "3px solid transparent",
              }}
            >
              <AppIcon name={item.icon} size={18} />
              <span>{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-3 mb-2" style={{ borderBottom: "1px solid var(--color-anu-border)" }} />

      <nav className="flex flex-col gap-0.5 px-3">
        {visibleSections.map((section) => {
          const visibleItems = getVisibleMenuItems(section, userRole);
          const isOpen = open[section.sectionKey] ?? false;
          const hasActive = visibleItems.some((item) => item.href === pathname);

          return (
            <div key={section.sectionKey}>
              <button
                onClick={() => toggle(section.sectionKey)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition"
                style={{
                  color: hasActive ? "var(--color-anu-glow)" : "var(--color-anu-text)",
                  background: hasActive && !isOpen ? "rgba(124,92,255,0.08)" : "transparent",
                  borderLeft: hasActive && !isOpen ? "3px solid var(--color-anu-accent)" : "3px solid transparent",
                }}
              >
                <div className="flex items-center gap-3">
                  <AppIcon name={section.icon} size={18} />
                  <span>{t(section.sectionKey)}</span>
                </div>
                <span
                  className="inline-flex transition-transform duration-200"
                  style={{
                    color: "var(--color-anu-muted)",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  <AppIcon name="chevronDown" size={14} />
                </span>
              </button>

              {isOpen && (
                <div
                  className="flex flex-col gap-0.5 mt-0.5 mb-1 ml-3 pl-3"
                  style={{ borderLeft: "1px solid var(--color-anu-border)" }}
                >
                  {visibleItems.length > 0 ? (
                    visibleItems.map((item) => {
                      const active = pathname === item.href;
                      return (
                        <button
                          key={item.href}
                          onClick={() => router.push(item.href)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition"
                          style={{
                            background: active ? "rgba(124,92,255,0.15)" : "transparent",
                            color: active ? "var(--color-anu-glow)" : "var(--color-anu-muted)",
                            borderLeft: active ? "3px solid var(--color-anu-accent)" : "3px solid transparent",
                          }}
                        >
                          <AppIcon name={item.icon} size={16} />
                          <span>{t(item.labelKey)}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-2 text-xs italic" style={{ color: "var(--color-anu-muted)" }}>
                      — {t("common.coming_soon")} —
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
