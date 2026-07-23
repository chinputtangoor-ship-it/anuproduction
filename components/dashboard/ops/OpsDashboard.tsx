"use client";

import { useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { LinePeriodFilter } from "@/components/dashboard/LinePeriodFilter";
import { OpsSection } from "@/components/dashboard/ops/OpsSection";
import {
  DEFECT_COLORS,
  OPS,
  OPS_TOOLTIP,
  formatPct,
  kpiColor,
  passColor,
} from "@/components/dashboard/ops/ops-theme";
import { DashboardSkeleton } from "@/components/ui/Skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useDashboardBundle } from "@/hooks/useDashboardData";
import {
  filterByLineAndPeriod,
  todayIso,
  type CustomRange,
  type PeriodKey,
} from "@/lib/calculations/period";
import { computeOpsDashboardKpis } from "@/lib/calculations/ops-dashboard-kpis";
import { BOX_STATUS, PRODUCTION_LINES, STATUS_COLORS } from "@/lib/constants/production";
import type { AppIconName } from "@/lib/icons/app-icons";
import { useI18n } from "@/lib/i18n/context";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const cardStyle = {
  background: OPS.surface,
  borderColor: OPS.border,
};

type Props = {
  title: string;
  icon?: AppIconName;
};

export function OpsDashboard({ title, icon = "chart" }: Props) {
  const { t } = useI18n();
  const { user, loading: authLoading } = useRequireAuth();
  const { data, error: swrError, isLoading, mutate } = useDashboardBundle();

  const [line, setLine] = useState("All");
  const [period, setPeriod] = useState<PeriodKey>("Today");
  const [custom, setCustom] = useState<CustomRange>({
    start: todayIso(),
    end: todayIso(),
    startTime: "07:00",
    endTime: "19:00",
  });

  const plans = data?.plans ?? [];
  const boxes = data?.boxes ?? [];
  const rejections = data?.rejections ?? [];
  const backlog = data?.backlog ?? [];
  const camera = data?.camera ?? [];
  const repass = data?.repass ?? [];

  const kpis = useMemo(() => {
    const customOpt = period === "Custom" ? custom : null;
    const fBoxes = filterByLineAndPeriod(boxes as Record<string, unknown>[], {
      line,
      period,
      timeKey: "recorded_at",
      custom: customOpt,
    });
    const fRej = filterByLineAndPeriod(rejections as Record<string, unknown>[], {
      line,
      period,
      timeKey: "recorded_at",
      custom: customOpt,
    });
    const fCamera = filterByLineAndPeriod(camera as Record<string, unknown>[], {
      line,
      period,
      timeKey: "recorded_at",
      custom: customOpt,
    });
    const fRepass = filterByLineAndPeriod(repass as Record<string, unknown>[], {
      line,
      period,
      timeKey: "recorded_at",
      custom: customOpt,
    });
    const fBacklog = filterByLineAndPeriod(backlog as Record<string, unknown>[], {
      line,
      period,
      timeKey: "recorded_at",
      custom: customOpt,
    });
    const fPlans = filterByLineAndPeriod(plans as Record<string, unknown>[], {
      line,
      period,
      timeKey: "updated_at",
      custom: customOpt,
    });
    const plansForRunning =
      line === "All" ? plans : plans.filter((p) => (p as { line: string }).line === line);
    const boxesForLatest =
      line === "All" ? boxes : boxes.filter((b) => (b as { line: string }).line === line);
    // Material Balance By batch: whole batch always (line filter only, ignore period).
    const rejectionsForBatch =
      line === "All"
        ? rejections
        : rejections.filter((r) => (r as { line: string }).line === line);

    return computeOpsDashboardKpis({
      plans: fPlans as never[],
      plansForRunning: plansForRunning as never[],
      boxes: fBoxes as never[],
      boxesForLatest: boxesForLatest as never[],
      rejections: fRej as never[],
      rejectionsForBatch: rejectionsForBatch as never[],
      backlog: fBacklog as never[],
      camera: fCamera as never[],
      repass: fRepass as never[],
    });
  }, [plans, boxes, rejections, backlog, camera, repass, line, period, custom]);

  if (authLoading || !user || isLoading) return <DashboardSkeleton />;

  const progressData = kpis.progressByLine.map((r) => ({
    name: r.line,
    pct: r.progressPct,
    af: r.af,
    target: r.target,
    batch: r.batches,
    color:
      r.progressPct >= 90 ? OPS.success : r.progressPct >= 60 ? OPS.warning : OPS.danger,
  }));

  const camBarData = kpis.cameraByLine.map((r) => ({
    line: r.line,
    cam1: r.cam1,
    cam2: r.cam2,
  }));

  const batchStatusChart = kpis.batchStatusByLine.map((r) => ({
    line: r.line,
    Planing: r.planing,
    Running: r.running,
    Finished: r.finished,
  }));

  const topDefectChart = kpis.topDefects.map((d) => ({
    name: d.name.length > 14 ? `${d.name.slice(0, 14)}…` : d.name,
    full: d.name,
    count: d.count,
  }));

  const pendingPieData = (() => {
    const defCounts: Record<string, number> = {};
    for (const b of kpis.awaitingRepass) {
      if (!b.defects) continue;
      for (const d of b.defects.split(",")) {
        const t0 = d.trim();
        if (t0 && !["nan", "none", "-"].includes(t0.toLowerCase())) {
          defCounts[t0] = (defCounts[t0] || 0) + 1;
        }
      }
    }
    const fromDefects = Object.entries(defCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
    if (fromDefects.length > 0) return fromDefects;
    const statusCounts: Record<string, number> = {};
    for (const b of kpis.awaitingRepass) {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
    }
    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  })();

  const boxStatusChart = PRODUCTION_LINES.map((ln) => {
    const row = kpis.boxStatusByLine.find((r) => r.line === ln)!;
    return { line: ln, ...row.counts, total: row.total };
  }).filter((r) => r.total > 0);

  return (
    <DashboardShell title={title} icon={icon}>
      {swrError && (
        <p className="mb-4 text-sm" style={{ color: OPS.danger }}>
          {t("common.error")}
        </p>
      )}

      <div className="rounded-xl border p-4 mb-6" style={cardStyle}>
        <LinePeriodFilter
          line={line}
          period={period}
          onLineChange={setLine}
          onPeriodChange={setPeriod}
          custom={custom}
          onCustomChange={setCustom}
        />
        <div className="flex flex-wrap items-center gap-3 -mt-2">
          <span className="text-xs" style={{ color: OPS.muted }}>
            {t("analytics.box_status_list", { count: kpis.totalBoxes.toLocaleString() })}
          </span>
          <button
            type="button"
            onClick={() => void mutate()}
            className="ml-auto text-xs px-3 py-2 min-h-[44px] rounded-lg border transition hover:opacity-80"
            style={{ borderColor: OPS.accent, color: OPS.accent }}
          >
            {t("analytics.refresh")}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <OpsSection>{t("ops.kpi_strip")}</OpsSection>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mb-8">
        <KpiCard
          label={t("analytics.kpi_yield")}
          value={`${kpis.yieldPct.toFixed(1)}%`}
          sub={t("analytics.kpi_yield_sub")}
          color={kpiColor(kpis.yieldPct, 90, 70)}
        />
        <KpiCard
          label={t("analytics.kpi_scrap")}
          value={`${kpis.scrapPct.toFixed(1)}%`}
          sub={t("analytics.kpi_scrap_sub", { count: kpis.scrapCount })}
          color={kpiColor(kpis.scrapPct, 2, 5, true)}
        />
        <KpiCard
          label={t("analytics.kpi_backlog")}
          value={kpis.backlogTotal.toLocaleString()}
          sub={t("analytics.kpi_backlog_sub")}
          color={kpiColor(kpis.backlogTotal, 0, 5, true)}
        />
        <KpiCard
          label={t("ops.kpi_running_batches")}
          value={kpis.running}
          sub={t("ops.kpi_running_batches_sub")}
          color={OPS.blue}
        />
        <KpiCard label={t("ops.kpi_all_plans")} value={kpis.allPlans} color={OPS.text} />
        <KpiCard label={t("ops.kpi_planing")} value={kpis.planing} color={OPS.warning} />
        <KpiCard label={t("ops.kpi_running")} value={kpis.running} color={OPS.success} />
        <KpiCard label={t("ops.kpi_finished")} value={kpis.finished} color={OPS.muted} />
      </div>

      {/* Line Online / Offline */}
      <OpsSection>{t("ops.line_status_title")}</OpsSection>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-8">
        {kpis.lineOnline.map((ln) => (
          <div
            key={ln.line}
            className="rounded-lg border p-3"
            style={{
              background: OPS.surface,
              borderColor: OPS.border,
              borderLeft: `3px solid ${ln.online ? OPS.success : OPS.muted}`,
            }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: OPS.text }}>
              {ln.line}
            </p>
            <p
              className="text-sm font-black"
              style={{ color: ln.online ? OPS.success : OPS.muted }}
            >
              {ln.online ? t("ops.online") : t("ops.offline")}
            </p>
            {ln.online && (
              <p className="text-xs mt-0.5" style={{ color: OPS.muted }}>
                {t("ops.running_n", { n: ln.runningBatches })}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Progress by line */}
      <OpsSection>{t("analytics.progress_title")}</OpsSection>
      <p className="text-xs mb-3 -mt-2" style={{ color: OPS.muted }}>
        {t("analytics.progress_sub")}
      </p>
      <div className="rounded-xl border p-4 mb-8" style={cardStyle}>
        {progressData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={progressData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={OPS.border} />
              <XAxis dataKey="name" tick={{ fill: OPS.muted, fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: OPS.muted, fontSize: 11 }}
                domain={[0, 110]}
              />
              <Tooltip
                {...OPS_TOOLTIP}
                formatter={((v: number, _: string, p: { payload: (typeof progressData)[0] }) => [
                  `${v}% (AF: ${p.payload.af} / ${p.payload.target}) · ${p.payload.batch}`,
                  t("analytics.progress_tooltip"),
                ]) as never}
              />
              <Bar
                dataKey="pct"
                radius={[4, 4, 0, 0]}
                label={{
                  position: "top",
                  fill: OPS.muted,
                  fontSize: 10,
                  formatter: ((v: number) => `${v}%`) as never,
                }}
              >
                {progressData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message={t("analytics.no_running_batch")} />
        )}
      </div>

      {/* Box status by line */}
      <OpsSection>{t("ops.box_status_by_line")}</OpsSection>
      <div className="rounded-xl border p-4 mb-8" style={cardStyle}>
        {boxStatusChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={boxStatusChart} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={OPS.border} />
              <XAxis dataKey="line" tick={{ fill: OPS.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: OPS.muted, fontSize: 10 }} allowDecimals={false} />
              <Tooltip {...OPS_TOOLTIP} />
              <Legend wrapperStyle={{ color: OPS.muted, fontSize: 11 }} />
              {BOX_STATUS.map((st) => (
                <Bar
                  key={st}
                  dataKey={st}
                  stackId="box"
                  fill={STATUS_COLORS[st] || OPS.muted}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message={t("analytics.no_data")} />
        )}
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: OPS.elevated }}>
                <th className="px-2 py-2 text-left" style={{ color: OPS.muted }}>
                  Line
                </th>
                {BOX_STATUS.map((st) => (
                  <th key={st} className="px-2 py-2 text-right" style={{ color: OPS.muted }}>
                    {st}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kpis.boxStatusByLine
                .filter((r) => r.total > 0)
                .map((r, i) => (
                  <tr
                    key={r.line}
                    style={{
                      background: i % 2 === 0 ? OPS.surface : "var(--color-anu-void)",
                      borderTop: `1px solid ${OPS.border}`,
                    }}
                  >
                    <td className="px-2 py-2 font-bold" style={{ color: OPS.text }}>
                      {r.line}
                    </td>
                    {BOX_STATUS.map((st) => (
                      <td
                        key={st}
                        className="px-2 py-2 text-right font-semibold"
                        style={{ color: STATUS_COLORS[st] || OPS.muted }}
                      >
                        {r.counts[st] || 0}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Material Balance */}
      <OpsSection>{t("ops.material_balance")}</OpsSection>
      <p className="text-xs mb-3 -mt-2" style={{ color: OPS.muted }}>
        {t("ops.material_balance_sub")}
      </p>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border p-4" style={cardStyle}>
          <p className="text-sm font-semibold mb-2" style={{ color: OPS.text }}>
            {t("ops.by_line")}
          </p>
          <p className="text-xs mb-3" style={{ color: OPS.muted }}>
            {t("ops.overall")}: Good {formatPct(kpis.materialBalance.overall.goodPct)} · Reject{" "}
            {formatPct(kpis.materialBalance.overall.rejectPct)}
          </p>
          {kpis.materialBalance.byLine.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: OPS.elevated }}>
                    {["Line", "Good kg", "Reject kg", "Good %", "Reject %"].map((h) => (
                      <th
                        key={h}
                        className="px-2 py-2 text-left font-medium"
                        style={{ color: OPS.muted }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kpis.materialBalance.byLine.map((r, i) => (
                    <tr
                      key={r.key}
                      style={{
                        background: i % 2 === 0 ? OPS.surface : "var(--color-anu-void)",
                        borderTop: `1px solid ${OPS.border}`,
                      }}
                    >
                      <td className="px-2 py-2 font-bold" style={{ color: OPS.text }}>
                        {r.line}
                      </td>
                      <td className="px-2 py-2" style={{ color: OPS.success }}>
                        {r.goodKg.toFixed(2)}
                      </td>
                      <td className="px-2 py-2" style={{ color: OPS.danger }}>
                        {r.rejectKg.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 font-bold" style={{ color: OPS.success }}>
                        {formatPct(r.goodPct)}
                      </td>
                      <td className="px-2 py-2 font-bold" style={{ color: OPS.danger }}>
                        {formatPct(r.rejectPct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message={t("analytics.no_data")} />
          )}
        </div>
        <div className="rounded-xl border p-4" style={cardStyle}>
          <p className="text-sm font-semibold mb-1" style={{ color: OPS.text }}>
            {t("ops.by_batch")}
          </p>
          <p className="text-xs mb-3" style={{ color: OPS.muted }}>
            {t("ops.by_batch_sub")}
          </p>
          {kpis.materialBalance.byBatch.length > 0 ? (
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr style={{ background: OPS.elevated }}>
                    {["Line", "Batch", "Good kg", "Reject kg", "Good %", "Reject %"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-2 py-2 text-left font-medium"
                          style={{ color: OPS.muted }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {kpis.materialBalance.byBatch.map((r, i) => (
                    <tr
                      key={r.key}
                      style={{
                        background: i % 2 === 0 ? OPS.surface : "var(--color-anu-void)",
                        borderTop: `1px solid ${OPS.border}`,
                      }}
                    >
                      <td className="px-2 py-2 font-bold" style={{ color: OPS.text }}>
                        {r.line}
                      </td>
                      <td className="px-2 py-2" style={{ color: OPS.text }}>
                        {r.batch}
                      </td>
                      <td className="px-2 py-2" style={{ color: OPS.success }}>
                        {r.goodKg.toFixed(2)}
                      </td>
                      <td className="px-2 py-2" style={{ color: OPS.danger }}>
                        {r.rejectKg.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 font-bold" style={{ color: OPS.success }}>
                        {formatPct(r.goodPct)}
                      </td>
                      <td className="px-2 py-2 font-bold" style={{ color: OPS.danger }}>
                        {formatPct(r.rejectPct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message={t("analytics.no_data")} />
          )}
        </div>
      </div>

      {/* Camera */}
      <OpsSection>{t("analytics.cam_pass_title")}</OpsSection>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border p-4" style={cardStyle}>
          {camBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={camBarData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={OPS.border} />
                <XAxis dataKey="line" tick={{ fill: OPS.muted, fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: OPS.muted, fontSize: 11 }}
                  domain={[0, 105]}
                />
                <Tooltip {...OPS_TOOLTIP} formatter={((v: number) => [`${v}%`]) as never} />
                <Legend wrapperStyle={{ color: OPS.muted, fontSize: 11 }} />
                <Bar dataKey="cam1" name="Cam1 Pass%" fill={OPS.blue} radius={[3, 3, 0, 0]} />
                <Bar
                  dataKey="cam2"
                  name="Cam2 Pass%"
                  fill={OPS.success}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message={t("analytics.no_camera_data")} />
          )}
        </div>
        <div className="rounded-xl border p-4" style={cardStyle}>
          <p className="text-sm font-semibold mb-3" style={{ color: OPS.text }}>
            {t("analytics.cam_detail_title")}
          </p>
          {kpis.cameraByLine.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: OPS.elevated }}>
                    {["Line", "Cam1 %", "Cam2 %", "Cam1 Rej", "Cam2 Rej", "Top Defects"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-2 py-2 text-left font-medium whitespace-nowrap"
                          style={{ color: OPS.muted }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {kpis.cameraByLine.map((r, i) => (
                    <tr
                      key={r.line}
                      style={{
                        background: i % 2 === 0 ? OPS.surface : OPS.elevated,
                        borderTop: `1px solid ${OPS.border}`,
                      }}
                    >
                      <td className="px-2 py-2 font-bold" style={{ color: OPS.text }}>
                        {r.line}
                      </td>
                      <td className="px-2 py-2 font-bold" style={{ color: passColor(r.cam1) }}>
                        {r.cam1 != null ? `${r.cam1.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-2 py-2 font-bold" style={{ color: passColor(r.cam2) }}>
                        {r.cam2 != null ? `${r.cam2.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-2 py-2" style={{ color: OPS.muted }}>
                        {r.c1rej}
                      </td>
                      <td className="px-2 py-2" style={{ color: OPS.muted }}>
                        {r.c2rej}
                      </td>
                      <td className="px-2 py-2" style={{ color: OPS.muted }}>
                        {r.topDefs || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message={t("analytics.no_camera_data")} />
          )}
        </div>
      </div>

      {/* Batch status + Due soon */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div>
          <OpsSection>{t("ops.batch_status_by_line")}</OpsSection>
          <div className="rounded-xl border p-4" style={cardStyle}>
            {batchStatusChart.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={batchStatusChart}
                  margin={{ top: 10, right: 20, bottom: 5, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={OPS.border} />
                  <XAxis dataKey="line" tick={{ fill: OPS.muted, fontSize: 11 }} />
                  <YAxis tick={{ fill: OPS.muted, fontSize: 10 }} allowDecimals={false} />
                  <Tooltip {...OPS_TOOLTIP} />
                  <Legend wrapperStyle={{ color: OPS.muted, fontSize: 11 }} />
                  <Bar dataKey="Planing" stackId="st" fill={OPS.warning} />
                  <Bar dataKey="Running" stackId="st" fill={OPS.success} />
                  <Bar dataKey="Finished" stackId="st" fill={OPS.muted} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message={t("analytics.no_data")} />
            )}
          </div>
        </div>
        <div>
          <OpsSection>{t("ops.due_within_7")}</OpsSection>
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: OPS.border }}>
            {kpis.dueSoon.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: OPS.elevated }}>
                    {["Line", "Batch", "Finish", "Days"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-left font-medium"
                        style={{ color: OPS.muted }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {kpis.dueSoon.map((d, i) => (
                    <tr
                      key={`${d.line}-${d.batch}`}
                      style={{
                        background: i % 2 === 0 ? OPS.surface : "var(--color-anu-void)",
                        borderTop: `1px solid ${OPS.border}`,
                      }}
                    >
                      <td className="px-3 py-2 font-bold" style={{ color: OPS.text }}>
                        {d.line}
                      </td>
                      <td className="px-3 py-2" style={{ color: OPS.text }}>
                        {d.batch}
                      </td>
                      <td className="px-3 py-2" style={{ color: OPS.muted }}>
                        {d.planned_finish_date}
                      </td>
                      <td
                        className="px-3 py-2 font-bold"
                        style={{
                          color:
                            d.daysLeft < 0
                              ? OPS.danger
                              : d.daysLeft <= 2
                                ? OPS.warning
                                : OPS.success,
                        }}
                      >
                        {d.daysLeft}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6">
                <EmptyState message={t("ops.no_due_soon")} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top defects */}
      <OpsSection>{t("ops.top_defects")}</OpsSection>
      <p className="text-xs mb-3 -mt-2" style={{ color: OPS.muted }}>
        {t("ops.top_defects_sub")}
      </p>
      <div className="rounded-xl border p-4 mb-8" style={cardStyle}>
        {topDefectChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={topDefectChart}
              layout="vertical"
              margin={{ top: 5, right: 30, bottom: 5, left: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={OPS.border} />
              <XAxis type="number" tick={{ fill: OPS.muted, fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: OPS.muted, fontSize: 10 }}
                width={80}
              />
              <Tooltip
                {...OPS_TOOLTIP}
                formatter={((v: number, _: string, p: { payload: (typeof topDefectChart)[0] }) => [
                  v,
                  p.payload.full,
                ]) as never}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {topDefectChart.map((_, i) => (
                  <Cell key={i} fill={DEFECT_COLORS[i % DEFECT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState message={t("analytics.no_data")} />
        )}
      </div>

      {/* Line summary */}
      <OpsSection>{t("analytics.summary_line_title")}</OpsSection>
      <div className="overflow-x-auto rounded-xl border mb-8" style={{ borderColor: OPS.border }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: OPS.elevated }}>
              {[
                "Line",
                "Online",
                "AF",
                "Target",
                "Yield%",
                "Scrap%",
                "Rej (kg)",
                "Backlog",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-3 text-left font-medium whitespace-nowrap"
                  style={{ color: OPS.muted }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kpis.lineSummary
              .filter((s) => s.tot > 0 || s.online || s.bl > 0 || s.tgt > 0)
              .map((s, i) => (
                <tr
                  key={s.line}
                  style={{
                    background: i % 2 === 0 ? OPS.surface : "var(--color-anu-void)",
                    borderTop: `1px solid ${OPS.border}`,
                  }}
                >
                  <td className="px-3 py-2.5 font-bold" style={{ color: OPS.text }}>
                    {s.line}
                  </td>
                  <td
                    className="px-3 py-2.5 font-bold"
                    style={{ color: s.online ? OPS.success : OPS.muted }}
                  >
                    {s.online ? t("ops.online") : t("ops.offline")}
                  </td>
                  <td className="px-3 py-2.5 font-bold" style={{ color: OPS.success }}>
                    {s.af.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5" style={{ color: OPS.muted }}>
                    {s.tgt.toLocaleString()}
                  </td>
                  <td
                    className="px-3 py-2.5 font-bold"
                    style={{ color: kpiColor(s.yld, 90, 70) }}
                  >
                    {s.yld.toFixed(1)}%
                  </td>
                  <td
                    className="px-3 py-2.5 font-bold"
                    style={{ color: kpiColor(s.scr, 2, 5, true) }}
                  >
                    {s.scr.toFixed(1)}%
                  </td>
                  <td
                    className="px-3 py-2.5"
                    style={{ color: s.rejKg > 0 ? OPS.warning : OPS.muted }}
                  >
                    {s.rejKg.toFixed(2)}
                  </td>
                  <td
                    className="px-3 py-2.5"
                    style={{ color: s.bl > 0 ? OPS.danger : OPS.muted }}
                  >
                    {s.bl}
                  </td>
                </tr>
              ))}
            {kpis.lineSummary.every(
              (s) => !(s.tot > 0 || s.online || s.bl > 0 || s.tgt > 0),
            ) && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center" style={{ color: OPS.muted }}>
                  {t("analytics.no_data")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Backlog + Re-pass */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div>
          <OpsSection>{t("analytics.backlog_by_line")}</OpsSection>
          <div className="rounded-xl border p-4" style={cardStyle}>
            {kpis.backlogByLine.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={kpis.backlogByLine}
                  margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={OPS.border} />
                  <XAxis dataKey="line" tick={{ fill: OPS.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: OPS.muted, fontSize: 10 }} />
                  <Tooltip {...OPS_TOOLTIP} />
                  <Bar dataKey="backlog" radius={[3, 3, 0, 0]}>
                    {kpis.backlogByLine.map((s, i) => (
                      <Cell
                        key={i}
                        fill={
                          s.backlog > 10
                            ? OPS.danger
                            : s.backlog > 5
                              ? OPS.warning
                              : OPS.success
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message={t("analytics.no_pending_work")} />
            )}
          </div>
        </div>
        <div>
          <OpsSection>{t("analytics.repass_summary")}</OpsSection>
          <div className="rounded-xl border p-4" style={cardStyle}>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: t("analytics.repass_all"), value: kpis.repass.total, color: OPS.text },
                {
                  label: t("analytics.repass_success"),
                  value: kpis.repass.success,
                  color: OPS.success,
                },
                {
                  label: t("analytics.repass_rate"),
                  value: `${kpis.repass.rate.toFixed(1)}%`,
                  color: kpiColor(kpis.repass.rate, 80, 60),
                },
              ].map((k) => (
                <div
                  key={k.label}
                  className="rounded-lg border p-2 text-center"
                  style={{ background: OPS.elevated, borderColor: OPS.border }}
                >
                  <p className="text-xs mb-1" style={{ color: OPS.muted }}>
                    {k.label}
                  </p>
                  <p className="text-lg font-black" style={{ color: k.color }}>
                    {k.value}
                  </p>
                </div>
              ))}
            </div>
            {kpis.repass.byLine.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart
                  data={kpis.repass.byLine}
                  margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={OPS.border} />
                  <XAxis dataKey="line" tick={{ fill: OPS.muted, fontSize: 10 }} />
                  <YAxis tick={{ fill: OPS.muted, fontSize: 10 }} />
                  <Tooltip {...OPS_TOOLTIP} />
                  <Bar dataKey="count" fill={OPS.warning} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message={t("analytics.no_data")} />
            )}
          </div>
        </div>
      </div>

      {/* Awaiting Re-pass */}
      <OpsSection>{t("analytics.pending_section")}</OpsSection>
      {kpis.awaitingRepass.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <div
            className="xl:col-span-2 overflow-x-auto rounded-xl border"
            style={{ borderColor: OPS.border }}
          >
            <p
              className="px-4 py-3 text-sm"
              style={{ color: OPS.muted, borderBottom: `1px solid ${OPS.border}` }}
            >
              {t("analytics.pending_count")}{" "}
              <span style={{ color: OPS.danger, fontWeight: 700 }}>
                {kpis.awaitingRepass.length}
              </span>{" "}
              {t("analytics.pending_awaiting")}
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: OPS.elevated }}>
                  {["Line", "Batch", "Box", "Status", "Defects", "Time"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left font-medium"
                      style={{ color: OPS.muted }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {kpis.awaitingRepass.slice(0, 50).map((b, i) => (
                  <tr
                    key={b.id || `${b.batch}-${b.box_number}-${i}`}
                    style={{
                      background: i % 2 === 0 ? OPS.surface : "var(--color-anu-void)",
                      borderTop: `1px solid ${OPS.border}`,
                    }}
                  >
                    <td className="px-3 py-2 font-medium" style={{ color: OPS.text }}>
                      {b.line}
                    </td>
                    <td className="px-3 py-2" style={{ color: OPS.text }}>
                      {b.batch}
                    </td>
                    <td className="px-3 py-2 font-black" style={{ color: OPS.accent }}>
                      #{b.box_number}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold"
                        style={{
                          background: `${STATUS_COLORS[b.status] || OPS.muted}20`,
                          color: STATUS_COLORS[b.status] || OPS.muted,
                        }}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-3 py-2" style={{ color: OPS.muted }}>
                      {b.defects || "—"}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap" style={{ color: OPS.muted }}>
                      {b.recorded_at?.slice(0, 16).replace("T", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border p-5" style={cardStyle}>
            <p className="text-sm font-semibold mb-4" style={{ color: OPS.text }}>
              {pendingPieData.some((d) => !BOX_STATUS.includes(d.name as never))
                ? t("analytics.defect_of_nonaf")
                : t("analytics.status_of_nonaf")}
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pendingPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="value"
                  label={
                    ((props: { name?: string; percent?: number }) =>
                      `${props.name} ${((props.percent || 0) * 100).toFixed(0)}%`) as never
                  }
                  labelLine={false}
                >
                  {pendingPieData.map((_, i) => (
                    <Cell key={i} fill={DEFECT_COLORS[i % DEFECT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...OPS_TOOLTIP} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border p-6 text-center mb-8" style={cardStyle}>
          <p style={{ color: OPS.success }}>{t("analytics.no_pending")}</p>
        </div>
      )}

      <p className="text-center text-xs mt-4" style={{ color: OPS.muted }}>
        {t("analytics.footer_updated")}: {new Date().toLocaleString("th-TH")}
      </p>
    </DashboardShell>
  );
}
