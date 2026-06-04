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
        "anu-void":     "#050508",
        "anu-surface":  "#0f1117",
        "anu-elevated": "#171921",
        "anu-border":   "#1e2230",
        "anu-text":     "#e2e8f0",
        "anu-muted":    "#64748b",
        "anu-accent":   "#7c5cff",
        "anu-glow":     "#a78bfa",
        "anu-success":  "#00d4aa",
        "anu-warning":  "#ffa502",
        "anu-danger":   "#ff4757",
      },
    },
  },
  plugins: [],
};

export default config;