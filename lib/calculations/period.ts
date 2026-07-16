export type PeriodKey =
  | "All"
  | "Today"
  | "Day shift (07-19)"
  | "Night shift (19-07)"
  | "Last 7 days"
  | "Last 30 days";

export function filterByLineAndPeriod<T extends Record<string, unknown>>(
  data: T[],
  opts: {
    line?: string;
    lineKey?: string;
    timeKey?: string;
    period?: PeriodKey;
    custom?: { start: string; end: string; startTime: string; endTime: string } | null;
  },
): T[] {
  const lineKey = opts.lineKey ?? "line";
  let rows = [...data];

  if (opts.line && opts.line !== "All") {
    rows = rows.filter((r) => r[lineKey] === opts.line);
  }

  const timeKey = opts.timeKey;
  if (!timeKey) return rows;

  if (opts.custom) {
    const from = new Date(`${opts.custom.start}T${opts.custom.startTime}:00`);
    const to = new Date(`${opts.custom.end}T${opts.custom.endTime}:00`);
    return rows.filter((r) => {
      const t = new Date(String(r[timeKey]));
      return t >= from && t <= to;
    });
  }

  const period = opts.period ?? "All";
  if (period === "All") return rows;

  const now = new Date();
  if (period === "Day shift (07-19)") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19);
    return rows.filter((r) => {
      const t = new Date(String(r[timeKey]));
      return t >= start && t < end;
    });
  }
  if (period === "Night shift (19-07)") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 7);
    return rows.filter((r) => {
      const t = new Date(String(r[timeKey]));
      return t >= start && t < end;
    });
  }

  const cutoff =
    period === "Today"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : period === "Last 7 days"
        ? new Date(now.getTime() - 7 * 86400000)
        : new Date(now.getTime() - 30 * 86400000);

  return rows.filter((r) => new Date(String(r[timeKey])) >= cutoff);
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
