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

  return (
    <div className="p-6 lg:p-10" style={{ background: "var(--color-anu-void)", minHeight: "100%" }}>

      {/* Welcome */}
      <div className="mb-8">
        <p className="text-sm mb-1" style={{ color: "var(--color-anu-muted)" }}>ยินดีต้อนรับ</p>
        <h2 className="text-3xl font-bold" style={{ color: "var(--color-anu-text)" }}>{user.fullname}</h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-anu-glow)" }}>{user.role}</p>
      </div>

      {/* Menu Grid */}
      <p className="text-xs font-medium mb-4 uppercase tracking-widest"
         style={{ color: "var(--color-anu-muted)" }}>เมนูหลัก</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
        {[
          { label: "Box Status",  icon: "📦", href: "/record"    },
          { label: "Rejection",   icon: "🗑️", href: "/rejection" },
          { label: "Backlog",     icon: "⏳", href: "/backlog"   },
          { label: "Plan",        icon: "🗓️", href: "/plan"      },
          { label: "Camera",      icon: "📷", href: "/camera",    roles: ["admin","supervisor"] },
          { label: "Re-pass",     icon: "🔄", href: "/repass",    roles: ["admin","supervisor"] },
          { label: "Dashboard",   icon: "📈", href: "/analytics", roles: ["admin","supervisor"] },
          { label: "Accounts",    icon: "👥", href: "/account",   roles: ["admin"] },
        ]
          .filter(m => !m.roles || m.roles.includes(user.role))
          .map(m => (
            <button key={m.href} onClick={() => router.push(m.href)}
              className="rounded-xl border p-6 text-left transition hover:scale-[1.02] hover:border-purple-500"
              style={{ background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" }}>
              <div className="text-4xl mb-3">{m.icon}</div>
              <div className="font-semibold text-base" style={{ color: "var(--color-anu-text)" }}>
                {m.label}
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}