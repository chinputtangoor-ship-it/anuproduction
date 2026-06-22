import { supabase } from "@/lib/supabase";

/** Next QC box is always sequential — max existing + 1 (cannot skip). */
export async function fetchNextQcBoxNumber(batch: string): Promise<number> {
  const { data, error } = await supabase
    .from("qc_inspection")
    .select("box_number")
    .eq("batch", batch)
    .order("box_number", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? data[0].box_number + 1 : 1;
}

export async function countQcBoxes(batch: string): Promise<number> {
  const { count, error } = await supabase
    .from("qc_inspection")
    .select("*", { count: "exact", head: true })
    .eq("batch", batch);

  if (error) throw error;
  return count ?? 0;
}
