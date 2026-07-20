import { BATCH_STATUS } from "@/lib/constants/plan-form";

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Parse shop-floor date strings and Excel serials → YYYY-MM-DD. */
export function parseFlexibleDate(value: unknown): string {
  if (value == null || value === "") return "";

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && value > 30000 && value < 60000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(value));
    return epoch.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const asNum = Number(raw);
  if (!Number.isNaN(asNum) && asNum > 30000 && asNum < 60000) {
    return parseFlexibleDate(asNum);
  }

  // DD.MM.YYYY or D.M.YYYY
  let m = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (m) {
    const iso = toIso(Number(m[3]), Number(m[2]), Number(m[1]));
    if (iso) return iso;
  }

  // DD/MM/YYYY or D/M/YYYY (day-first, factory convention)
  m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    const iso = toIso(Number(m[3]), Number(m[2]), Number(m[1]));
    if (iso) return iso;
  }

  // DD-MMM-YY / DD-MMM-YYYY (e.g. 20-Jul-26)
  m = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (m) {
    const month = MONTHS[m[2].toLowerCase()];
    if (month) {
      const iso = toIso(Number(m[3]), month, Number(m[1]));
      if (iso) return iso;
    }
  }

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return raw;
}

/**
 * Cell → string for IDs / free text.
 * Any value with the same shape is accepted (samples are format-only, not allow-lists).
 */
export function cellToString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && Number.isFinite(value)) {
    // Avoid scientific notation for long order / batch numbers from Excel
    if (Number.isInteger(value)) return value.toFixed(0);
    const rounded = Math.round(value * 1e6) / 1e6;
    return String(rounded);
  }
  return String(value).trim();
}

/** Status synonyms → canonical BATCH_STATUS. Empty → Planing. */
export function parseBatchStatus(raw: string): string {
  const v = raw.trim();
  if (!v) return "Planing";

  const lower = v.toLowerCase();
  if (lower === "planning" || lower === "planing") return "Planing";
  if (lower === "running") return "Running";
  if (lower === "finished" || lower === "finish" || lower === "done") return "Finished";

  if (BATCH_STATUS.includes(v as (typeof BATCH_STATUS)[number])) return v;

  throw new Error(`Invalid Status "${raw}" — use Planing, Running, or Finished`);
}

/** Keep size as entered (0, 00, 1, 2, 3, 4, …) — string, no coerce. */
export function parseSize(raw: string | unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Preserve leading zeros only when Excel sent a string; numbers stay as digits
    return String(raw);
  }
  return String(raw ?? "").trim();
}

/**
 * Item Qty (million) / Need AF Box — any number, integer or up to 2 decimals.
 * Format examples only: 0.1, 1.2, 5, 10, 20, 50 — not an allow-list.
 * Stored as entered (no unit conversion).
 */
export function parseDecimalQty(value: unknown, fieldLabel: string): string {
  if (value == null || value === "") return "";

  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value * 100) / 100;
    return String(rounded);
  }

  let raw = String(value).trim().replace(/,/g, "");
  if (!raw) return "";

  // Strip trailing % or spaces people sometimes paste
  raw = raw.replace(/%$/, "").trim();

  if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      throw new Error(
        `Invalid ${fieldLabel} "${value}" — use any number (integer or up to 2 decimals)`,
      );
    }
    const rounded = Math.round(n * 100) / 100;
    return String(rounded);
  }

  return raw.replace(/^\./, "0.");
}

/** Print blank → U */
export function parsePrintType(raw: string): string {
  const v = raw.trim();
  return v || "U";
}
