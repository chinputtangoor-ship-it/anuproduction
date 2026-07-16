"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme/context";
import { useI18n } from "@/lib/i18n/context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? t("theme.switch_light") : t("theme.switch_dark")}
      aria-label={isDark ? t("theme.switch_light") : t("theme.switch_dark")}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition hover:opacity-80 select-none"
      style={{
        background: "var(--color-anu-surface)",
        borderColor: "var(--color-anu-border)",
        color: "var(--color-anu-muted)",
      }}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
      <span className="hidden sm:inline">{isDark ? t("theme.light") : t("theme.dark")}</span>
    </button>
  );
}
