export const PRODUCTION_LINES = Array.from(
  { length: 13 },
  (_, i) => `H5${String(i + 1).padStart(2, "0")}`,
);

export const BOX_STATUS = ["AF", "HP", "HUP", "Sort", "PS", "Scrap", "HFX"] as const;

export const DEFECT_LIST = [
  "Bubble",
  "Mashed",
  "Dent cap",
  "Dent body",
  "Loose",
  "Rough edge",
  "Ink speck",
  "Soiled",
  "Dirty",
  "Skewing",
  "Machine breakdown",
] as const;

export const STATUS_COLORS: Record<string, string> = {
  AF: "var(--color-anu-success)",
  Sort: "var(--color-anu-warning)",
  PS: "#f97316",
  HP: "#3b82f6",
  HUP: "#6366f1",
  HFX: "#a855f7",
  Scrap: "var(--color-anu-danger)",
};

export const STATUSES_WITHOUT_DEFECT = ["AF", "HP", "HUP"] as const;
