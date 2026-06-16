"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n/context";

type MenuItem = {
  labelKey: string;
  icon: string;
  href: string;
  roles?: string[];
};

type Section = {
  sectionKey: string;
  icon: string;
  roles?: string[];
  items: MenuItem[];
};

const MENU: Section[] = [
  {
    sectionKey: "nav.planner",
    roles: ["admin", "supervisor", "planner"],
    icon: "🗓️",
    items: [
      { labelKey: "dashboard.plan", icon: "🗓️", href: "/plan" },
    ],
  },
  {
    sectionKey: "nav.quality",
    icon: "🔍",
    roles: ["admin", "supervisor", "qc_technician"],
    items: [
      { labelKey: "dashboard.qc_form", icon: "🔍", href: "/quality" },
    ],
  },
  {
    sectionKey: "nav.production",
    icon: "🏭",
    roles: ["admin", "supervisor", "production_operator"],
    items: [],
  },
  {
    sectionKey: "nav.post_production",
    roles: ["admin", "supervisor", "operator"],
    icon: "📦",
    items: [
      { labelKey: "dashboard.box_status", icon: "📦", href: "/record"                                   },
      { labelKey: "dashboard.rejection",  icon: "🗑️", href: "/rejection"                               },
      { labelKey: "dashboard.backlog",    icon: "⏳", href: "/backlog"                                  },
      { labelKey: "dashboard.camera",     icon: "📷", href: "/camera",   roles: ["admin", "supervisor"] },
      { labelKey: "dashboard.repass",     icon: "🔄", href: "/repass",   roles: ["admin", "supervisor"] },
      { labelKey: "dashboard.analytics",  icon: "📈", href: "/analytics",roles: ["admin", "supervisor"] },
    ],
  },
  {
    sectionKey: "nav.warehouse",
    icon: "🏗️",
    roles: ["admin", "supervisor", "warehouse_operator"],
    items: [],
  },
  {
    sectionKey: "nav.human_resources",
    icon: "🧑",
    roles: ["admin", "supervisor"],
    items: [],
  },
  {
    sectionKey: "nav.account",
    icon: "💰",
    roles: ["admin", "supervisor"],
    items: [],
  },
  {
    sectionKey: "nav.user",
    icon: "👥",
    roles: ["admin"],
    items: [
      { labelKey: "dashboard.user_account", icon: "👥", href: "/user", roles: ["admin"] },
    ],
  },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { t }    = useI18n();

  const initialOpen = MENU.reduce<Record<string, boolean>>((acc, s) => {
    const hasActive = s.items.some(m => m.href === pathname);
    acc[s.sectionKey] = hasActive;
    return acc;
  }, {});

  const [open, setOpen] = useState<Record<string, boolean>>(initialOpen);

  const toggle = (sectionKey: string) =>
    setOpen(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));

  const FULL_ACCESS = ["admin", "supervisor", "manager"];

  const visibleSections = MENU.filter((s) => {
    if (s.sectionKey === "nav.user") return s.roles?.includes(role) ?? false;
    return FULL_ACCESS.includes(role) || !s.roles || s.roles.includes(role);
  });

  return (
    <aside
      className="hidden lg:flex flex-col w-56 shrink-0 border-r min-h-screen pt-4 pb-8"
      style={{ background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" }}
    >
      {/* หน้าหลัก */}
      <nav className="flex flex-col gap-1 px-3 mb-2">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition"
          style={{
            background: pathname === "/dashboard" ? "rgba(124,92,255,0.15)" : "transparent",
            color:      pathname === "/dashboard" ? "var(--color-anu-glow)" : "var(--color-anu-muted)",
            borderLeft: pathname === "/dashboard" ? "3px solid var(--color-anu-accent)" : "3px solid transparent",
          }}
        >
          <span>🏠</span>
          <span>{t("common.home")}</span>
        </button>
      </nav>

      <div className="px-3 mb-2" style={{ borderBottom: "1px solid var(--color-anu-border)" }} />

      {/* Sections */}
      <nav className="flex flex-col gap-0.5 px-3">
        {visibleSections.map(s => {
          const visibleItems = s.items.filter(m => !m.roles || m.roles.includes(role));
          const isOpen       = open[s.sectionKey] ?? false;
          const hasActive    = visibleItems.some(m => m.href === pathname);

          return (
            <div key={s.sectionKey}>
              <button
                onClick={() => toggle(s.sectionKey)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition"
                style={{
                  color:      hasActive ? "var(--color-anu-glow)" : "var(--color-anu-text)",
                  background: hasActive && !isOpen ? "rgba(124,92,255,0.08)" : "transparent",
                  borderLeft: hasActive && !isOpen ? "3px solid var(--color-anu-accent)" : "3px solid transparent",
                }}
              >
                <div className="flex items-center gap-3">
                  <span>{s.icon}</span>
                  <span>{t(s.sectionKey)}</span>
                </div>
                <span
                  className="text-xs transition-transform duration-200"
                  style={{
                    color: "var(--color-anu-muted)",
                    display: "inline-block",
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                >
                  ▾
                </span>
              </button>

              {isOpen && (
                <div className="flex flex-col gap-0.5 mt-0.5 mb-1 ml-3 pl-3"
                     style={{ borderLeft: "1px solid var(--color-anu-border)" }}>
                  {visibleItems.length > 0 ? (
                    visibleItems.map(m => {
                      const active = pathname === m.href;
                      return (
                        <button
                          key={m.href}
                          onClick={() => router.push(m.href)}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition"
                          style={{
                            background: active ? "rgba(124,92,255,0.15)" : "transparent",
                            color:      active ? "var(--color-anu-glow)"  : "var(--color-anu-muted)",
                            borderLeft: active ? "3px solid var(--color-anu-accent)" : "3px solid transparent",
                          }}
                        >
                          <span>{m.icon}</span>
                          <span>{t(m.labelKey)}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-2 text-xs italic"
                       style={{ color: "var(--color-anu-muted)" }}>
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