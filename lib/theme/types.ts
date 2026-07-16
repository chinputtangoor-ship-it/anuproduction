export type ThemeMode = "dark" | "light";

export const THEME_STORAGE_KEY = "anu_theme";

export const DEFAULT_THEME: ThemeMode = "dark";

export const THEME_META_COLORS: Record<ThemeMode, string> = {
  dark: "#0D0D0D",
  light: "#f1f5f9",
};
