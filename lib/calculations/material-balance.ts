/** Material Balance: AF net kg vs Rejection kg → Good% / Reject%. */

export type MaterialBoxRow = {
  line: string;
  batch: string;
  status: string;
  net_weight_kg: number | null;
};

export type MaterialRejectionRow = {
  line: string;
  batch: string;
  total_kg: number | null;
};

export type MaterialBalanceRow = {
  key: string;
  line: string;
  batch: string | null;
  goodKg: number;
  rejectKg: number;
  totalKg: number;
  goodPct: number | null;
  rejectPct: number | null;
};

function pct(part: number, total: number): number | null {
  if (total <= 0) return null;
  return parseFloat(((part / total) * 100).toFixed(1));
}

function row(
  key: string,
  line: string,
  batch: string | null,
  goodKg: number,
  rejectKg: number,
): MaterialBalanceRow {
  const g = parseFloat(goodKg.toFixed(3));
  const r = parseFloat(rejectKg.toFixed(3));
  const total = g + r;
  return {
    key,
    line,
    batch,
    goodKg: g,
    rejectKg: r,
    totalKg: parseFloat(total.toFixed(3)),
    goodPct: pct(g, total),
    rejectPct: pct(r, total),
  };
}

export function computeMaterialBalance(
  boxes: MaterialBoxRow[],
  rejections: MaterialRejectionRow[],
): { byLine: MaterialBalanceRow[]; byBatch: MaterialBalanceRow[]; overall: MaterialBalanceRow } {
  const goodByLine = new Map<string, number>();
  const rejByLine = new Map<string, number>();
  const goodByBatch = new Map<string, { line: string; batch: string; kg: number }>();
  const rejByBatch = new Map<string, { line: string; batch: string; kg: number }>();

  let goodAll = 0;
  let rejAll = 0;

  for (const b of boxes) {
    if (b.status !== "AF") continue;
    const kg = b.net_weight_kg || 0;
    if (kg <= 0) continue;
    goodAll += kg;
    goodByLine.set(b.line, (goodByLine.get(b.line) || 0) + kg);
    const bk = `${b.line}__${b.batch}`;
    const prev = goodByBatch.get(bk);
    goodByBatch.set(bk, {
      line: b.line,
      batch: b.batch,
      kg: (prev?.kg || 0) + kg,
    });
  }

  for (const r of rejections) {
    const kg = r.total_kg || 0;
    if (kg <= 0) continue;
    rejAll += kg;
    rejByLine.set(r.line, (rejByLine.get(r.line) || 0) + kg);
    const bk = `${r.line}__${r.batch}`;
    const prev = rejByBatch.get(bk);
    rejByBatch.set(bk, {
      line: r.line,
      batch: r.batch,
      kg: (prev?.kg || 0) + kg,
    });
  }

  const lines = new Set([...goodByLine.keys(), ...rejByLine.keys()]);
  const byLine = [...lines]
    .sort((a, b) => a.localeCompare(b))
    .map((line) =>
      row(line, line, null, goodByLine.get(line) || 0, rejByLine.get(line) || 0),
    );

  const batches = new Set([...goodByBatch.keys(), ...rejByBatch.keys()]);
  const byBatch = [...batches]
    .map((key) => {
      const g = goodByBatch.get(key);
      const r = rejByBatch.get(key);
      const line = g?.line || r!.line;
      const batch = g?.batch || r!.batch;
      return row(key, line, batch, g?.kg || 0, r?.kg || 0);
    })
    .sort((a, b) => a.line.localeCompare(b.line) || (a.batch || "").localeCompare(b.batch || ""));

  return {
    byLine,
    byBatch,
    overall: row("all", "All", null, goodAll, rejAll),
  };
}
