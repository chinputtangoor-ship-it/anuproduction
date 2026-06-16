"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import th from "@/lib/i18n/th.json";
import en from "@/lib/i18n/en.json";

// ─── Types ────────────────────────────────────────────────────────────────────
export type Lang = "th" | "en";

type DeepDict = { [key: string]: string | DeepDict };
const dicts: Record<Lang, DeepDict> = { th, en };

type I18nCtx = {
  lang:   Lang;
  t:      (path: string, vars?: Record<string, string | number>) => string;
  toggle: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────
const I18nContext = createContext<I18nCtx>({
  lang:   "th",
  t:      (path) => path,
  toggle: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("anu_lang") as Lang) ?? "th";
    }
    return "th";
  });

  const toggle = useCallback(() => {
    setLang(prev => {
      const next = prev === "th" ? "en" : "th";
      localStorage.setItem("anu_lang", next);
      return next;
    });
  }, []);

  /**
   * t("record.title")            → "Box Status"
   * t("user.suc_add", { name: "John", username: "john01", password: "abc123" })
   *   → replaces {{name}}, {{username}}, {{password}}
   */
  const t = useCallback(
    (path: string, vars?: Record<string, string | number>): string => {
      const keys  = path.split(".");
      let   node: string | DeepDict = dicts[lang];

      for (const key of keys) {
        if (typeof node !== "object" || !(key in node)) return path; // key not found
        node = (node as DeepDict)[key];
      }

      if (typeof node !== "string") return path;

      // interpolate {{var}} placeholders
      if (vars) {
        return node.replace(/\{\{(\w+)\}\}/g, (_, k) =>
          vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`
        );
      }

      return node;
    },
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, t, toggle }}>
      {children}
    </I18nContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useI18n = () => useContext(I18nContext);
