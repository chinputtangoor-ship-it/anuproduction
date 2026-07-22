import { withUpdatedBy } from "@/lib/audit/stamp";
import { supabase } from "@/lib/supabase";

/**
 * Start a plan by id (Plan page Start button).
 * Only updates rows still in Planing — safe if already Running.
 */
export async function startBatchRunningById(
  planId: string,
  userId: string | null | undefined,
): Promise<{ error: string | null }> {
  const { error, data } = await supabase
    .from("production_plan")
    .update(withUpdatedBy({ batch_status: "Running" }, userId))
    .eq("id", planId)
    .eq("batch_status", "Planing")
    .select("id");

  if (error) return { error: error.message };
  if (!data?.length) {
    // Already Running/Finished or missing — not a hard failure for UI refresh
    return { error: null };
  }
  return { error: null };
}

/**
 * Auto-start from Box Grade after box #1 is graded.
 * Uses SECURITY DEFINER RPC so operators (no plan UPDATE RLS) can flip Planing→Running.
 */
export async function startBatchFromFirstGrade(
  line: string,
  batch: string,
): Promise<{ started: boolean; error: string | null }> {
  const { data, error } = await supabase.rpc("start_batch_from_first_grade", {
    p_line: line,
    p_batch: batch,
  });

  if (error) return { started: false, error: error.message };
  return { started: Boolean(data), error: null };
}
