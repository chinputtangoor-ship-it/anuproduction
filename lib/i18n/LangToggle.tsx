"use client";

import { useI18n } from "@/lib/i18n/context";

export function LangToggle() {
  const { lang, toggle } = useI18n();

  return (
    <button
      onClick={toggle}
      title={lang === "th" ? "Switch to English" : "เปลี่ยนเป็นภาษาไทย"}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition hover:opacity-80 select-none"
      style={{
        background:  "var(--color-anu-surface)",
        borderColor: "var(--color-anu-border)",
        color:       "var(--color-anu-muted)",
      }}
    >
      <span>{lang === "th" ? "🇹🇭" : "🇬🇧"}</span>
      <span>{lang === "th" ? "TH" : "EN"}</span>
    </button>
  );
}
