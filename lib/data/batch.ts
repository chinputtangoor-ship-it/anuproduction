import { withActorField, withUpdatedBy } from "@/lib/audit/stamp";
import { fetchProfileNames } from "@/lib/data/boxes";
import { supabase } from "@/lib/supabase";

export type BatchPlan = {
  id: string;
  line: string;
  size: string | null;
  batch: string;
  sap_batch: string | null;
  production_order: string | null;
  sales_order: string | null;
  sales_order_item: string | null;
  fert_code: string | null;
  semifinish_code: string | null;
  batch_status: string | null;
  planned_finish_date: string | null;
  batch_finish_date: string | null;
  created_at: string | null;
};

export type BatchBox = {
  id: string;
  line: string;
  batch: string;
  box_number: number;
  status: string;
  defects: string | null;
  net_weight_kg: number | null;
  total_weight_kg: number | null;
  weight_by: string | null;
  check_by: string | null;
  recorded_by: string | null;
  recorded_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
};

export type BatchRejection = {
  id: string;
  line: string;
  batch: string;
  ats_kg: number | null;
  print_kg: number | null;
  cam_kg: number | null;
  total_kg: number | null;
  check_by: string | null;
  created_at: string | null;
};

export type BoxChangeLog = {
  id: string;
  box_id: string;
  batch: string;
  box_number: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
};

export type BatchDetail = {
  plan: BatchPlan | null;
  boxes: BatchBox[];
  rejections: BatchRejection[];
  names: Record<string, string>;
};

const TRACKED_FIELDS = [
  "status",
  "defects",
  "net_weight_kg",
  "total_weight_kg",
  "weight_by",
  "check_by",
] as const;

type TrackedField = (typeof TRACKED_FIELDS)[number];

function toDisplay(value: unknown): string | null {
  if (value == null || value === "") return null;
  return String(value);
}

export async function fetchBatchDetail(batch: string): Promise<BatchDetail> {
  const trimmed = batch.trim();
  const [{ data: plan }, { data: boxes }, { data: rejections }] = await Promise.all([
    supabase.from("production_plan").select("*").eq("batch", trimmed).maybeSingle(),
    supabase.from("boxes").select("*").eq("batch", trimmed).order("box_number"),
    supabase.from("rejection").select("*").eq("batch", trimmed).order("created_at"),
  ]);

  const boxRows = (boxes ?? []) as BatchBox[];
  const rejRows = (rejections ?? []) as BatchRejection[];

  const ids = [
    ...boxRows.flatMap((b) => [b.weight_by, b.check_by, b.recorded_by, b.updated_by]),
    ...rejRows.map((r) => r.check_by),
  ].filter((id): id is string => Boolean(id));

  const names = await fetchProfileNames(ids);

  return {
    plan: (plan as BatchPlan | null) ?? null,
    boxes: boxRows,
    rejections: rejRows,
    names,
  };
}

export async function fetchBoxChangeLog(boxId: string): Promise<{
  rows: BoxChangeLog[];
  names: Record<string, string>;
}> {
  const { data, error } = await supabase
    .from("box_change_log")
    .select("*")
    .eq("box_id", boxId)
    .order("changed_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as BoxChangeLog[];
  const names = await fetchProfileNames(rows.map((r) => r.changed_by).filter(Boolean) as string[]);
  return { rows, names };
}

export type BoxEditInput = {
  status: string;
  defects: string | null;
  net_weight_kg: number | null;
  total_weight_kg: number | null;
};

export async function updateBoxWithHistory(
  box: BatchBox,
  next: BoxEditInput,
  userId: string,
): Promise<BatchBox> {
  const weightChanged =
    toDisplay(box.net_weight_kg) !== toDisplay(next.net_weight_kg) ||
    toDisplay(box.total_weight_kg) !== toDisplay(next.total_weight_kg);

  let payload: Record<string, unknown> = {
    status: next.status,
    defects: next.defects,
    net_weight_kg: next.net_weight_kg,
    total_weight_kg: next.total_weight_kg,
  };

  payload = withUpdatedBy(payload, userId);
  if (weightChanged) {
    payload = withActorField(payload, "weight_by", userId);
  }

  const { data, error } = await supabase
    .from("boxes")
    .update(payload)
    .eq("id", box.id)
    .select("*")
    .single();

  if (error) throw error;

  const updated = data as BatchBox;
  const logRows: {
    box_id: string;
    batch: string;
    box_number: number;
    field_name: string;
    old_value: string | null;
    new_value: string | null;
    changed_by: string;
  }[] = [];

  for (const field of TRACKED_FIELDS) {
    const oldVal = toDisplay(box[field as TrackedField]);
    const newVal = toDisplay(updated[field as TrackedField]);
    if (oldVal === newVal) continue;
    logRows.push({
      box_id: box.id,
      batch: box.batch,
      box_number: box.box_number,
      field_name: field,
      old_value: oldVal,
      new_value: newVal,
      changed_by: userId,
    });
  }

  if (logRows.length > 0) {
    const { error: logError } = await supabase.from("box_change_log").insert(logRows);
    if (logError) throw logError;
  }

  return updated;
}
