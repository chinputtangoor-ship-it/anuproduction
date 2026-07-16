"use client";

import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { computeProductionKpis } from "@/lib/calculations/production-kpis";
import { PRODUCTION_LINES } from "@/lib/constants/production";
import { fetchDeptDashboardBundle } from "@/lib/data/dashboard";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [filterLine, setFilterLine] = useState("All");

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
    const fPlans = filterLine === "All" ? plans : plans.filter((p) => p.line === filterLine);
    const fBoxes = filterLine === "All" ? boxes : boxes.filter((b) => b.line === filterLine);
    return computeProductionKpis(fPlans, fBoxes);
  }, [plans, boxes, filterLine]);

  if (authLoading || !user) return null;

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
        r.progressPct >= 90 ? "#00d4aa" : r.progressPct >= 60 ? "#ffa502" : "#ff4757",
    }));

  return (
    <DashboardShell title={t("dept_dash.production_title")} icon="factory">
      <div className="mb-6">
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--color-anu-muted)" }}>
          {t("analytics.filter_line")}
          <select
            value={filterLine}
            onChange={(e) => setFilterLine(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none w-40"
            style={{
              background: "var(--color-anu-elevated)",
              borderColor: "var(--color-anu-border)",
              color: "var(--color-anu-text)",
            }}
          >
            <option value="All">{t("analytics.period_all")}</option>
            {PRODUCTION_LINES.map((ln) => (
              <option key={ln} value={ln}>
                {ln}
              </option>
            ))}
          </select>
        </label>
      </div>

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
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1e2230",
                      border: "1px solid #2e3450",
                      borderRadius: 8,
                    }}
                    formatter={(v: any) => [`${v}%`]}
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
