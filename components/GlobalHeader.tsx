"use client";

import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/pages/Logo";
import { LangToggle } from "@/lib/i18n/LangToggle";
import { useI18n } from "@/lib/i18n/context";

export function GlobalHeader() {
  const pathname = usePathname();
  const router   = useRouter();
  const { t }    = useI18n();

  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-50 border-b px-4 py-3 flex items-center justify-between"
            style={{
              background:    "rgba(5,5,8,0.85)",
              borderColor:   "var(--color-anu-border)",
              backdropFilter:"blur(12px)",
            }}>
      {/* Logo */}
      <button onClick={() => router.push("/dashboard")}
              className="flex items-center gap-3 transition hover:opacity-80">
        <Logo className="w-9 h-9" />
        <div className="text-left">
          <p className="text-[10px] font-medium uppercase tracking-widest"
             style={{ color: "var(--color-anu-glow)" }}>The Quantum Core</p>
          <p className="text-lg font-bold leading-none"
             style={{ color: "var(--color-anu-text)" }}>ANU</p>
        </div>
      </button>

      {/* Right */}
      <div className="flex items-center gap-3">
        <span className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
              style={{ borderColor:"rgba(0,212,170,0.3)", background:"rgba(0,212,170,0.08)", color:"var(--color-anu-success)" }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background:"var(--color-anu-success)" }} />
          Live
        </span>

        {/* ปุ่มสลับภาษา */}
        <LangToggle />

        <button onClick={() => { localStorage.removeItem("anu_user"); router.push("/login"); }}
                className="text-xs px-3 py-1.5 rounded-lg border transition hover:opacity-80"
                style={{ borderColor:"var(--color-anu-border)", color:"var(--color-anu-muted)" }}>
          {t("common.logout")}
        </button>
      </div>
    </header>
  );
}