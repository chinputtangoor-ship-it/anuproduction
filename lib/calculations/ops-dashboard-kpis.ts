import { BOX_STATUS, PRODUCTION_LINES } from "@/lib/constants/production";
import { computeLineOnlineStatus } from "@/lib/calculations/line-online";
import {
  computeMaterialBalance,
  type MaterialBalanceRow,
} from "@/lib/calculations/material-balance";

export type OpsPlanRow = {
  line: string;
  batch: string;
  batch_status: string | null;
  planned_finish_date: string | null;
  need_af_box: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type OpsBoxRow = {
  id?: string;
  line: string;
  batch: string;
  box_number: number | string;
  status: string;
  defects: string | null;
  net_weight_kg: number | null;
  recorded_at: string | null;
};

export type OpsRejectionRow = {
  line: string;
  batch: string;
  ats_kg: number | null;
  print_kg: number | null;
  cam_kg: number | null;
  total_kg: number | null;
  recorded_at?: string | null;
};

export type OpsBacklogRow = {
  line: string;
  total_backlog: number | null;
  recorded_at: string | null;
};

export type OpsCameraRow = {
  line: string;
  cam1_pass_rate: number | null;
  cam2_pass_rate: number | null;
  cam1_total_qty: number | null;
  cam2_total_qty: number | null;
  cam1_defects: string | null;
  cam2_defects: string | null;
  recorded_at?: string | null;
};

export type OpsRepassRow = {
  line: string;
  result_status: string | null;
  recorded_at?: string | null;
};

const DEFECT_GRADE_STATUSES = new Set(["Sort", "PS", "Scrap", "HFX"]);

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr.slice(0, 10) + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

/** Latest box row per batch + box_number (current status after re-pass). */
export function latestBoxesByKey(boxes: OpsBoxRow[]): OpsBoxRow[] {
  const map = new Map<string, OpsBoxRow>();
  for (const b of boxes) {
    const key = `${b.batch}__${b.box_number}`;
    const prev = map.get(key);
    if (
      !prev ||
      new Date(b.recorded_at || 0).getTime() > new Date(prev.recorded_at || 0).getTime()
    ) {
      map.set(key, b);
    }
  }
  return [...map.values()];
}

function latestBacklogByLine(backlog: OpsBacklogRow[]): Map<string, number> {
  const map = new Map<string, { at: number; value: number }>();
  for (const b of backlog) {
    const at = new Date(b.recorded_at || 0).getTime();
    const prev = map.get(b.line);
    if (!prev || at > prev.at) {
      map.set(b.line, { at, value: b.total_backlog || 0 });
    }
  }
  return new Map([...map.entries()].map(([line, v]) => [line, v.value]));
}

export type OpsDashboardKpis = {
  yieldPct: number;
  scrapPct: number;
  scrapCount: number;
  backlogTotal: number;
  allPlans: number;
  planing: number;
  running: number;
  finished: number;
  totalAF: number;
  totalTarget: number;
  totalBoxes: number;
  lineOnline: ReturnType<typeof computeLineOnlineStatus>;
  progressByLine: {
    line: string;
    af: number;
    target: number;
    progressPct: number;
    batches: string;
  }[];
  boxStatusByLine: {
    line: string;
    counts: Record<string, number>;
    total: number;
  }[];
  materialBalance: {
    byLine: MaterialBalanceRow[];
    byBatch: MaterialBalanceRow[];
    overall: MaterialBalanceRow;
  };
  cameraByLine: {
    line: string;
    cam1: number | null;
    cam2: number | null;
    c1rej: number;
    c2rej: number;
    topDefs: string;
  }[];
  batchStatusByLine: {
    line: string;
    planing: number;
    running: number;
    finished: number;
  }[];
  dueSoon: {
    batch: string;
    line: string;
    planned_finish_date: string;
    daysLeft: number;
  }[];
  topDefects: { name: string; count: number }[];
  lineSummary: {
    line: string;
    online: boolean;
    af: number;
    tot: number;
    tgt: number;
    yld: number;
    scr: number;
    rejKg: number;
    bl: number;
    batches: string;
  }[];
  backlogByLine: { line: string; backlog: number }[];
  repass: {
    total: number;
    success: number;
    rate: number;
    byLine: { line: string; count: number }[];
  };
  awaitingRepass: OpsBoxRow[];
  rejectionByLine: {
    line: string;
    rejKg: number;
    ats: number;
    print: number;
    cam: number;
  }[];
};

export function computeOpsDashboardKpis(input: {
  plans: OpsPlanRow[];
  /** Plans filtered by line only (not period) — for Running targets / online */
  plansForRunning: OpsPlanRow[];
  boxes: OpsBoxRow[];
  /** Unfiltered (or line-only) boxes for latest-status / awaiting re-pass */
  boxesForLatest: OpsBoxRow[];
  rejections: OpsRejectionRow[];
  /**
   * Line-only rejections (not period) — Material Balance By batch always
   * sums the whole batch (D18 / Ops Dashboard).
   */
  rejectionsForBatch?: OpsRejectionRow[];
  backlog: OpsBacklogRow[];
  camera: OpsCameraRow[];
  repass: OpsRepassRow[];
}): OpsDashboardKpis {
  const {
    plans,
    plansForRunning,
    boxes,
    boxesForLatest,
    rejections,
    rejectionsForBatch = rejections,
    backlog,
    camera,
    repass,
  } = input;

  const latestFiltered = latestBoxesByKey(boxes);
  const latestAll = latestBoxesByKey(boxesForLatest);

  const planing = plans.filter((p) => p.batch_status === "Planing").length;
  const running = plans.filter((p) => p.batch_status === "Running").length;
  const finished = plans.filter((p) => p.batch_status === "Finished").length;

  const runningPlans = plansForRunning.filter((p) => p.batch_status === "Running");
  const totalTarget = runningPlans.reduce((s, p) => s + (p.need_af_box || 0), 0);
  const totalAF = latestFiltered.filter((b) => b.status === "AF").length;
  const totalBoxes = latestFiltered.length;
  const scrapCount = latestFiltered.filter((b) => b.status === "Scrap").length;
  const yieldPct = totalTarget > 0 ? (totalAF / totalTarget) * 100 : 0;
  const scrapPct = totalBoxes > 0 ? (scrapCount / totalBoxes) * 100 : 0;

  const blMap = latestBacklogByLine(backlog);
  const backlogTotal = [...blMap.values()].reduce((s, v) => s + v, 0);

  const lineOnline = computeLineOnlineStatus(plansForRunning);

  const runningBatchSet = new Set(runningPlans.map((p) => p.batch));
  const boxesInRunning = latestAll.filter((b) => runningBatchSet.has(b.batch));

  const progressByLine = PRODUCTION_LINES.map((line) => {
    const lineRunning = runningPlans.filter((p) => p.line === line);
    const target = lineRunning.reduce((s, p) => s + (p.need_af_box || 0), 0);
    const af = boxesInRunning.filter((b) => b.line === line && b.status === "AF").length;
    const progressPct = target > 0 ? Math.min((af / target) * 100, 110) : 0;
    return {
      line,
      af,
      target,
      progressPct: parseFloat(progressPct.toFixed(1)),
      batches: lineRunning.map((p) => p.batch).join(", "),
    };
  }).filter((r) => r.target > 0);

  const boxStatusByLine = PRODUCTION_LINES.map((line) => {
    const rows = latestFiltered.filter((b) => b.line === line);
    const counts: Record<string, number> = {};
    for (const s of BOX_STATUS) counts[s] = 0;
    for (const b of rows) {
      counts[b.status] = (counts[b.status] || 0) + 1;
    }
    return { line, counts, total: rows.length };
  });

  // By line / overall follow the period filter; By batch always uses full batch totals.
  const materialBalancePeriod = computeMaterialBalance(latestFiltered, rejections);
  const materialBalanceFullBatch = computeMaterialBalance(latestAll, rejectionsForBatch);
  const materialBalance = {
    byLine: materialBalancePeriod.byLine,
    overall: materialBalancePeriod.overall,
    byBatch: materialBalanceFullBatch.byBatch,
  };

  const camByLine: Record<
    string,
    {
      c1: number[];
      c2: number[];
      c1rej: number;
      c2rej: number;
      defMap: Record<string, number>;
    }
  > = {};
  for (const c of camera) {
    if (!camByLine[c.line]) {
      camByLine[c.line] = { c1: [], c2: [], c1rej: 0, c2rej: 0, defMap: {} };
    }
    const bucket = camByLine[c.line];
    if (c.cam1_pass_rate != null) bucket.c1.push(c.cam1_pass_rate);
    if (c.cam2_pass_rate != null) bucket.c2.push(c.cam2_pass_rate);
    bucket.c1rej += c.cam1_total_qty || 0;
    bucket.c2rej += c.cam2_total_qty || 0;
    for (const ds of [c.cam1_defects, c.cam2_defects]) {
      if (!ds || ds === "None") continue;
      for (const item of ds.split(",")) {
        const m = item.trim().match(/^(.+)\((\d+)\)$/);
        if (m) {
          const k = m[1].trim();
          bucket.defMap[k] = (bucket.defMap[k] || 0) + parseInt(m[2], 10);
        }
      }
    }
  }
  const cameraByLine = Object.entries(camByLine)
    .map(([line, v]) => {
      const avg1 = v.c1.length > 0 ? v.c1.reduce((a, b) => a + b, 0) / v.c1.length : null;
      const avg2 = v.c2.length > 0 ? v.c2.reduce((a, b) => a + b, 0) / v.c2.length : null;
      const topDefs = Object.entries(v.defMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, cnt]) => `${name}(${cnt})`)
        .join(", ");
      return {
        line,
        cam1: avg1 != null ? parseFloat(avg1.toFixed(2)) : null,
        cam2: avg2 != null ? parseFloat(avg2.toFixed(2)) : null,
        c1rej: v.c1rej,
        c2rej: v.c2rej,
        topDefs,
      };
    })
    .sort((a, b) => a.line.localeCompare(b.line));

  const batchStatusByLine = PRODUCTION_LINES.map((line) => {
    const rows = plans.filter((p) => p.line === line);
    return {
      line,
      planing: rows.filter((p) => p.batch_status === "Planing").length,
      running: rows.filter((p) => p.batch_status === "Running").length,
      finished: rows.filter((p) => p.batch_status === "Finished").length,
    };
  }).filter((r) => r.planing + r.running + r.finished > 0);

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
    .slice(0, 15);

  const defectCounts: Record<string, number> = {};
  for (const b of latestFiltered) {
    if (!DEFECT_GRADE_STATUSES.has(b.status) || !b.defects) continue;
    for (const d of b.defects.split(",")) {
      const t = d.trim();
      if (!t || ["nan", "none", "-"].includes(t.toLowerCase())) continue;
      defectCounts[t] = (defectCounts[t] || 0) + 1;
    }
  }
  const topDefects = Object.entries(defectCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const onlineMap = new Map(lineOnline.map((l) => [l.line, l.online]));
  const lineSummary = PRODUCTION_LINES.map((line) => {
    const lb = latestFiltered.filter((b) => b.line === line);
    const af = lb.filter((b) => b.status === "AF").length;
    const tot = lb.length;
    const scrap = lb.filter((b) => b.status === "Scrap").length;
    const scr = tot > 0 ? (scrap / tot) * 100 : 0;
    const tgt = runningPlans
      .filter((p) => p.line === line)
      .reduce((s, p) => s + (p.need_af_box || 0), 0);
    const yld = tgt > 0 ? (af / tgt) * 100 : 0;
    const rejKg = rejections
      .filter((r) => r.line === line)
      .reduce((s, r) => s + (r.total_kg || 0), 0);
    return {
      line,
      online: onlineMap.get(line) || false,
      af,
      tot,
      tgt,
      yld,
      scr,
      rejKg: parseFloat(rejKg.toFixed(3)),
      bl: blMap.get(line) || 0,
      batches: [...new Set(lb.map((b) => b.batch))].join(", "),
    };
  });

  const backlogByLine = PRODUCTION_LINES.map((line) => ({
    line,
    backlog: blMap.get(line) || 0,
  })).filter((r) => r.backlog > 0);

  const rpSuccess = repass.filter((r) => r.result_status === "AF").length;
  const rpTotal = repass.length;
  const rpByLineMap: Record<string, number> = {};
  for (const r of repass) {
    rpByLineMap[r.line] = (rpByLineMap[r.line] || 0) + 1;
  }

  const awaitingRepass = latestAll
    .filter((b) => b.status !== "AF")
    .sort(
      (a, b) =>
        new Date(b.recorded_at || 0).getTime() - new Date(a.recorded_at || 0).getTime(),
    );

  const rejectionByLine = PRODUCTION_LINES.map((line) => {
    const rows = rejections.filter((r) => r.line === line);
    return {
      line,
      rejKg: parseFloat(rows.reduce((s, r) => s + (r.total_kg || 0), 0).toFixed(3)),
      ats: parseFloat(rows.reduce((s, r) => s + (r.ats_kg || 0), 0).toFixed(3)),
      print: parseFloat(rows.reduce((s, r) => s + (r.print_kg || 0), 0).toFixed(3)),
      cam: parseFloat(rows.reduce((s, r) => s + (r.cam_kg || 0), 0).toFixed(3)),
    };
  }).filter((r) => r.rejKg > 0);

  return {
    yieldPct,
    scrapPct,
    scrapCount,
    backlogTotal,
    allPlans: plans.length,
    planing,
    running,
    finished,
    totalAF,
    totalTarget,
    totalBoxes,
    lineOnline,
    progressByLine,
    boxStatusByLine,
    materialBalance,
    cameraByLine,
    batchStatusByLine,
    dueSoon,
    topDefects,
    lineSummary,
    backlogByLine,
    repass: {
      total: rpTotal,
      success: rpSuccess,
      rate: rpTotal > 0 ? (rpSuccess / rpTotal) * 100 : 0,
      byLine: Object.entries(rpByLineMap).map(([line, count]) => ({ line, count })),
    },
    awaitingRepass,
    rejectionByLine,
  };
}
