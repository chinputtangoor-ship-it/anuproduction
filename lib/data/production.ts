import { supabase } from "@/lib/supabase";

export type RunningBatch = {
  batch: string;
  line: string;
  batch_status: string;
};

/** Production data entry should only target actively running batches. */
export async function fetchRunningBatches(line: string): Promise<RunningBatch[]> {
  const { data, error } = await supabase
    .from("production_plan")
    .select("batch, line, batch_status")
    .eq("line", line)
    .eq("batch_status", "Running")
    .order("batch");

  if (error) throw error;
  return data ?? [];
}

export async function isBatchRunning(line: string, batch: string): Promise<boolean> {
  const batches = await fetchRunningBatches(line);
  return batches.some((item) => item.batch === batch);
}
