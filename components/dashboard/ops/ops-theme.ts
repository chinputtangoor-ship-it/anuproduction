export const OPS = {
  accent: "var(--color-anu-accent)",
  success: "var(--color-anu-success)",
  warning: "var(--color-anu-warning)",
  danger: "var(--color-anu-danger)",
  blue: "var(--color-anu-chart-blue)",
  muted: "var(--color-anu-muted)",
  surface: "var(--color-anu-surface)",
  elevated: "var(--color-anu-elevated)",
  border: "var(--color-anu-border)",
  text: "var(--color-anu-text)",
} as const;

export const OPS_TOOLTIP = {
  contentStyle: {
    background: "var(--color-anu-elevated)",
    border: "1px solid var(--color-anu-border)",
    borderRadius: 8,
    color: "var(--color-anu-text)",
  },
  labelStyle: { color: "var(--color-anu-text)", fontWeight: 600 as const },
  itemStyle: { color: "var(--color-anu-text)" },
};

export const DEFECT_COLORS = [
  OPS.danger,
  "#ff6b81",
  OPS.warning,
  OPS.blue,
  OPS.success,
  "#9b59b6",
  "#e67e22",
  "#f1c40f",
  "#2ecc71",
  "#3498db",
];

export function kpiColor(val: number, good: number, warn: number, reverse = false) {
  if (!reverse) return val >= good ? OPS.success : val >= warn ? OPS.warning : OPS.danger;
  return val <= good ? OPS.success : val <= warn ? OPS.warning : OPS.danger;
}

export function passColor(v: number | null) {
  if (v == null) return OPS.muted;
  if (v >= 99) return OPS.success;
  if (v >= 95) return OPS.warning;
  return OPS.danger;
}

export function formatPct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(1)}%`;
}
