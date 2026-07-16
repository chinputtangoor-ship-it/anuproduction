import { PRODUCTION_LINES } from "@/lib/constants/production";

export type PlanRow = {
  line: string;
  batch: string;
  batch_status: string | null;
  planned_finish_date: string | null;
  need_af_box: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PlannerKpis = {
  total: number;
  planing: number;
  running: number;
  finished: number;
  dueSoon: { batch: string; line: string; planned_finish_date: string; daysLeft: number }[];
  byLine: { line: string; planing: number; running: number; finished: number }[];
  recentUpdates: { batch: string; line: string; status: string; at: string }[];
};

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr.slice(0, 10) + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function computePlannerKpis(plans: PlanRow[]): PlannerKpis {
  const planing = plans.filter((p) => p.batch_status === "Planing").length;
  const running = plans.filter((p) => p.batch_status === "Running").length;
  const finished = plans.filter((p) => p.batch_status === "Finished").length;

  const dueSoon = plans
    .filter(
      (p) =>
        p.planned_finish_date &&
        p.batch_status !== "Finished" &&
        daysUntil(p.planned_finish_date) <= 7,
    )
    .map((p) => ({
      batch: p.batch,
      line: p.line,
      planned_finish_date: p.planned_finish_date!.slice(0, 10),
      daysLeft: daysUntil(p.planned_finish_date!),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 10);

  const byLine = PRODUCTION_LINES.map((line) => {
    const rows = plans.filter((p) => p.line === line);
    return {
      line,
      planing: rows.filter((p) => p.batch_status === "Planing").length,
      running: rows.filter((p) => p.batch_status === "Running").length,
      finished: rows.filter((p) => p.batch_status === "Finished").length,
    };
  }).filter((r) => r.planing + r.running + r.finished > 0);

  const recentUpdates = [...plans]
    .filter((p) => p.updated_at || p.created_at)
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime(),
    )
    .slice(0, 8)
    .map((p) => ({
      batch: p.batch,
      line: p.line,
      status: p.batch_status || "-",
      at: (p.updated_at || p.created_at || "").slice(0, 16).replace("T", " "),
    }));

  return {
    total: plans.length,
    planing,
    running,
    finished,
    dueSoon,
    byLine,
    recentUpdates,
  };
}
