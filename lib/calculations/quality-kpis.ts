import { startOfToday } from "@/lib/calculations/period";

export type BoxRow = {
  line: string;
  batch: string;
  box_number: number;
  status: string;
  defects: string | null;
  recorded_at: string | null;
};

export type PlanRow = {
  line: string;
  batch: string;
  batch_status: string | null;
  need_af_box: number | null;
};

export type QualityKpis = {
  gradedToday: number;
  gradedTotal: number;
  gradeMix: { name: string; count: number }[];
  topDefects: { name: string; count: number }[];
  gradingQueue: {
    batch: string;
    line: string;
    graded: number;
    target: number;
    remaining: number;
  }[];
};

export function computeQualityKpis(boxes: BoxRow[], plans: PlanRow[]): QualityKpis {
  const today = startOfToday();
  const gradedToday = boxes.filter(
    (b) => b.recorded_at && new Date(b.recorded_at) >= today,
  ).length;

  const gradeCounts: Record<string, number> = {};
  for (const b of boxes) {
    gradeCounts[b.status] = (gradeCounts[b.status] || 0) + 1;
  }
  const gradeMix = Object.entries(gradeCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const defectCounts: Record<string, number> = {};
  for (const b of boxes) {
    if (!b.defects) continue;
    for (const part of b.defects.split(",")) {
      const name = part.trim();
      if (!name || ["nan", "none", "-"].includes(name.toLowerCase())) continue;
      defectCounts[name] = (defectCounts[name] || 0) + 1;
    }
  }
  const topDefects = Object.entries(defectCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const running = plans.filter((p) => p.batch_status === "Running");
  const gradingQueue = running
    .map((p) => {
      const graded = boxes.filter((b) => b.batch === p.batch).length;
      const target = p.need_af_box || 0;
      return {
        batch: p.batch,
        line: p.line,
        graded,
        target,
        remaining: Math.max(target - graded, 0),
      };
    })
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, 12);

  return {
    gradedToday,
    gradedTotal: boxes.length,
    gradeMix,
    topDefects,
    gradingQueue,
  };
}
