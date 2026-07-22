import { PRODUCTION_LINES } from "@/lib/constants/production";

export type LineOnlinePlan = {
  line: string;
  batch_status: string | null;
};

export type LineOnlineStatus = {
  line: string;
  online: boolean;
  runningBatches: number;
};

/** Online = at least one Running batch on that line in the plan set provided. */
export function computeLineOnlineStatus(plans: LineOnlinePlan[]): LineOnlineStatus[] {
  return PRODUCTION_LINES.map((line) => {
    const runningBatches = plans.filter(
      (p) => p.line === line && p.batch_status === "Running",
    ).length;
    return { line, online: runningBatches > 0, runningBatches };
  });
}
