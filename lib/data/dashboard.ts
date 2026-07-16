import { supabase } from "@/lib/supabase";

const PLAN_SELECT =
  "id, line, batch, batch_status, planned_finish_date, need_af_box, created_at, updated_at, size, fert_code";

const BOX_SELECT =
  "id, line, batch, box_number, status, defects, net_weight_kg, total_weight_kg, recorded_at";

const REJECTION_SELECT =
  "id, line, batch, ats_kg, print_kg, cam_kg, total_kg, recorded_at";

export async function fetchDashboardPlans() {
  const { data, error } = await supabase
    .from("production_plan")
    .select(PLAN_SELECT)
    .order("line");
  if (error) throw error;
  return data ?? [];
}

export async function fetchDashboardBoxes() {
  const { data, error } = await supabase.from("boxes").select(BOX_SELECT);
  if (error) throw error;
  return data ?? [];
}

export async function fetchDashboardRejections() {
  const { data, error } = await supabase.from("rejection").select(REJECTION_SELECT);
  if (error) throw error;
  return data ?? [];
}

export async function fetchDeptDashboardBundle() {
  const [plans, boxes, rejections] = await Promise.all([
    fetchDashboardPlans(),
    fetchDashboardBoxes(),
    fetchDashboardRejections(),
  ]);
  return { plans, boxes, rejections };
}
