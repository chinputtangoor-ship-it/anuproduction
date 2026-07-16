export const PRODUCTION_LINES = Array.from(
  { length: 13 },
  (_, i) => `H5${String(i + 1).padStart(2, "0")}`,
);

export const BOX_STATUS = ["AF", "HP", "HUP", "Sort", "PS", "Scrap", "HFX"] as const;

/** Official factory defect list — docs/defect-list.md */
export const DEFECT_LIST = [
  "Hole",
  "Foreign Capsul",
  "Uncut Cap",
  "Uncut Body",
  "Loose Ring Inside",
  "Loose Ring Outside",
  "Rapid Dried",
  "Telescope",
  "String on End",
  "Double Dip",
  "Tripping",
  "Spiral Cut",
  "Dent Cap",
  "Dent Body",
  "Chipped Cap",
  "Chipped Body",
  "Folded Cap",
  "Loose Cap",
  "Loose Body",
  "Double Cap",
  "Collet Pinch",
  "Locked",
  "Rough Edge",
  "Uneven Cut",
  "Scratch",
  "Oil Ring",
  "Side Corrugation",
  "Star End",
  "Bubble",
  "Black Spot",
  "Color Spot",
  "Double Dome",
  "Dirty",
  "Mini Cap",
  "Mini Body",
  "Long Cap",
  "Long Body",
  "Unprint",
  "Stranger",
  "Incomplette Message",
  "Broken Print",
  "Non-Oriented Capsules",
  "Illigible print",
  "Wrong Color Ink",
  "Soiled",
  "Multiple Print",
  "Ink Speck",
  "Smudged Ink",
  "Ink Line",
  "Displaced Print",
  "Light Print",
  "Dark Print",
  "Minor Skewing",
  "Big Skewing",
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

export type BoxStatus = (typeof BOX_STATUS)[number];

export function statusNeedsDefect(status: string): boolean {
  return !STATUSES_WITHOUT_DEFECT.includes(status as (typeof STATUSES_WITHOUT_DEFECT)[number]);
}
