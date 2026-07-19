"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { LinePeriodFilter } from "@/components/dashboard/LinePeriodFilter";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { filterByLineAndPeriod, type PeriodKey } from "@/lib/calculations/period";
import { computeQualityKpis } from "@/lib/calculations/quality-kpis";
import { fetchDeptDashboardBundle } from "@/lib/data/dashboard";
import { useI18n } from "@/lib/i18n/context";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = ["#00d4aa", "#54a0ff", "#6366f1", "#ffa502", "#f97316", "#a855f7", "#ff4757"];

export default function QualityDashboardPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useRequireAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [line, setLine] = useState("All");
  const [period, setPeriod] = useState<PeriodKey>("Today");

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      setLoading(true);
      try {
        const bundle = await fetchDeptDashboardBundle();
        setPlans(bundle.plans);
        setBoxes(bundle.boxes);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user]);

  const kpis = useMemo(() => {
    const fBoxes = filterByLineAndPeriod(boxes, {
      line,
      period,
      timeKey: "recorded_at",
    });
    const fPlans = line === "All" ? plans : plans.filter((p) => p.line === line);
    return computeQualityKpis(fBoxes, fPlans);
  }, [boxes, plans, line, period]);

  if (authLoading || !user) return null;

  const cardStyle = {
    background: "var(--color-anu-surface)",
    borderColor: "var(--color-anu-border)",
  };

  return (
    <DashboardShell title={t("dept_dash.quality_title")} icon="scan">
      <LinePeriodFilter
        line={line}
        period={period}
        onLineChange={setLine}
        onPeriodChange={setPeriod}
      />

      {loading && (
        <p style={{ color: "var(--color-anu-muted)" }}>{t("common.loading")}</p>
      )}
      {error && (
        <p className="text-sm mb-4" style={{ color: "var(--color-anu-danger)" }}>
          {error}
        </p>
      )}

      {!loading && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard
              label={t("dept_dash.graded_today")}
              value={kpis.gradedToday}
              color="var(--color-anu-success)"
            />
            <KpiCard label={t("dept_dash.graded_total")} value={kpis.gradedTotal} />
            <KpiCard
              label={t("dept_dash.queue_batches")}
              value={kpis.gradingQueue.length}
              color="var(--color-anu-warning)"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-xl border p-5" style={cardStyle}>
              <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-anu-text)" }}>
                {t("dept_dash.grade_mix")}
              </p>
              {kpis.gradeMix.length === 0 ? (
                <EmptyState message={t("dept_dash.empty")} />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={kpis.gradeMix}
                      dataKey="count"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {kpis.gradeMix.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-anu-elevated)",
                        border: "1px solid var(--color-anu-border)",
                        borderRadius: 8,
                        color: "var(--color-anu-text)",
                      }}
                      labelStyle={{ color: "var(--color-anu-text)", fontWeight: 600 }}
                      itemStyle={{ color: "var(--color-anu-text)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border p-5" style={cardStyle}>
              <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-anu-text)" }}>
                {t("dept_dash.top_defects")}
              </p>
              {kpis.topDefects.length === 0 ? (
                <EmptyState message={t("dept_dash.no_defects")} />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={kpis.topDefects} layout="vertical" margin={{ left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-anu-border)" />
                    <XAxis type="number" tick={{ fill: "var(--color-anu-muted)", fontSize: 11 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={80}
                      tick={{ fill: "var(--color-anu-muted)", fontSize: 10 }}
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
                    />
                    <Bar dataKey="count" fill="var(--color-anu-danger)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-xl border p-5" style={cardStyle}>
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-anu-text)" }}>
              {t("dept_dash.grading_queue")}
            </p>
            {kpis.gradingQueue.length === 0 ? (
              <EmptyState message={t("dept_dash.no_queue")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: "var(--color-anu-muted)" }}>
                      <th className="text-left py-2 font-medium">Line</th>
                      <th className="text-left py-2 font-medium">Batch</th>
                      <th className="text-right py-2 font-medium">{t("dept_dash.graded")}</th>
                      <th className="text-right py-2 font-medium">{t("dept_dash.target")}</th>
                      <th className="text-right py-2 font-medium">{t("dept_dash.remaining")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.gradingQueue.map((row) => (
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
                          {row.graded}
                        </td>
                        <td className="py-2 text-right" style={{ color: "var(--color-anu-muted)" }}>
                          {row.target}
                        </td>
                        <td
                          className="py-2 text-right font-bold"
                          style={{
                            color:
                              row.remaining > 0
                                ? "var(--color-anu-warning)"
                                : "var(--color-anu-success)",
                          }}
                        >
                          {row.remaining}
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
