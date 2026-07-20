import { createClient } from "@/lib/supabase/client";
import {
  defaultFlagMap,
  FEATURE_FLAG_KEYS,
  type FeatureFlagKey,
} from "@/lib/features/registry";

export async function fetchFeatureFlagMap(): Promise<Record<FeatureFlagKey, boolean>> {
  const map = defaultFlagMap();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("app_feature_flags")
    .select("key, enabled")
    .in("key", [...FEATURE_FLAG_KEYS]);

  if (error || !data) return map;

  for (const row of data) {
    const key = row.key as FeatureFlagKey;
    if (FEATURE_FLAG_KEYS.includes(key)) {
      map[key] = Boolean(row.enabled);
    }
  }
  return map;
}
