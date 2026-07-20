import { PLAN_EXCEL_HEADERS } from "@/lib/plan/excel-headers";

/** Normalize header text for fuzzy matching. */
export function normalizeHeader(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[._]+/g, " ")
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s*\)\s*/g, ")");
}

type CanonicalHeader = (typeof PLAN_EXCEL_HEADERS)[number];

/** Alias → canonical English header. */
const ALIAS_TO_CANONICAL: Record<string, CanonicalHeader> = {
  line: "Line",
  size: "Size",
  batch: "Batch",
  "sap batch": "SAP Batch",
  sapbatch: "SAP Batch",
  "prod order": "Prod. Order",
  "prod. order": "Prod. Order",
  "production order": "Prod. Order",
  "insp lot": "Insp. Lot",
  "insp. lot": "Insp. Lot",
  "inspection lot": "Insp. Lot",
  "sales order": "Sales Order",
  "so item": "SO Item",
  "sales order item": "SO Item",
  "fert code": "FERT Code",
  fert: "FERT Code",
  "semi code": "Semi Code",
  semicode: "Semi Code",
  "semifinish code": "Semi Code",
  "item qty (k)": "Item Qty (K)",
  "item qty": "Item Qty (K)",
  "item qty k": "Item Qty (K)",
  "need af box": "Need AF Box",
  "need af": "Need AF Box",
  needaf: "Need AF Box",
  customer: "Customer",
  "customer name": "Customer",
  country: "Country",
  "box packing": "Box Packing",
  packing: "Box Packing",
  "plan finish": "Plan Finish",
  "planned finish": "Plan Finish",
  "finish date": "Plan Finish",
  "to be desp": "To be Desp.",
  "to be desp.": "To be Desp.",
  "to be despatched": "To be Desp.",
  desp: "To be Desp.",
  "metal det": "Metal Det.",
  "metal det.": "Metal Det.",
  "metal detector": "Metal Det.",
  print: "Print",
  "ink cap": "Ink Cap",
  "roller cap": "Roller Cap",
  "ink body": "Ink Body",
  "roller body": "Roller Body",
  status: "Status",
  "batch status": "Status",
};

/** Columns that must be present in the file (others may be blank per row). */
export const REQUIRED_PLAN_COLUMNS: CanonicalHeader[] = [
  "Line",
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
];

export function resolveCanonicalHeader(raw: string): CanonicalHeader | null {
  const n = normalizeHeader(raw);
  if (!n) return null;

  for (const h of PLAN_EXCEL_HEADERS) {
    if (normalizeHeader(h) === n) return h;
  }

  return ALIAS_TO_CANONICAL[n] ?? null;
}

export function buildColumnIndex(headerRow: string[]): {
  colIndex: Partial<Record<CanonicalHeader, number>>;
  missingRequired: CanonicalHeader[];
} {
  const colIndex: Partial<Record<CanonicalHeader, number>> = {};

  headerRow.forEach((h, i) => {
    const canonical = resolveCanonicalHeader(h);
    if (canonical && colIndex[canonical] == null) {
      colIndex[canonical] = i;
    }
  });

  const missingRequired = REQUIRED_PLAN_COLUMNS.filter((h) => colIndex[h] == null);
  return { colIndex, missingRequired };
}
