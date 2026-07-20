/** Canonical Excel header row for plan import (docs/decisions.md D6). */
export const PLAN_EXCEL_HEADERS = [
  "Line",
  "Size",
  "Batch",
  "SAP Batch",
  "Prod. Order",
  "Insp. Lot",
  "Sales Order",
  "SO Item",
  "FERT Code",
  "Semi Code",
  "Item Qty (K)",
  "Need AF Box",
  "Customer",
  "Country",
  "Box Packing",
  "Plan Finish",
  "To be Desp.",
  "Metal Det.",
  "Print",
  "Ink Cap",
  "Roller Cap",
  "Ink Body",
  "Roller Body",
  "Status",
] as const;

export type PlanExcelHeader = (typeof PLAN_EXCEL_HEADERS)[number];
