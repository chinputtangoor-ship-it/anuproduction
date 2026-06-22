const STORAGE_KEY = "anu_production_ctx";

export type ProductionContext = {
  line: string;
  batch: string;
};

export function readProductionContext(): ProductionContext | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProductionContext;
    if (!parsed.line || !parsed.batch) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeProductionContext(ctx: ProductionContext): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
}

export function clearProductionContext(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
