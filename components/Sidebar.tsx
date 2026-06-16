"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

type MenuItem = {
  label: string;
  icon: string;
  href: string;
  roles?: string[];
};

type Section = {
  section: string;
  icon: string;
  roles?: string[];
  items: MenuItem[];
};

const MENU: Section[] = [
  {
    section: "Planner",
    roles: ["admin", "supervisor", "planner"],
    icon: "🗓️",
    items: [
      { label: "Plan", icon: "🗓️", href: "/plan" },
    ],
  },
  {
    section: "Quality",
    icon: "🔍",
    roles: ["admin", "supervisor", "qc_technician"],
    items: [
      { label: "QC Form", icon: "🔍", href: "/quality" },
    ],
  },
  {
    section: "Production",
    icon: "🏭",
    roles: ["admin", "supervisor", "production_operator"],
    items: [],
  },
  {
    section: "Post Production",
    roles: ["admin", "supervisor", "operator"],
    icon: "📦",
    items: [
      { label: "Box Status", icon: "📦", href: "/record"                                    },
      { label: "Rejection",  icon: "🗑️", href: "/rejection"                                },
      { label: "Backlog",    icon: "⏳", href: "/backlog"                                   },
      { label: "Camera",     icon: "📷", href: "/camera",   roles: ["admin", "supervisor"]  },
      { label: "Re-pass",    icon: "🔄", href: "/repass",   roles: ["admin", "supervisor"]  },
      { label: "Analytics",  icon: "📈", href: "/analytics",roles: ["admin", "supervisor"]  },
    ],
  },
  {
    section: "Warehouse",
    icon: "🏗️",
    roles: ["admin", "supervisor", "warehouse_operator"],
    items: [],
  },
  {
    section: "Human Resources",
    icon: "🧑",
    roles: ["admin", "supervisor"],
    items: [],
  },
  {
    section: "Account",
    icon: "💰",
    roles: ["admin", "supervisor"],
    items: [],
  },
  {
    section: "User",
    icon: "👥",
    roles: ["admin"],
    items: [
      { label: "User Account", icon: "👥", href: "/user", roles: ["admin"] },
    ],
  },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const router   = useRouter();

  const initialOpen = MENU.reduce<Record<string, boolean>>((acc, s) => {
    const hasActive = s.items.some(m => m.href === pathname);
    acc[s.section] = hasActive;
    return acc;
  }, {});

  const [open, setOpen] = useState<Record<string, boolean>>(initialOpen);

  const toggle = (section: string) =>
    setOpen(prev => ({ ...prev, [section]: !prev[section] }));

  const FULL_ACCESS = ["admin", "supervisor", "manager"];

  const visibleSections = MENU.filter((s) => {
    if (s.section === "User") return s.roles?.includes(role) ?? false;
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
          <span>หน้าหลัก</span>
        </button>
      </nav>

      <div className="px-3 mb-2" style={{ borderBottom: "1px solid var(--color-anu-border)" }} />

      {/* Sections */}
      <nav className="flex flex-col gap-0.5 px-3">
        {visibleSections.map(s => {
          const visibleItems = s.items.filter(m => !m.roles || m.roles.includes(role));
          const isOpen       = open[s.section] ?? false;
          const hasActive    = visibleItems.some(m => m.href === pathname);

          return (
            <div key={s.section}>
              <button
                onClick={() => toggle(s.section)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold transition"
                style={{
                  color:      hasActive ? "var(--color-anu-glow)" : "var(--color-anu-text)",
                  background: hasActive && !isOpen ? "rgba(124,92,255,0.08)" : "transparent",
                  borderLeft: hasActive && !isOpen ? "3px solid var(--color-anu-accent)" : "3px solid transparent",
                }}
              >
                <div className="flex items-center gap-3">
                  <span>{s.icon}</span>
                  <span>{s.section}</span>
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
                          <span>{m.label}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-3 py-2 text-xs italic"
                       style={{ color: "var(--color-anu-muted)" }}>
                      — Coming soon —
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