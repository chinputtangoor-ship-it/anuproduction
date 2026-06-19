"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/context";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer,
  ComposedChart,
} from "recharts";

const ACCENT   = "#7c5cff";
const SUCCESS  = "#00d4aa";
const WARNING  = "#ffa502";
const DANGER   = "#ff4757";
const BLUE     = "#54a0ff";
const MUTED    = "#64748b";
const SURFACE  = "#0f1117";
const ELEVATED = "#171921";
const BORDER   = "#1e2230";
const TEXT     = "#e2e8f0";

const TOOLTIP_STYLE = {
  contentStyle: { background: "#1e2230", border: "1px solid #2e3450", borderRadius: 8, color: "#e2e8f0" },
  labelStyle:   { color: "#e2e8f0", fontWeight: 600 },
  itemStyle:    { color: "#e2e8f0" },
};

const DEFECT_COLORS = [DANGER,"#ff6b81",WARNING,BLUE,SUCCESS,"#9b59b6","#e67e22","#f1c40f","#2ecc71","#3498db"];
const STATUS_COLORS: Record<string, string> = {
  AF: SUCCESS, Sort: WARNING, PS: "#f97316",
  HP: BLUE, HUP: "#6366f1", HFX: "#a855f7", Scrap: DANGER,
};

function kpiColor(val: number, good: number, warn: number, reverse = false) {
  if (!reverse) return val >= good ? SUCCESS : val >= warn ? WARNING : DANGER;
  return val <= good ? SUCCESS : val <= warn ? WARNING : DANGER;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-1 h-5 rounded-full" style={{ background: BLUE }} />
      <p className="text-sm font-bold tracking-wide uppercase" style={{ color: BLUE }}>{children}</p>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="rounded-xl border p-4 text-center" style={{ background: SURFACE, borderColor: BORDER }}>
      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MUTED }}>{label}</p>
      <p className="text-3xl font-black leading-none mb-1" style={{ color }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: MUTED }}>{sub}</p>}
    </div>
  );
}

function passColor(v: number | null) {
  if (v == null) return MUTED;
  if (v >= 99) return SUCCESS;
  if (v >= 95) return WARNING;
  return DANGER;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { t }  = useI18n();

  const [activeTab, setActiveTab]     = useState(0);
  const [filterLine, setFilterLine]   = useState("All");
  const [filterPeriod, setFilterPeriod] = useState("Today");

  const todayStr = new Date().toISOString().slice(0, 10);
  const [useCustom, setUseCustom]         = useState(false);
  const [customStart, setCustomStart]     = useState(todayStr);
  const [customEnd, setCustomEnd]         = useState(todayStr);
  const [customStartTime, setCustomStartTime] = useState("07:00");
  const [customEndTime, setCustomEndTime]     = useState("19:00");

  const [plans, setPlans]         = useState<any[]>([]);
  const [boxes, setBoxes]         = useState<any[]>([]);
  const [backlog, setBacklog]     = useState<any[]>([]);
  const [rejection, setRejection] = useState<any[]>([]);
  const [camera, setCamera]       = useState<any[]>([]);
  const [repass, setRepass]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("anu_user");
    if (!stored) { router.push("/login"); return; }
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [p, b, bl, r, c, rp] = await Promise.all([
      supabase.from("production_plan").select("*"),
      supabase.from("boxes").select("*"),
      supabase.from("backlog").select("*"),
      supabase.from("rejection").select("*"),
      supabase.from("camera_inspection").select("*"),
      supabase.from("repass").select("*"),
    ]);
    setPlans(p.data || []);
    setBoxes(b.data || []);
    setBacklog(bl.data || []);
    setRejection(r.data || []);
    setCamera(c.data || []);
    setRepass(rp.data || []);
    setLoading(false);
  }

  function applyFilter<T extends Record<string, any>>(data: T[], lineKey: string, timeKey?: string): T[] {
    let d = [...data];
    if (filterLine !== "All") d = d.filter(r => r[lineKey] === filterLine);
    if (timeKey) {
      if (useCustom) {
        const from = new Date(`${customStart}T${customStartTime}:00`);
        const to   = new Date(`${customEnd}T${customEndTime}:00`);
        d = d.filter(r => {
          const t = new Date(r[timeKey]);
          return t >= from && t <= to;
        });
      } else if (filterPeriod !== "All") {
        const now = new Date();
        const cutoff =
          filterPeriod === "Today"        ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) :
          filterPeriod === "Day shift (07-19)" ? (() => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7); return d; })() :
          filterPeriod === "Night shift (19-07)" ? (() => { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19); return d; })() :
          filterPeriod === "Last 7 days"   ? new Date(now.getTime() - 7 * 86400000) :
          new Date(now.getTime() - 30 * 86400000);

        if (filterPeriod === "Day shift (07-19)") {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7);
          const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19);
          d = d.filter(r => { const t = new Date(r[timeKey]); return t >= start && t < end; });
        } else if (filterPeriod === "Night shift (19-07)") {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19);
          const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 7);
          d = d.filter(r => { const t = new Date(r[timeKey]); return t >= start && t < end; });
        } else {
          d = d.filter(r => new Date(r[timeKey]) >= cutoff);
        }
      }
    }
    return d;
  }

  const fBoxes   = applyFilter(boxes,     "line", "time_stamp");
  const fRej     = applyFilter(rejection, "line", "time_stamp");
  const fCamera  = applyFilter(camera,    "line", "time_stamp");
  const fRepass  = applyFilter(repass,    "line", "time_stamp");
  const fBacklog = applyFilter(backlog,   "line");
  const fPlans   = filterLine === "All" ? plans : plans.filter(p => p.line === filterLine);

  const runningPlans = plans.filter(p => p.batch_status === "Running");
  const runningPlansFiltered = filterLine === "All"
    ? runningPlans
    : runningPlans.filter(p => p.line === filterLine);
  const runningBatches = new Set(runningPlans.map(p => p.batch));
  const boxesInRunning = boxes.filter(b =>
    runningBatches.has(b.batch) &&
    (filterLine === "All" || b.line === filterLine)
  );

  const runPlans = fPlans.filter(p => p.batch_status !== "Finished");

  const totalTarget = runningPlansFiltered.reduce((s, p) => s + (p.need_af_box || 0), 0);
  const totalAF     = fBoxes.filter(b => b.status === "AF").length;
  const totalBoxes  = fBoxes.length;
  const totalNonAF  = totalBoxes - totalAF;
  const yieldPct    = totalTarget > 0 ? (totalAF / totalTarget * 100) : 0;
  const scrapPct    = totalBoxes > 0  ? (totalNonAF / totalBoxes * 100) : 0;
  const activeLines = [...new Set(fBoxes.map(b => b.line))].length;
  const latestBacklog = Object.values(
    fBacklog.reduce((acc: any, b) => {
      if (!acc[b.line] || new Date(b.time_stamp) > new Date(acc[b.line].time_stamp)) acc[b.line] = b;
      return acc;
    }, {})
  ).reduce((s: number, b: any) => s + (b.total_backlog || 0), 0);

  const ALL_LINES = Array.from({ length: 13 }, (_, i) => `H5${String(i + 1).padStart(2, "0")}`);

  const lineStats = ALL_LINES.map(ln => {
    const lb  = fBoxes.filter(b => b.line === ln);
    const af  = lb.filter(b => b.status === "AF").length;
    const tot = lb.length;
    const scr = tot > 0 ? (tot - af) / tot * 100 : 0;
    const tgt = runPlans.filter(p => p.line === ln).reduce((s, p) => s + (p.need_af_box || 0), 0);
    const yld = tgt > 0 ? af / tgt * 100 : 0;
    const rejKg = fRej.filter(r => r.line === ln).reduce((s, r) => s + (r.total_kg || 0), 0);
    const blEntry = fBacklog.filter(b => b.line === ln).sort((a, b) => new Date(b.time_stamp).getTime() - new Date(a.time_stamp).getTime())[0];
    const bl = blEntry?.total_backlog || 0;
    const batches = [...new Set(lb.map(b => b.batch))].join(", ");
    return { line: ln, af, tot, scr, tgt, yld, rejKg, bl, batches };
  });

  const progressData = ALL_LINES
    .map(ln => {
      const tgt     = runningPlansFiltered.filter(p => p.line === ln).reduce((s, p) => s + (p.need_af_box || 0), 0);
      const af      = boxesInRunning.filter(b => b.line === ln && b.status === "AF").length;
      const yld     = tgt > 0 ? af / tgt * 100 : 0;
      const batches = runningPlansFiltered.filter(p => p.line === ln).map(p => p.batch).join(", ");
      return { name: ln, pct: parseFloat(Math.min(yld, 110).toFixed(1)), af, target: tgt, batch: batches, color: yld >= 90 ? SUCCESS : yld >= 60 ? WARNING : DANGER };
    })
    .filter(s => s.target > 0);

  const latestBoxMap: Record<string, any> = {};
  boxes.forEach(b => {
    const key = `${b.batch}__${b.box_number}`;
    if (!latestBoxMap[key] || new Date(b.time_stamp) > new Date(latestBoxMap[key].time_stamp))
      latestBoxMap[key] = b;
  });
  const pendingBoxes = Object.values(latestBoxMap)
    .filter(b => b.status !== "AF")
    .filter(b => filterLine === "All" || b.line === filterLine);

  const defectCounts: Record<string, number> = {};
  pendingBoxes.forEach(b => {
    if (!b.defects) return;
    b.defects.split(",").forEach((d: string) => {
      const t = d.trim();
      if (t && !["nan","none","-",""].includes(t.toLowerCase()))
        defectCounts[t] = (defectCounts[t] || 0) + 1;
    });
  });
  const paretoRaw = Object.entries(defectCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const paretoTotal = paretoRaw.reduce((s, [, v]) => s + v, 0);
  let cumPct = 0;
  const paretoData = paretoRaw.map(([name, count]) => {
    cumPct += count / paretoTotal * 100;
    return { name, count, cumPct: parseFloat(cumPct.toFixed(1)) };
  });

  const camByLine: Record<string, {
    c1: number[]; c2: number[];
    c1rej: number; c2rej: number;
    defMap: Record<string, number>;
  }> = {};
  fCamera.forEach(c => {
    if (!camByLine[c.line]) camByLine[c.line] = { c1: [], c2: [], c1rej: 0, c2rej: 0, defMap: {} };
    if (c.cam1_pass_rate != null) camByLine[c.line].c1.push(c.cam1_pass_rate);
    if (c.cam2_pass_rate != null) camByLine[c.line].c2.push(c.cam2_pass_rate);
    camByLine[c.line].c1rej += c.cam1_total_qty || 0;
    camByLine[c.line].c2rej += c.cam2_total_qty || 0;
    [c.cam1_defects, c.cam2_defects].forEach((ds: string) => {
      if (!ds || ds === "None") return;
      ds.split(",").forEach((item: string) => {
        const m = item.trim().match(/^(.+)\((\d+)\)$/);
        if (m) {
          const k = m[1].trim();
          camByLine[c.line].defMap[k] = (camByLine[c.line].defMap[k] || 0) + parseInt(m[2]);
        }
      });
    });
  });
  const camTableData = Object.entries(camByLine).map(([line, v]) => {
    const avg1 = v.c1.length > 0 ? v.c1.reduce((a, b) => a + b) / v.c1.length : null;
    const avg2 = v.c2.length > 0 ? v.c2.reduce((a, b) => a + b) / v.c2.length : null;
    const topDefs = Object.entries(v.defMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([name, cnt]) => `${name}(${cnt})`).join(", ");
    return { line, cam1: avg1 != null ? parseFloat(avg1.toFixed(2)) : null, cam2: avg2 != null ? parseFloat(avg2.toFixed(2)) : null, c1rej: v.c1rej, c2rej: v.c2rej, topDefs };
  }).sort((a, b) => a.line.localeCompare(b.line));

  const camBarData = camTableData.map(r => ({ line: r.line, cam1: r.cam1, cam2: r.cam2 }));

  const pendingDefCounts: Record<string, number> = {};
  pendingBoxes.forEach(b => {
    if (!b.defects) return;
    b.defects.split(",").forEach((d: string) => {
      const t = d.trim();
      if (t && !["nan","none","-",""].includes(t.toLowerCase()))
        pendingDefCounts[t] = (pendingDefCounts[t] || 0) + 1;
    });
  });
  const pendingPieData = Object.entries(pendingDefCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const rpSuccess = fRepass.filter(r => r.result_status === "AF").length;
  const rpTotal   = fRepass.length;
  const rpRate    = rpTotal > 0 ? (rpSuccess / rpTotal * 100) : 0;
  const rpByLine  = Object.entries(
    fRepass.reduce((acc: any, r) => { acc[r.line] = (acc[r.line] || 0) + 1; return acc; }, {})
  ).map(([line, count]) => ({ line, count }));

  const cardStyle = { background: SURFACE, borderColor: BORDER };
  const lineOptions = ["All", ...ALL_LINES];

  // ── Period options with translated labels, value stays in English for filter logic ──
  const PERIOD_OPTIONS = [
    { value: "All",                      labelKey: "analytics.period_all" },
    { value: "Today",                    labelKey: "analytics.period_today" },
    { value: "Day shift (07-19)",        labelKey: "analytics.period_day_shift" },
    { value: "Night shift (19-07)",      labelKey: "analytics.period_night_shift" },
    { value: "Last 7 days",              labelKey: "analytics.period_7days" },
    { value: "Last 30 days",             labelKey: "analytics.period_30days" },
  ];

  const TABS = [
    t("analytics.tab_overview"),
    t("analytics.tab_quality"),
    t("analytics.tab_detail"),
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <p style={{ color: MUTED }}>{t("analytics.loading_data")}</p>
    </div>
  );

  return (
    <div className="w-full min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">

        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-wide" style={{ color: TEXT }}>
            📈 {t("analytics.title")}
          </h1>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            {t("analytics.monitoring")}: {new Date().toLocaleString("th-TH")}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="rounded-xl border p-4 mb-6 flex flex-wrap gap-4 items-end"
             style={{ background: "#0a0c12", borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: MUTED }}>{t("analytics.filter_line")}</span>
            <select value={filterLine} onChange={e => setFilterLine(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm outline-none"
              style={{ background: ELEVATED, borderColor: BORDER, color: TEXT }}>
              {lineOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: MUTED }}>{t("analytics.filter_period")}</span>
            <select
              value={useCustom ? "custom" : filterPeriod}
              onChange={e => {
                if (e.target.value === "custom") { setUseCustom(true); }
                else { setUseCustom(false); setFilterPeriod(e.target.value); }
              }}
              className="rounded-lg border px-3 py-1.5 text-sm outline-none"
              style={{ background: ELEVATED, borderColor: BORDER, color: TEXT }}>
              {PERIOD_OPTIONS.map(p => <option key={p.value} value={p.value}>{t(p.labelKey)}</option>)}
              <option value="custom">{t("analytics.filter_custom")}</option>
            </select>
          </div>

          {useCustom && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs" style={{ color: MUTED }}>{t("analytics.filter_from")}</span>
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ background: ELEVATED, borderColor: BORDER, color: TEXT }} />
              <input type="time" value={customStartTime} onChange={e => setCustomStartTime(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ background: ELEVATED, borderColor: BORDER, color: TEXT }} />
              <span className="text-xs" style={{ color: MUTED }}>{t("analytics.filter_to")}</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ background: ELEVATED, borderColor: BORDER, color: TEXT }} />
              <input type="time" value={customEndTime} onChange={e => setCustomEndTime(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-xs outline-none"
                style={{ background: ELEVATED, borderColor: BORDER, color: TEXT }} />
            </div>
          )}

          <span className="ml-auto text-xs" style={{ color: MUTED }}>
            {t("analytics.box_status_list", { count: fBoxes.length.toLocaleString() })}
          </span>
          <button onClick={loadAll}
            className="text-xs px-3 py-1.5 rounded-lg border transition hover:opacity-80"
            style={{ borderColor: ACCENT, color: ACCENT }}>
            {t("analytics.refresh")}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {TABS.map((tabLabel, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition"
              style={activeTab === i
                ? { background: ACCENT, color: "#fff" }
                : { ...cardStyle, border: `1px solid ${BORDER}`, color: MUTED }}>
              {tabLabel}
            </button>
          ))}
        </div>

        {/* TAB 1 */}
        {activeTab === 0 && (
          <div className="flex flex-col gap-6">
            <SectionHeader>{t("analytics.q1_title")}</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard
                label={t("analytics.kpi_yield")}
                value={`${yieldPct.toFixed(1)}%`}
                sub={t("analytics.kpi_yield_sub")}
                color={kpiColor(yieldPct, 90, 70)}
              />
              <KpiCard
                label={t("analytics.kpi_good_boxes")}
                value={totalAF.toLocaleString()}
                sub={t("analytics.kpi_good_boxes_sub", { target: totalTarget.toLocaleString() })}
                color={SUCCESS}
              />
              <KpiCard
                label={t("analytics.kpi_scrap")}
                value={`${scrapPct.toFixed(1)}%`}
                sub={t("analytics.kpi_scrap_sub", { count: totalNonAF })}
                color={kpiColor(scrapPct, 2, 5, true)}
              />
              <KpiCard
                label={t("analytics.kpi_active_lines")}
                value={`${activeLines}/13`}
                sub={t("analytics.kpi_active_lines_sub")}
                color={BLUE}
              />
              <KpiCard
                label={t("analytics.kpi_backlog")}
                value={latestBacklog.toLocaleString()}
                sub={t("analytics.kpi_backlog_sub")}
                color={kpiColor(latestBacklog, 0, 5, true)}
              />
              <KpiCard
                label={t("analytics.kpi_repass")}
                value={fRepass.length.toLocaleString()}
                sub={t("analytics.kpi_repass_sub")}
                color={WARNING}
              />
            </div>

            <SectionHeader>{t("analytics.q2_title")}</SectionHeader>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              <div>
                <p className="text-sm font-semibold mb-3" style={{ color: TEXT }}>
                  {t("analytics.status_13_lines")}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {ALL_LINES.map(ln => {
                    const s = lineStats.find(x => x.line === ln)!;
                    const hasData = s.tot > 0;
                    const color = !hasData ? MUTED : s.scr > 10 ? DANGER : s.scr > 3 ? WARNING : SUCCESS;
                    return (
                      <div key={ln} className="rounded-lg border p-3"
                           style={{ background: SURFACE, borderLeft: `3px solid ${color}`, borderColor: BORDER }}>
                        <p className="text-xs font-bold mb-1" style={{ color: TEXT }}>{ln}</p>
                        {hasData ? (
                          <>
                            <p className="text-sm font-black" style={{ color }}>{s.af}/{s.tot}</p>
                            <p className="text-xs" style={{ color }}>
                              {s.scr > 10 ? "⚠️" : s.scr > 3 ? "⚡" : "✅"} {s.scr.toFixed(1)}%
                            </p>
                            {s.batches && <p className="text-xs truncate mt-0.5" style={{ color: MUTED }}>{s.batches.slice(0, 18)}</p>}
                          </>
                        ) : (
                          <p className="text-xs" style={{ color: MUTED }}>{t("analytics.no_line_data")}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: TEXT }}>
                  {t("analytics.progress_title")}
                </p>
                <p className="text-xs mb-3" style={{ color: MUTED }}>{t("analytics.progress_sub")}</p>
                {progressData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={progressData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                      <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fill: MUTED, fontSize: 11 }} domain={[0, 110]} />
                      <Tooltip
                        {...TOOLTIP_STYLE}
                        formatter={(v: any, _: any, p: any) => [
                          `${v}% (AF: ${p.payload.af} / ${p.payload.target}) · ${p.payload.batch}`, t("analytics.progress_tooltip")
                        ]}
                      />
                      <Bar dataKey="pct" radius={[4, 4, 0, 0]}
                           label={{ position: "top", fill: "#94a3b8", fontSize: 10, formatter: ((v: number) => `${v}%`) as any }}>
                        {progressData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="rounded-xl border p-8 text-center" style={cardStyle}>
                    <p style={{ color: MUTED }}>{t("analytics.no_running_batch")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2 */}
        {activeTab === 1 && (
          <div className="flex flex-col gap-6">
            <SectionHeader>{t("analytics.q3_title")}</SectionHeader>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              <div className="rounded-xl border p-5" style={cardStyle}>
                <p className="text-sm font-semibold mb-1" style={{ color: TEXT }}>
                  {t("analytics.pareto_title")}
                </p>
                <p className="text-xs mb-4" style={{ color: MUTED }}>
                  {t("analytics.pareto_sub", { count: pendingBoxes.length })}
                </p>
                {paretoData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={paretoData} margin={{ top: 10, right: 40, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <YAxis yAxisId="left"  tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right"
                               tickFormatter={v => `${v}%`}
                               tick={{ fill: "#94a3b8", fontSize: 10 }}
                               domain={[0, 110]} />
                        <Tooltip
                          contentStyle={{ background: "#1e2230", border: "1px solid #2e3450", borderRadius: 8 }}
                          labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
                          itemStyle={{ color: "#e2e8f0" }}
                        />
                        <Bar yAxisId="left" dataKey="count" radius={[4, 4, 0, 0]} name="Quantity">
                          {paretoData.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? DANGER : i === 1 ? "#ff6b81" : i < 4 ? WARNING : BLUE} />
                          ))}
                        </Bar>
                        <Line
                          yAxisId="right"
                          type="linear"
                          dataKey="cumPct"
                          stroke={SUCCESS}
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: SUCCESS, strokeWidth: 0 }}
                          name="Cumulative %"
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {paretoData.slice(0, 3).map((d, i) => (
                        <div key={i} className="rounded-lg border p-3 text-center"
                             style={{ borderColor: [DANGER, WARNING, BLUE][i] + "60", background: ELEVATED }}>
                          <p className="text-lg font-black" style={{ color: [DANGER, WARNING, BLUE][i] }}>#{i + 1}</p>
                          <p className="text-xs font-bold mt-1" style={{ color: TEXT }}>{d.name}</p>
                          <p className="text-xs" style={{ color: "#94a3b8" }}>
                            {d.count} {t("analytics.times")} ({(d.count / paretoTotal * 100).toFixed(1)}%)
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{ color: SUCCESS }}>{t("analytics.no_nonaf")}</p>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-xl border p-5" style={cardStyle}>
                  <p className="text-sm font-semibold mb-4" style={{ color: TEXT }}>
                    {t("analytics.cam_pass_title")}
                  </p>
                  {camBarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={camBarData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis dataKey="line" tick={{ fill: MUTED, fontSize: 11 }} />
                        <YAxis tickFormatter={v => `${v}%`} tick={{ fill: MUTED, fontSize: 11 }} domain={[0, 105]} />
                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: any) => [`${v}%`]} />
                        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11 }} />
                        <Bar dataKey="cam1" name="Cam1 Pass%" fill={BLUE}    radius={[3, 3, 0, 0]} />
                        <Bar dataKey="cam2" name="Cam2 Pass%" fill={SUCCESS} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p style={{ color: MUTED }}>{t("analytics.no_camera_data")}</p>
                  )}
                </div>

                <div className="rounded-xl border p-4" style={cardStyle}>
                  <p className="text-sm font-semibold mb-3" style={{ color: TEXT }}>
                    {t("analytics.cam_detail_title")}
                  </p>
                  {camTableData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr style={{ background: ELEVATED }}>
                            {["Line", "Cam1 Pass%", "Cam2 Pass%", "Cam1 Rej", "Cam2 Rej", "Top Defects"].map(h => (
                              <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap"
                                  style={{ color: "#94a3b8", borderBottom: `1px solid ${BORDER}` }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {camTableData.map((r, i) => (
                            <tr key={r.line}
                                style={{ background: i % 2 === 0 ? SURFACE : ELEVATED, borderTop: `1px solid ${BORDER}` }}>
                              <td className="px-3 py-2 font-bold" style={{ color: TEXT }}>{r.line}</td>
                              <td className="px-3 py-2 font-bold" style={{ color: passColor(r.cam1) }}>
                                {r.cam1 != null ? `${r.cam1.toFixed(2)}%` : "-"}
                              </td>
                              <td className="px-3 py-2 font-bold" style={{ color: passColor(r.cam2) }}>
                                {r.cam2 != null ? `${r.cam2.toFixed(2)}%` : "-"}
                              </td>
                              <td className="px-3 py-2" style={{ color: "#94a3b8" }}>{r.c1rej}</td>
                              <td className="px-3 py-2" style={{ color: "#94a3b8" }}>{r.c2rej}</td>
                              <td className="px-3 py-2" style={{ color: "#94a3b8" }}>{r.topDefs || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: MUTED }}>{t("analytics.no_camera_data")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3 */}
        {activeTab === 2 && (
          <div className="flex flex-col gap-6">
            <SectionHeader>{t("analytics.detail_title")}</SectionHeader>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <p className="text-sm font-semibold mb-3" style={{ color: TEXT }}>
                  {t("analytics.summary_line_title")}
                </p>
                <div className="overflow-x-auto rounded-xl border" style={{ borderColor: BORDER }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: ELEVATED }}>
                        {["Line", "AF Box", "Target", "Yield%", "Scrap%", "Rej (kg)", "Backlog", "Status"].map(h => (
                          <th key={h} className="px-3 py-3 text-left font-medium whitespace-nowrap"
                              style={{ color: "#94a3b8", borderBottom: `1px solid ${BORDER}` }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lineStats.filter(s => s.tot > 0).map((s, i) => (
                        <tr key={s.line} style={{ background: i % 2 === 0 ? SURFACE : "var(--color-anu-void)", borderTop: `1px solid ${BORDER}` }}>
                          <td className="px-3 py-2.5 font-bold"  style={{ color: TEXT }}>{s.line}</td>
                          <td className="px-3 py-2.5 font-bold"  style={{ color: SUCCESS }}>{s.af.toLocaleString()}</td>
                          <td className="px-3 py-2.5"            style={{ color: "#94a3b8" }}>{s.tgt.toLocaleString()}</td>
                          <td className="px-3 py-2.5 font-bold"  style={{ color: kpiColor(s.yld, 90, 70) }}>{s.yld.toFixed(1)}%</td>
                          <td className="px-3 py-2.5 font-bold"  style={{ color: kpiColor(s.scr, 2, 5, true) }}>{s.scr.toFixed(1)}%</td>
                          <td className="px-3 py-2.5"            style={{ color: s.rejKg > 0 ? WARNING : "#94a3b8" }}>{s.rejKg.toFixed(2)}</td>
                          <td className="px-3 py-2.5"            style={{ color: s.bl > 0 ? DANGER : "#94a3b8" }}>{s.bl}</td>
                          <td className="px-3 py-2.5">
                            <span style={{ color: s.scr <= 3 ? SUCCESS : s.scr <= 10 ? WARNING : DANGER }}>
                              {s.scr <= 3 ? "🟢" : s.scr <= 10 ? "🟡" : "🔴"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {lineStats.filter(s => s.tot > 0).length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: MUTED }}>{t("analytics.no_data")}</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-xl border p-4" style={cardStyle}>
                  <p className="text-sm font-semibold mb-3" style={{ color: TEXT }}>
                    {t("analytics.backlog_by_line")}
                  </p>
                  {lineStats.filter(s => s.bl > 0).length > 0 ? (
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart
                        data={lineStats.filter(s => s.bl > 0).map(s => ({ line: s.line, backlog: s.bl }))}
                        margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis dataKey="line" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ background: "#1e2230", border: "1px solid #2e3450", borderRadius: 8 }}
                          labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
                          itemStyle={{ color: "#e2e8f0" }}
                        />
                        <Bar dataKey="backlog" radius={[3, 3, 0, 0]}>
                          {lineStats.filter(s => s.bl > 0).map((s, i) => (
                            <Cell key={i} fill={s.bl > 10 ? DANGER : s.bl > 5 ? WARNING : SUCCESS} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center py-4 text-sm" style={{ color: SUCCESS }}>{t("analytics.no_pending_work")}</p>
                  )}
                </div>

                <div className="rounded-xl border p-4" style={cardStyle}>
                  <p className="text-sm font-semibold mb-3" style={{ color: TEXT }}>
                    {t("analytics.repass_summary")}
                  </p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: t("analytics.repass_all"),     value: rpTotal,               color: TEXT },
                      { label: t("analytics.repass_success"), value: rpSuccess,             color: SUCCESS },
                      { label: t("analytics.repass_rate"),    value: `${rpRate.toFixed(1)}%`, color: kpiColor(rpRate, 80, 60) },
                    ].map(k => (
                      <div key={k.label} className="rounded-lg border p-2 text-center"
                           style={{ background: ELEVATED, borderColor: BORDER }}>
                        <p className="text-xs mb-1" style={{ color: MUTED }}>{k.label}</p>
                        <p className="text-lg font-black" style={{ color: k.color }}>{k.value}</p>
                      </div>
                    ))}
                  </div>
                  {rpByLine.length > 0 && (
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={rpByLine} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis dataKey="line" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ background: "#1e2230", border: "1px solid #2e3450", borderRadius: 8 }}
                          labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
                          itemStyle={{ color: "#e2e8f0" }}
                        />
                        <Bar dataKey="count" fill={WARNING} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            <div>
              <SectionHeader>{t("analytics.pending_section")}</SectionHeader>
              {pendingBoxes.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2 overflow-x-auto rounded-xl border" style={{ borderColor: BORDER }}>
                    <p className="px-4 py-3 text-sm" style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                      {t("analytics.pending_count")} <span style={{ color: DANGER, fontWeight: 700 }}>{pendingBoxes.length}</span> {t("analytics.pending_awaiting")}
                    </p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: ELEVATED }}>
                          {["Line", "Batch", "Box", "Status", "Defects", "Time"].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left font-medium"
                                style={{ color: "#94a3b8", borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pendingBoxes.slice(0, 50).map((b, i) => (
                          <tr key={b.id} style={{ background: i % 2 === 0 ? SURFACE : "var(--color-anu-void)", borderTop: `1px solid ${BORDER}` }}>
                            <td className="px-3 py-2 font-medium" style={{ color: TEXT }}>{b.line}</td>
                            <td className="px-3 py-2" style={{ color: TEXT }}>{b.batch}</td>
                            <td className="px-3 py-2 font-black" style={{ color: ACCENT }}>#{b.box_number}</td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                                    style={{ background: `${STATUS_COLORS[b.status] || MUTED}20`, color: STATUS_COLORS[b.status] || MUTED }}>
                                {b.status}
                              </span>
                            </td>
                            <td className="px-3 py-2" style={{ color: "#94a3b8" }}>{b.defects || "-"}</td>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: "#94a3b8" }}>{b.time_stamp?.slice(0, 16).replace("T", " ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-xl border p-5" style={cardStyle}>
                    <p className="text-sm font-semibold mb-4" style={{ color: TEXT }}>
                      {pendingPieData.length > 0 ? t("analytics.defect_of_nonaf") : t("analytics.status_of_nonaf")}
                    </p>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={pendingPieData.length > 0 ? pendingPieData :
                            Object.entries(
                              pendingBoxes.reduce((acc: any, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {})
                            ).map(([name, value]) => ({ name, value }))}
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={90}
                          dataKey="value"
                          label={((props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`) as any}
                          labelLine={false}
                        >
                          {(pendingPieData.length > 0 ? pendingPieData :
                            Object.entries(pendingBoxes.reduce((acc: any, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {}))
                          ).map((_, i) => (
                            <Cell key={i} fill={DEFECT_COLORS[i % DEFECT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "#1e2230", border: "1px solid #2e3450", borderRadius: 8 }}
                          labelStyle={{ color: "#e2e8f0", fontWeight: 600 }}
                          itemStyle={{ color: "#e2e8f0" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border p-6 text-center" style={cardStyle}>
                  <p style={{ color: SUCCESS }}>{t("analytics.no_pending")}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs mt-8" style={{ color: "#2a3550" }}>
          {t("analytics.footer_updated")}: {new Date().toLocaleString("th-TH")} · Production Tracking System
        </p>
      </div>
    </div>
  );
}