import { CUSTOMER_NAMES, COUNTRIES, METAL_OPTIONS, BOX_PACKING, INK_OPTIONS } from "@/lib/constants/plan-options";

export const BATCH_STATUS = ["Planing", "Running", "Finished"] as const;

export type PlanFormValues = {
  line: string;
  size: string;
  batch: string;
  sap_batch: string;
  production_order: string;
  inspection_lot: string;
  sales_order: string;
  sales_order_item: string;
  fert_code: string;
  semifinish_code: string;
  item_qty_million: string;
  need_af_box: string;
  customer_name: string;
  country: string;
  box_packing: string;
  planned_finish_date: string;
  to_be_desp_on: string;
  metal_detector: string;
  print_type: string;
  ink_cap: string;
  roller_des_cap: string;
  ink_body: string;
  roller_des_body: string;
  batch_status: string;
};

export function emptyPlanForm(): PlanFormValues {
  return {
    line: "H501",
    size: "",
    batch: "",
    sap_batch: "",
    production_order: "",
    inspection_lot: "",
    sales_order: "",
    sales_order_item: "",
    fert_code: "",
    semifinish_code: "",
    item_qty_million: "",
    need_af_box: "",
    customer_name: CUSTOMER_NAMES[0],
    country: "Thailand",
    box_packing: BOX_PACKING[0],
    planned_finish_date: "",
    to_be_desp_on: "",
    metal_detector: "Normal",
    print_type: "U",
    ink_cap: "-",
    roller_des_cap: "",
    ink_body: "-",
    roller_des_body: "",
    batch_status: "Planing",
  };
}

export function planToFormValues(plan: Record<string, unknown>): PlanFormValues {
  return {
    line: String(plan.line ?? "H501"),
    size: String(plan.size ?? ""),
    batch: String(plan.batch ?? ""),
    sap_batch: String(plan.sap_batch ?? ""),
    production_order: String(plan.production_order ?? ""),
    inspection_lot: String(plan.inspection_lot ?? ""),
    sales_order: String(plan.sales_order ?? ""),
    sales_order_item: String(plan.sales_order_item ?? ""),
    fert_code: String(plan.fert_code ?? ""),
    semifinish_code: String(plan.semifinish_code ?? ""),
    item_qty_million: plan.item_qty_million != null ? String(plan.item_qty_million) : "",
    need_af_box: plan.need_af_box != null ? String(plan.need_af_box) : "",
    customer_name: String(plan.customer_name ?? CUSTOMER_NAMES[0]),
    country: String(plan.country ?? "Thailand"),
    box_packing: String(plan.box_packing ?? BOX_PACKING[0]),
    planned_finish_date:
      typeof plan.planned_finish_date === "string" ? plan.planned_finish_date.slice(0, 10) : "",
    to_be_desp_on: typeof plan.to_be_desp_on === "string" ? plan.to_be_desp_on.slice(0, 10) : "",
    metal_detector: String(plan.metal_detector ?? "Normal"),
    print_type: String(plan.print_type ?? "U"),
    ink_cap: String(plan.ink_cap ?? "-"),
    roller_des_cap: String(plan.roller_des_cap ?? ""),
    ink_body: String(plan.ink_body ?? "-"),
    roller_des_body: String(plan.roller_des_body ?? ""),
    batch_status: String(plan.batch_status ?? "Planing"),
  };
}

export function planFormToPayload(form: PlanFormValues, userId?: string) {
  return {
    line: form.line,
    size: form.size || null,
    batch: form.batch,
    sap_batch: form.sap_batch || null,
    production_order: form.production_order || null,
    inspection_lot: form.inspection_lot || null,
    sales_order: form.sales_order || null,
    sales_order_item: form.sales_order_item || null,
    fert_code: form.fert_code || null,
    semifinish_code: form.semifinish_code || null,
    item_qty_million: parseFloat(form.item_qty_million) || 0,
    need_af_box: parseInt(form.need_af_box, 10) || 0,
    customer_name: form.customer_name || null,
    country: form.country || null,
    box_packing: form.box_packing || null,
    planned_finish_date: form.planned_finish_date || null,
    to_be_desp_on: form.to_be_desp_on || null,
    metal_detector: form.metal_detector || null,
    print_type: form.print_type || null,
    ink_cap: form.ink_cap || null,
    roller_des_cap: form.roller_des_cap || null,
    ink_body: form.ink_body || null,
    roller_des_body: form.roller_des_body || null,
    batch_status: form.batch_status,
    ...(userId ? { created_by: userId, updated_by: userId } : {}),
  };
}

export { CUSTOMER_NAMES, COUNTRIES, METAL_OPTIONS, BOX_PACKING, INK_OPTIONS };
