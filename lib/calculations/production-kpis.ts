import { PRODUCTION_LINES } from "@/lib/constants/production";

export type PlanRow = {
  line: string;
  batch: string;
  batch_status: string | null;
  need_af_box: number | null;
};

export type BoxRow = {
  line: string;
  batch: string;
  status: string;
};

export type ProductionKpis = {
  planing: number;
  running: number;
  finished: number;
  byLine: {
    line: string;
    planing: number;
    running: number;
    finished: number;
    af: number;
    target: number;
    progressPct: number;
  }[];
  runningBatches: {
    batch: string;
    line: string;
    af: number;
    target: number;
    progressPct: number;
  }[];
};

export function computeProductionKpis(plans: PlanRow[], boxes: BoxRow[]): ProductionKpis {
  const planing = plans.filter((p) => p.batch_status === "Planing").length;
  const running = plans.filter((p) => p.batch_status === "Running").length;
  const finished = plans.filter((p) => p.batch_status === "Finished").length;

  const byLine = PRODUCTION_LINES.map((line) => {
    const rows = plans.filter((p) => p.line === line);
    const runningRows = rows.filter((p) => p.batch_status === "Running");
    const batches = new Set(runningRows.map((p) => p.batch));
    const af = boxes.filter((b) => batches.has(b.batch) && b.status === "AF").length;
    const target = runningRows.reduce((s, p) => s + (p.need_af_box || 0), 0);
    return {
      line,
      planing: rows.filter((p) => p.batch_status === "Planing").length,
      running: runningRows.length,
      finished: rows.filter((p) => p.batch_status === "Finished").length,
      af,
      target,
      progressPct: target > 0 ? Math.min((af / target) * 100, 110) : 0,
    };
  }).filter((r) => r.planing + r.running + r.finished > 0);

  const runningBatches = plans
    .filter((p) => p.batch_status === "Running")
    .map((p) => {
      const af = boxes.filter((b) => b.batch === p.batch && b.status === "AF").length;
      const target = p.need_af_box || 0;
      return {
        batch: p.batch,
        line: p.line,
        af,
        target,
        progressPct: target > 0 ? Math.min((af / target) * 100, 110) : 0,
      };
    })
    .sort((a, b) => a.progressPct - b.progressPct);

  return { planing, running, finished, byLine, runningBatches };
}
