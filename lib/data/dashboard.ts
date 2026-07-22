import { supabase } from "@/lib/supabase";

const PLAN_SELECT =
  "id, line, batch, batch_status, planned_finish_date, need_af_box, created_at, updated_at, size, fert_code";

const BOX_SELECT =
  "id, line, batch, box_number, status, defects, net_weight_kg, total_weight_kg, recorded_at";

const REJECTION_SELECT =
  "id, line, batch, ats_kg, print_kg, cam_kg, total_kg, recorded_at";

const BACKLOG_SELECT = "id, line, total_backlog, recorded_at";

const CAMERA_SELECT =
  "id, line, batch, cam1_pass_rate, cam2_pass_rate, cam1_total_qty, cam2_total_qty, cam1_defects, cam2_defects, recorded_at";

const REPASS_SELECT =
  "id, line, batch, result_status, previous_status, new_defects, recorded_at";

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

export async function fetchDashboardBacklog() {
  const { data, error } = await supabase.from("backlog").select(BACKLOG_SELECT);
  if (error) throw error;
  return data ?? [];
}

export async function fetchDashboardCamera() {
  const { data, error } = await supabase.from("camera_inspection").select(CAMERA_SELECT);
  if (error) throw error;
  return data ?? [];
}

export async function fetchDashboardRepass() {
  const { data, error } = await supabase.from("repass").select(REPASS_SELECT);
  if (error) throw error;
  return data ?? [];
}

export async function fetchDeptDashboardBundle() {
  const [plans, boxes, rejections, backlog, camera, repass] = await Promise.all([
    fetchDashboardPlans(),
    fetchDashboardBoxes(),
    fetchDashboardRejections(),
    fetchDashboardBacklog(),
    fetchDashboardCamera(),
    fetchDashboardRepass(),
  ]);
  return { plans, boxes, rejections, backlog, camera, repass };
}
