import { supabase } from "@/lib/supabase";

export type GradedBox = {
  id: string;
  line: string;
  batch: string;
  box_number: number;
  status: string;
  defects: string | null;
  net_weight_kg: number | null;
  total_weight_kg: number | null;
  check_by: string | null;
  weight_by: string | null;
};

export async function fetchNextBoxNumber(batch: string): Promise<number> {
  const { data } = await supabase
    .from("boxes")
    .select("box_number")
    .eq("batch", batch)
    .order("box_number", { ascending: false })
    .limit(1);

  return data && data.length > 0 ? data[0].box_number + 1 : 1;
}

/** Boxes graded by QC but not yet weighed in Post Production. */
export async function fetchPendingWeighBoxes(batch: string): Promise<GradedBox[]> {
  const { data, error } = await supabase
    .from("boxes")
    .select(
      "id, line, batch, box_number, status, defects, net_weight_kg, total_weight_kg, check_by, weight_by",
    )
    .eq("batch", batch)
    .is("net_weight_kg", null)
    .order("box_number", { ascending: true });

  if (error) throw error;
  return (data ?? []) as GradedBox[];
}

export async function fetchProfileNames(ids: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};

  const { data } = await supabase
    .from("profiles")
    .select("id, fullname")
    .in("id", unique);

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.id] = row.fullname;
  }
  return map;
}
