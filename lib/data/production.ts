import { supabase } from "@/lib/supabase";

export type BatchStatusFilter = "Planing" | "Running" | "Finished";

export type ProductionBatch = {
  batch: string;
  line: string;
  batch_status: string;
};

/** @deprecated alias — prefer ProductionBatch */
export type RunningBatch = ProductionBatch;

/** Production data entry should only target actively running batches. */
export async function fetchRunningBatches(line: string): Promise<ProductionBatch[]> {
  return fetchBatchesByStatus(line, ["Running"]);
}

/** Box Grade (Phase 10B): Planing + Running. */
export async function fetchGradeEligibleBatches(line: string): Promise<ProductionBatch[]> {
  return fetchBatchesByStatus(line, ["Planing", "Running"]);
}

export async function fetchBatchesByStatus(
  line: string,
  statuses: BatchStatusFilter[],
): Promise<ProductionBatch[]> {
  const { data, error } = await supabase
    .from("production_plan")
    .select("batch, line, batch_status")
    .eq("line", line)
    .in("batch_status", statuses)
    .order("batch");

  if (error) throw error;
  return data ?? [];
}

export async function isBatchRunning(line: string, batch: string): Promise<boolean> {
  const batches = await fetchRunningBatches(line);
  return batches.some((item) => item.batch === batch);
}
