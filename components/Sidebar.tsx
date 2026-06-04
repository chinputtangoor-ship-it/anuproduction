"use client";

import { usePathname, useRouter } from "next/navigation";

const MENU = [
  { label: "หน้าหลัก",   icon: "🏠", href: "/dashboard" },
  { label: "Box Status",  icon: "📦", href: "/record"    },
  { label: "Rejection",   icon: "🗑️", href: "/rejection" },
  { label: "Backlog",     icon: "⏳", href: "/backlog"   },
  { label: "Plan",        icon: "🗓️", href: "/plan"      },
  { label: "Camera",      icon: "📷", href: "/camera",    roles: ["admin","supervisor"] },
  { label: "Re-pass",     icon: "🔄", href: "/repass",    roles: ["admin","supervisor"] },
  { label: "Dashboard",   icon: "📈", href: "/analytics", roles: ["admin","supervisor"] },
  { label: "Accounts",    icon: "👥", href: "/account",   roles: ["admin"] },
];

export function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const router   = useRouter();

  const items = MENU.filter(m => !m.roles || m.roles.includes(role));

  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r min-h-screen pt-4 pb-8"
           style={{ background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" }}>
      <nav className="flex flex-col gap-1 px-3">
        {items.map(m => {
          const active = pathname === m.href;
          return (
            <button key={m.href} onClick={() => router.push(m.href)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition"
              style={{
                background:  active ? "rgba(124,92,255,0.15)" : "transparent",
                color:       active ? "var(--color-anu-glow)"  : "var(--color-anu-muted)",
                borderLeft:  active ? "3px solid var(--color-anu-accent)" : "3px solid transparent",
              }}>
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}