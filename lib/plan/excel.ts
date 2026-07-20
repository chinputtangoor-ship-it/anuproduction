import type { PlanFormValues } from "@/lib/constants/plan-form";
import { planFormToPayload } from "@/lib/constants/plan-form";
import { buildColumnIndex } from "@/lib/plan/column-aliases";
import { PLAN_EXCEL_HEADERS } from "@/lib/plan/excel-headers";
import {
  cellToString,
  parseBatchStatus,
  parseDecimalQty,
  parseFlexibleDate,
  parsePrintType,
  parseSize,
} from "@/lib/plan/value-parsers";

export { PLAN_EXCEL_HEADERS } from "@/lib/plan/excel-headers";

export type PlanImportRowError = {
  row: number;
  message: string;
};

export type PlanImportResult = {
  /** True when at least one valid row was parsed (partial OK). */
  ok: boolean;
  rows: PlanFormValues[];
  errors: PlanImportRowError[];
  missingColumns?: string[];
  extraMessage?: string;
};

type ColIndex = Partial<Record<(typeof PLAN_EXCEL_HEADERS)[number], number>>;

function rowToForm(cells: unknown[], colIndex: ColIndex): PlanFormValues | null {
  const get = (header: (typeof PLAN_EXCEL_HEADERS)[number]) => {
    const idx = colIndex[header];
    if (idx == null) return "";
    return cellToString(cells[idx]);
  };

  const batch = get("Batch");
  if (!batch) return null;

  const status = parseBatchStatus(get("Status"));

  const sizeCell =
    colIndex["Size"] != null ? cells[colIndex["Size"]!] : get("Size");
  const itemQtyCell =
    colIndex["Item Qty (K)"] != null ? cells[colIndex["Item Qty (K)"]!] : get("Item Qty (K)");
  const needAfCell =
    colIndex["Need AF Box"] != null ? cells[colIndex["Need AF Box"]!] : get("Need AF Box");

  return {
    line: get("Line") || "H501",
    size: parseSize(sizeCell),
    batch,
    sap_batch: get("SAP Batch"),
    production_order: get("Prod. Order"),
    inspection_lot: get("Insp. Lot"),
    sales_order: get("Sales Order"),
    sales_order_item: get("SO Item"),
    fert_code: get("FERT Code"),
    semifinish_code: get("Semi Code"),
    item_qty_million: parseDecimalQty(itemQtyCell, "Item Qty (K)"),
    need_af_box: parseDecimalQty(needAfCell, "Need AF Box"),
    customer_name: get("Customer"),
    country: get("Country"),
    box_packing: get("Box Packing"),
    planned_finish_date: parseFlexibleDate(cells[colIndex["Plan Finish"] ?? -1] ?? get("Plan Finish")),
    to_be_desp_on: parseFlexibleDate(cells[colIndex["To be Desp."] ?? -1] ?? get("To be Desp.")),
    metal_detector: get("Metal Det.") || "Normal",
    // D11: Print blank → U; ink / roller may stay blank
    print_type: parsePrintType(get("Print")),
    ink_cap: get("Ink Cap"),
    roller_des_cap: get("Roller Cap"),
    ink_body: get("Ink Body"),
    roller_des_body: get("Roller Body"),
    batch_status: status,
  };
}

export function parsePlanWorkbook(rows: unknown[][]): PlanImportResult {
  if (rows.length === 0) {
    return { ok: false, rows: [], errors: [{ row: 0, message: "File is empty" }] };
  }

  const headerRow = rows[0].map((c) => cellToString(c));
  const { colIndex, missingRequired } = buildColumnIndex(headerRow);

  if (missingRequired.length > 0) {
    return {
      ok: false,
      rows: [],
      errors: [],
      missingColumns: missingRequired,
      extraMessage: `Missing columns: ${missingRequired.join(", ")}`,
    };
  }

  const parsed: PlanFormValues[] = [];
  const errors: PlanImportRowError[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const allEmpty = cells.every((c) => !cellToString(c));
    if (allEmpty) continue;

    try {
      const form = rowToForm(cells, colIndex);
      if (!form) {
        errors.push({ row: i + 1, message: "Batch is required" });
        continue;
      }
      parsed.push(form);
    } catch (e) {
      errors.push({
        row: i + 1,
        message: e instanceof Error ? e.message : "Invalid row",
      });
    }
  }

  return {
    ok: parsed.length > 0,
    rows: parsed,
    errors,
  };
}

export function planFormsToPayloads(forms: PlanFormValues[], userId?: string) {
  return forms.map((f) => planFormToPayload(f, userId));
}

export async function parsePlanExcelFile(file: File): Promise<PlanImportResult> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    return { ok: false, rows: [], errors: [{ row: 0, message: "No worksheet found" }] };
  }
  // raw:false → use Excel display text so Size "00", long IDs, etc. keep shop-floor format
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  return parsePlanWorkbook(rows);
}

const SAMPLE_ROW = [
  "H503",
  "0",
  "H503260717",
  "4900007638",
  "750000094134",
  "30000143424",
  "530903879",
  "50",
  "UN78317",
  "GBRRN-SN-CT0000CT0000-E10",
  "10",
  "100",
  "ACG NORTH AMERICA LLC",
  "USA",
  "Box 675",
  "21.07.2026",
  "3/8/2026",
  "Normal",
  "U",
  "",
  "",
  "",
  "",
  "Running",
];

export async function downloadPlanTemplate(filename = "anu-plan-template.xlsx") {
  const XLSX = await import("xlsx");
  const notes = [
    "Sample row = FORMAT examples only — any value with the same shape is OK",
    "Item Qty (K) = million units; any number e.g. 0.1, 1.2, 5, 10, 20, 50 (0–2 decimals)",
    "Need AF Box = boxes; any number (0–2 decimals OK)",
    "Size / codes / customer / packing = free text (not limited to sample values)",
    "Blank Print → U · Blank OK: Ink Cap, Roller Cap, Ink Body, Roller Body, Status (→ Planing)",
    "Dates: DD.MM.YYYY · D/M/YYYY · DD-MMM-YY · Excel date",
    "Status: Planing | Running | Finished only",
  ];
  const ws = XLSX.utils.aoa_to_sheet([
    [...PLAN_EXCEL_HEADERS] as string[],
    SAMPLE_ROW,
    [],
    ["Notes:", ...notes],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plan");
  XLSX.writeFile(wb, filename);
}
