"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

export default function DashboardPage() {
  const router  = useRouter();
  const { t }   = useI18n();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("anu_user");
    if (!stored) { router.push("/login"); return; }
    setUser(JSON.parse(stored));
  }, []);

  if (!user) return null;

  const menuSections = [
    {
      sectionKey: "nav.planner",
      roles: ["admin", "supervisor", "planner"],
      items: [
        { labelKey: "dashboard.plan",       icon: "🗓️", href: "/plan" },
      ],
    },
    {
      sectionKey: "nav.quality",
      roles: ["admin", "supervisor", "qc_technician"],
      items: [
        { labelKey: "dashboard.qc_form",    icon: "🔍", href: "/quality" },
      ],
    },
    {
      sectionKey: "nav.production",
      roles: ["admin", "supervisor", "production_operator"],
      items: [],
    },
    {
      sectionKey: "nav.post_production",
      roles: ["admin", "supervisor", "operator"],
      items: [
        { labelKey: "dashboard.box_status", icon: "📦", href: "/record"                                    },
        { labelKey: "dashboard.rejection",  icon: "🗑️", href: "/rejection"                                },
        { labelKey: "dashboard.backlog",    icon: "⏳", href: "/backlog"                                   },
        { labelKey: "dashboard.camera",     icon: "📷", href: "/camera",   roles: ["admin", "supervisor"]  },
        { labelKey: "dashboard.repass",     icon: "🔄", href: "/repass",   roles: ["admin", "supervisor"]  },
        { labelKey: "dashboard.analytics",  icon: "📈", href: "/analytics",roles: ["admin", "supervisor"]  },
      ],
    },
    {
      sectionKey: "nav.warehouse",
      roles: ["admin", "supervisor", "warehouse_operator"],
      items: [],
    },
    {
      sectionKey: "nav.human_resources",
      roles: ["admin", "supervisor"],
      items: [],
    },
    {
      sectionKey: "nav.account",
      roles: ["admin", "supervisor"],
      items: [],
    },
    {
      sectionKey: "nav.user",
      roles: ["admin"],
      items: [
        { labelKey: "dashboard.user_account", icon: "👥", href: "/user", roles: ["admin"] },
      ],
    },
  ];

  const FULL_ACCESS = ["admin", "supervisor", "manager"];

  const visibleSections = menuSections.filter((s) => {
    if (s.sectionKey === "nav.user") return s.roles.includes(user.role as string);
    return FULL_ACCESS.includes(user.role) || s.roles.length === 0 || s.roles.includes(user.role as string);
  });

  return (
    <div
      className="p-6 lg:p-10"
      style={{ background: "var(--color-anu-void)", minHeight: "100%" }}
    >
      {/* Welcome */}
      <div className="mb-10">
        <p className="text-sm mb-1" style={{ color: "var(--color-anu-muted)" }}>
          {t("dashboard.welcome")}
        </p>
        <h2 className="text-3xl font-bold" style={{ color: "var(--color-anu-text)" }}>
          {user.fullname}
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-anu-glow)" }}>
          {user.role}
        </p>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-10">
        {visibleSections.map((s) => {
          const visibleItems = s.items.filter(
            (m) => !m.roles || m.roles.includes(user.role)
          );

          return (
            <div key={s.sectionKey}>
              <div className="flex items-center gap-3 mb-4">
                <p
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-anu-muted)" }}
                >
                  {t(s.sectionKey)}
                </p>
                <div className="flex-1 h-px" style={{ background: "var(--color-anu-border)" }} />
              </div>

              {visibleItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {visibleItems.map((m) => (
                    <button
                      key={m.href}
                      onClick={() => router.push(m.href)}
                      className="rounded-xl border p-6 text-left transition hover:scale-[1.02] hover:border-purple-500"
                      style={{
                        background:  "var(--color-anu-surface)",
                        borderColor: "var(--color-anu-border)",
                      }}
                    >
                      <div className="text-4xl mb-3">{m.icon}</div>
                      <div className="font-semibold text-base" style={{ color: "var(--color-anu-text)" }}>
                        {t(m.labelKey)}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm italic" style={{ color: "var(--color-anu-muted)" }}>
                  — {t("common.coming_soon")} —
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}