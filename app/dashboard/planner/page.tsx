"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { computePlannerKpis } from "@/lib/calculations/planner-kpis";
import { fetchDashboardPlans } from "@/lib/data/dashboard";
import { useI18n } from "@/lib/i18n/context";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

export default function PlannerDashboardPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useRequireAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kpis, setKpis] = useState<ReturnType<typeof computePlannerKpis> | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      setLoading(true);
      try {
        const plans = await fetchDashboardPlans();
        setKpis(computePlannerKpis(plans));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Load failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user]);

  if (authLoading || !user) return null;

  const cardStyle = {
    background: "var(--color-anu-surface)",
    borderColor: "var(--color-anu-border)",
  };

  return (
    <DashboardShell title={t("dept_dash.planner_title")} icon="calendar">
      {loading && (
        <p style={{ color: "var(--color-anu-muted)" }}>{t("common.loading")}</p>
      )}
      {error && (
        <p className="text-sm mb-4" style={{ color: "var(--color-anu-danger)" }}>
          {error}
        </p>
      )}
      {!loading && kpis && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label={t("dept_dash.total_plans")} value={kpis.total} />
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

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-xl border p-5" style={cardStyle}>
              <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-anu-text)" }}>
                {t("dept_dash.status_by_line")}
              </p>
              {kpis.byLine.length === 0 ? (
                <EmptyState message={t("dept_dash.empty")} />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={kpis.byLine}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-anu-border)" />
                    <XAxis dataKey="line" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#1e2230",
                        border: "1px solid #2e3450",
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="planing" name="Planing" stackId="s" fill="#7c5cff" />
                    <Bar dataKey="running" name="Running" stackId="s" fill="#00d4aa" />
                    <Bar dataKey="finished" name="Finished" stackId="s" fill="#64748b" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl border p-5" style={cardStyle}>
              <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-anu-text)" }}>
                {t("dept_dash.due_soon")}
              </p>
              {kpis.dueSoon.length === 0 ? (
                <EmptyState message={t("dept_dash.no_due_soon")} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ color: "var(--color-anu-muted)" }}>
                        <th className="text-left py-2 font-medium">Line</th>
                        <th className="text-left py-2 font-medium">Batch</th>
                        <th className="text-left py-2 font-medium">Due</th>
                        <th className="text-right py-2 font-medium">Days</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.dueSoon.map((row) => (
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
                          <td className="py-2" style={{ color: "var(--color-anu-muted)" }}>
                            {row.planned_finish_date}
                          </td>
                          <td
                            className="py-2 text-right font-bold"
                            style={{
                              color:
                                row.daysLeft < 0
                                  ? "var(--color-anu-danger)"
                                  : row.daysLeft <= 2
                                    ? "var(--color-anu-warning)"
                                    : "var(--color-anu-text)",
                            }}
                          >
                            {row.daysLeft}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border p-5" style={cardStyle}>
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--color-anu-text)" }}>
              {t("dept_dash.recent_updates")}
            </p>
            {kpis.recentUpdates.length === 0 ? (
              <EmptyState message={t("dept_dash.empty")} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ color: "var(--color-anu-muted)" }}>
                      <th className="text-left py-2 font-medium">When</th>
                      <th className="text-left py-2 font-medium">Line</th>
                      <th className="text-left py-2 font-medium">Batch</th>
                      <th className="text-left py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kpis.recentUpdates.map((row) => (
                      <tr
                        key={`${row.batch}-${row.at}`}
                        style={{ borderTop: "1px solid var(--color-anu-border)" }}
                      >
                        <td className="py-2 text-xs" style={{ color: "var(--color-anu-muted)" }}>
                          {row.at}
                        </td>
                        <td className="py-2" style={{ color: "var(--color-anu-text)" }}>
                          {row.line}
                        </td>
                        <td className="py-2" style={{ color: "var(--color-anu-text)" }}>
                          {row.batch}
                        </td>
                        <td className="py-2" style={{ color: "var(--color-anu-muted)" }}>
                          {row.status}
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
