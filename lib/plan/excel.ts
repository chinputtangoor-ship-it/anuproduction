import type { PlanFormValues } from "@/lib/constants/plan-form";
import { BATCH_STATUS } from "@/lib/constants/plan-form";
import { planFormToPayload } from "@/lib/constants/plan-form";

/** Excel header row — must match import file exactly (docs/decisions.md D6). */
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

export type PlanImportRowError = {
  row: number;
  message: string;
};

export type PlanImportResult = {
  ok: boolean;
  rows: PlanFormValues[];
  errors: PlanImportRowError[];
  missingColumns?: string[];
  extraMessage?: string;
};

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

function normalizeDate(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const n = Number(value);
  if (!Number.isNaN(n) && n > 30000 && n < 60000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(n));
    return epoch.toISOString().slice(0, 10);
  }
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return value;
}

function rowToForm(cells: unknown[], colIndex: Record<string, number>): PlanFormValues | null {
  const get = (header: (typeof PLAN_EXCEL_HEADERS)[number]) =>
    cellToString(cells[colIndex[header]]);

  const batch = get("Batch");
  if (!batch) return null;

  const status = get("Status") || "Planing";
  if (!BATCH_STATUS.includes(status as (typeof BATCH_STATUS)[number])) {
    throw new Error(`Invalid Status "${status}" — use Planing, Running, or Finished`);
  }

  return {
    line: get("Line") || "H501",
    size: get("Size"),
    batch,
    sap_batch: get("SAP Batch"),
    production_order: get("Prod. Order"),
    inspection_lot: get("Insp. Lot"),
    sales_order: get("Sales Order"),
    sales_order_item: get("SO Item"),
    fert_code: get("FERT Code"),
    semifinish_code: get("Semi Code"),
    item_qty_million: get("Item Qty (K)"),
    need_af_box: get("Need AF Box"),
    customer_name: get("Customer"),
    country: get("Country"),
    box_packing: get("Box Packing"),
    planned_finish_date: normalizeDate(get("Plan Finish")),
    to_be_desp_on: normalizeDate(get("To be Desp.")),
    metal_detector: get("Metal Det.") || "Normal",
    print_type: get("Print") || "U",
    ink_cap: get("Ink Cap") || "-",
    roller_des_cap: get("Roller Cap"),
    ink_body: get("Ink Body") || "-",
    roller_des_body: get("Roller Body"),
    batch_status: status,
  };
}

export function parsePlanWorkbook(rows: unknown[][]): PlanImportResult {
  if (rows.length === 0) {
    return { ok: false, rows: [], errors: [{ row: 0, message: "File is empty" }] };
  }

  const headerRow = rows[0].map((c) => cellToString(c));
  const missingColumns = PLAN_EXCEL_HEADERS.filter((h) => !headerRow.includes(h));
  if (missingColumns.length > 0) {
    return {
      ok: false,
      rows: [],
      errors: [],
      missingColumns,
      extraMessage: `Missing columns: ${missingColumns.join(", ")}`,
    };
  }

  const colIndex: Record<string, number> = {};
  headerRow.forEach((h, i) => {
    colIndex[h] = i;
  });

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
    ok: errors.length === 0 && parsed.length > 0,
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
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  return parsePlanWorkbook(rows);
}

export async function downloadPlanTemplate(filename = "anu-plan-template.xlsx") {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([PLAN_EXCEL_HEADERS as unknown as string[]]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Plan");
  XLSX.writeFile(wb, filename);
}
