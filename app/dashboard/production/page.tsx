"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { LinePeriodFilter } from "@/components/dashboard/LinePeriodFilter";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useDashboardBundle } from "@/hooks/useDashboardData";
import {
  filterByLineAndPeriod,
  todayIso,
  type CustomRange,
  type PeriodKey,
} from "@/lib/calculations/period";
import { computeProductionKpis } from "@/lib/calculations/production-kpis";
import { useI18n } from "@/lib/i18n/context";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function ProductionDashboardPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useRequireAuth();
  const { data, error: swrError, isLoading } = useDashboardBundle();
  const plans = data?.plans ?? [];
  const boxes = data?.boxes ?? [];
  const [line, setLine] = useState("All");
  const [period, setPeriod] = useState<PeriodKey>("Today");
  const [custom, setCustom] = useState<CustomRange>({
    start: todayIso(),
    end: todayIso(),
    startTime: "07:00",
    endTime: "19:00",
  });

  const kpis = useMemo(() => {
    const fPlans = filterByLineAndPeriod(plans as Record<string, unknown>[], {
      line,
      period,
      timeKey: "updated_at",
      custom: period === "Custom" ? custom : null,
    });
    const fBoxes = filterByLineAndPeriod(boxes as Record<string, unknown>[], {
      line,
      period,
      timeKey: "recorded_at",
      custom: period === "Custom" ? custom : null,
    });
    return computeProductionKpis(fPlans as never[], fBoxes as never[]);
  }, [plans, boxes, line, period, custom]);

  if (authLoading || !user) return <DashboardSkeleton />;

  const cardStyle = {
    background: "var(--color-anu-surface)",
    borderColor: "var(--color-anu-border)",
  };

  const progressData = kpis.byLine
    .filter((r) => r.running > 0 || r.target > 0)
    .map((r) => ({
      line: r.line,
      pct: parseFloat(r.progressPct.toFixed(1)),
      color:
        r.progressPct >= 90
          ? "var(--color-anu-success)"
          : r.progressPct >= 60
            ? "var(--color-anu-warning)"
            : "var(--color-anu-danger)",
    }));

  return (
    <DashboardShell title={t("dept_dash.production_title")} icon="factory">
      <LinePeriodFilter
        line={line}
        period={period}
        onLineChange={setLine}
        onPeriodChange={setPeriod}
        custom={custom}
        onCustomChange={setCustom}
      />

      {isLoading && !plans.length && <DashboardSkeleton />}
      {swrError && (
        <p className="text-sm mb-4" style={{ color: "var(--color-anu-danger)" }}>
          {swrError.message}
        </p>
      )}

      {(!isLoading || plans.length > 0) && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
            <KpiCard
              label={t("dept_dash.planing")}
              value={kpis.planing}
              color="var(--color-anu-glow)"
            />
            <KpiCard
              label={t("dept_dash.running")}
              value={kpis.running}
              color="var(--color-anu-success)"
            />
            <KpiCard
              label={t("dept_dash.finished")}
              value={kpis.finished}
              color="var(--color-anu-muted)"
            />
          </div>

          <div className="rounded-xl border p-5" style={cardStyle}>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-anu-text)" }}>
              {t("dept_dash.progress_by_line")}
            </p>
            <p className="text-xs mb-4" style={{ color: "var(--color-anu-muted)" }}>
              {t("dept_dash.progress_sub")}
            </p>
            {progressData.length === 0 ? (
              <EmptyState message={t("dept_dash.no_running")} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-anu-border)" />
                  <XAxis dataKey="line" tick={{ fill: "var(--color-anu-muted)", fontSize: 11 }} />
                  <YAxis
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 110]}
                    tick={{ fill: "var(--color-anu-muted)", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-anu-elevated)",
                      border: "1px solid var(--color-anu-border)",
                      borderRadius: 8,
                      color: "var(--color-anu-text)",
                    }}
                    labelStyle={{ color: "var(--color-anu-text)", fontWeight: 600 }}
                    itemStyle={{ color: "var(--color-anu-text)" }}
                    formatter={(v) => [`${v ?? 0}%`]}
                  />
                  <Bar dataKey="pct" name="Progress" radius={[4, 4, 0, 0]}>
                    {progressData.map((d) => (
                      <Cell key={d.line} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border p-5" style={cardStyle}>
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-anu-text)" }}>
              {t("dept_dash.running_batches")}
            </p>
            {kpis.runningBatches.length === 0 ? (
              <EmptyState message={t("dept_dash.no_running")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: "var(--color-anu-muted)" }}>
                      <th className="text-left py-2 font-medium">Line</th>
                      <th className="text-left py-2 font-medium">Batch</th>
                      <th className="text-right py-2 font-medium">AF</th>
                      <th className="text-right py-2 font-medium">{t("dept_dash.target")}</th>
                      <th className="text-right py-2 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.runningBatches.map((row) => (
                      <tr
                        key={row.batch}
                        style={{ borderTop: "1px solid var(--color-anu-border)" }}
                      >
                        <td className="py-2" style={{ color: "var(--color-anu-text)" }}>
                          {row.line}
                        </td>
                        <td className="py-2" style={{ color: "var(--color-anu-text)" }}>
                          {row.batch}
                        </td>
                        <td className="py-2 text-right" style={{ color: "var(--color-anu-success)" }}>
                          {row.af}
                        </td>
                        <td className="py-2 text-right" style={{ color: "var(--color-anu-muted)" }}>
                          {row.target}
                        </td>
                        <td
                          className="py-2 text-right font-bold"
                          style={{
                            color:
                              row.progressPct >= 90
                                ? "var(--color-anu-success)"
                                : row.progressPct >= 60
                                  ? "var(--color-anu-warning)"
                                  : "var(--color-anu-danger)",
                          }}
                        >
                          {row.progressPct.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
