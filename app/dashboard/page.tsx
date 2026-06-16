"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("anu_user");
    if (!stored) { router.push("/login"); return; }
    setUser(JSON.parse(stored));
  }, []);

  if (!user) return null;

  const menuSections = [
    {
      section: "Planner",
      roles: ["admin", "supervisor", "planner"],
      items: [
        { label: "Plan", icon: "🗓️", href: "/plan" },
      ],
    },
    {
      section: "Quality",
      roles: ["admin", "supervisor", "qc_technician"],
      items: [
        { label: "QC Form", icon: "🔍", href: "/quality" },
      ],
    },
    {
      section: "Production",
      roles: ["admin", "supervisor", "production_operator"],
      items: [],
    },
    {
      section: "Post Production",
      roles: ["admin", "supervisor", "operator"],
      items: [
        { label: "Box Status", icon: "📦", href: "/record"                                          },
        { label: "Rejection",  icon: "🗑️", href: "/rejection"                                      },
        { label: "Backlog",    icon: "⏳", href: "/backlog"                                         },
        { label: "Camera",     icon: "📷", href: "/camera",    roles: ["admin", "supervisor"]       },
        { label: "Re-pass",    icon: "🔄", href: "/repass",    roles: ["admin", "supervisor"]       },
        { label: "Analytics",  icon: "📈", href: "/analytics", roles: ["admin", "supervisor"]       },
      ],
    },
    {
      section: "Warehouse",
      roles: ["admin", "supervisor", "warehouse_operator"],
      items: [],
    },
    {
      section: "Human Resources",
      roles: ["admin", "supervisor"],
      items: [],
    },
    {
      section: "Account",
      roles: ["admin", "supervisor"],
      items: [],
    },
    {
      section: "User",
      roles: ["admin"],
      items: [
        { label: "User Account", icon: "👥", href: "/user", roles: ["admin"] },
      ],
    },
  ];

  const FULL_ACCESS = ["admin", "supervisor", "manager"];

  const visibleSections = menuSections.filter((s) => {
    if (s.section === "User") return s.roles.includes(user.role as string);
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
          ยินดีต้อนรับ
        </p>
        <h2
          className="text-3xl font-bold"
          style={{ color: "var(--color-anu-text)" }}
        >
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
            <div key={s.section}>
              <div className="flex items-center gap-3 mb-4">
                <p
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-anu-muted)" }}
                >
                  {s.section}
                </p>
                <div
                  className="flex-1 h-px"
                  style={{ background: "var(--color-anu-border)" }}
                />
              </div>

              {visibleItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {visibleItems.map((m) => (
                    <button
                      key={m.href}
                      onClick={() => router.push(m.href)}
                      className="rounded-xl border p-6 text-left transition hover:scale-[1.02] hover:border-purple-500"
                      style={{
                        background: "var(--color-anu-surface)",
                        borderColor: "var(--color-anu-border)",
                      }}
                    >
                      <div className="text-4xl mb-3">{m.icon}</div>
                      <div
                        className="font-semibold text-base"
                        style={{ color: "var(--color-anu-text)" }}
                      >
                        {m.label}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p
                  className="text-sm italic"
                  style={{ color: "var(--color-anu-muted)" }}
                >
                  — Coming soon —
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}