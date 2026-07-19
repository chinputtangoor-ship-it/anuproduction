import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "anu-void":     "var(--color-anu-void)",
        "anu-surface":  "var(--color-anu-surface)",
        "anu-elevated": "var(--color-anu-elevated)",
        "anu-border":   "var(--color-anu-border)",
        "anu-text":     "var(--color-anu-text)",
        "anu-muted":    "var(--color-anu-muted)",
        "anu-accent":   "var(--color-anu-accent)",
        "anu-glow":     "var(--color-anu-glow)",
        "anu-success":  "var(--color-anu-success)",
        "anu-warning":  "var(--color-anu-warning)",
        "anu-danger":   "var(--color-anu-danger)",
      },
    },
  },
  plugins: [],
};

export default config;
