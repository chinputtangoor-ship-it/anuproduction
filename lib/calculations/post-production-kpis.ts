/** International-style Post Production KPIs derived from existing tables. */

export type BoxRow = {
  line: string;
  status: string;
  net_weight_kg: number | null;
  total_weight_kg: number | null;
  recorded_at: string | null;
};

export type RejectionRow = {
  line: string;
  ats_kg: number | null;
  print_kg: number | null;
  cam_kg: number | null;
  total_kg: number | null;
};

export type PostProductionKpis = {
  gradedBoxes: number;
  weighedBoxes: number;
  pendingWeigh: number;
  weightCompletionPct: number;
  throughputBoxes: number;
  throughputNetKg: number;
  rejectionTotalKg: number;
  rejectionByLine: {
    line: string;
    rejKg: number;
    ats: number;
    print: number;
    cam: number;
  }[];
};

export function computePostProductionKpis(
  boxes: BoxRow[],
  rejections: RejectionRow[],
  lines: string[],
): PostProductionKpis {
  const gradedBoxes = boxes.length;
  const weighedBoxes = boxes.filter((b) => b.net_weight_kg != null).length;
  const pendingWeigh = gradedBoxes - weighedBoxes;
  const weightCompletionPct =
    gradedBoxes > 0 ? (weighedBoxes / gradedBoxes) * 100 : 0;

  const throughputNetKg = boxes.reduce((s, b) => s + (b.net_weight_kg || 0), 0);
  const rejectionTotalKg = rejections.reduce((s, r) => s + (r.total_kg || 0), 0);

  const rejectionByLine = lines
    .map((line) => {
      const rows = rejections.filter((r) => r.line === line);
      return {
        line,
        rejKg: rows.reduce((s, r) => s + (r.total_kg || 0), 0),
        ats: rows.reduce((s, r) => s + (r.ats_kg || 0), 0),
        print: rows.reduce((s, r) => s + (r.print_kg || 0), 0),
        cam: rows.reduce((s, r) => s + (r.cam_kg || 0), 0),
      };
    })
    .filter((r) => r.rejKg > 0)
    .map((r) => ({
      ...r,
      rejKg: parseFloat(r.rejKg.toFixed(3)),
      ats: parseFloat(r.ats.toFixed(3)),
      print: parseFloat(r.print.toFixed(3)),
      cam: parseFloat(r.cam.toFixed(3)),
    }));

  return {
    gradedBoxes,
    weighedBoxes,
    pendingWeigh,
    weightCompletionPct,
    throughputBoxes: weighedBoxes,
    throughputNetKg: parseFloat(throughputNetKg.toFixed(3)),
    rejectionTotalKg: parseFloat(rejectionTotalKg.toFixed(3)),
    rejectionByLine,
  };
}
