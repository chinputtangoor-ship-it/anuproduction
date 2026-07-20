"use client";

import { useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

type HotTable = "boxes" | "production_plan" | "rejection" | "backlog" | "profiles";

export function useRealtimeTables({
  enabled,
  tables,
  onEvent,
  filter,
}: {
  enabled: boolean;
  tables: HotTable[];
  onEvent: () => void;
  /** Optional postgres filter e.g. `id=eq.uuid` for profiles */
  filter?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const tableKey = tables.slice().sort().join(",");

  useEffect(() => {
    if (!enabled || tables.length === 0) return;

    const channel = supabase.channel(`anu-rt-${tableKey}-${filter ?? "all"}`);

    for (const table of tables) {
      const opts: {
        event: "*";
        schema: "public";
        table: string;
        filter?: string;
      } = {
        event: "*",
        schema: "public",
        table,
      };
      if (filter) opts.filter = filter;

      channel.on("postgres_changes", opts, () => {
        onEvent();
      });
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEvent identity varies; tableKey is enough
  }, [enabled, tableKey, filter, supabase]);
}
