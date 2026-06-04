"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer,
  ComposedChart, Scatter
} from "recharts";

// ── Constants ──────────────────────────────────────────────────────────────
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

const DEFECT_COLORS = [DANGER,"#ff6b81",WARNING,BLUE,SUCCESS,"#9b59b6","#e67e22","#f1c40f","#2ecc71","#3498db"];

const STATUS_COLORS: Record<string, string> = {
  AF: SUCCESS, Sort: WARNING, PS: "#f97316",
  HP: BLUE, HUP: "#6366f1", HFX: "#a855f7", Scrap: DANGER
};

// ── Helpers ────────────────────────────────────────────────────────────────
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

const chartTheme = {
  background: "transparent",
  style: { fontSize: 11, fill: TEXT },
  gridColor: BORDER,
};

// ── Main Page ──────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [filterLine, setFilterLine] = useState("ทั้งหมด");
  const [filterPeriod, setFilterPeriod] = useState("ทั้งหมด");

  // Raw data
  const [plans, setPlans] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [backlog, setBacklog] = useState<any[]>([]);
  const [rejection, setRejection] = useState<any[]>([]);
  const [camera, setCamera] = useState<any[]>([]);
  const [repass, setRepass] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // ── Filter helpers ─────────────────────────────────────────────────────
  function applyFilter<T extends Record<string, any>>(data: T[], lineKey: string, timeKey?: string): T[] {
    let d = [...data];
    if (filterLine !== "ทั้งหมด") d = d.filter(r => r[lineKey] === filterLine);
    if (timeKey && filterPeriod !== "ทั้งหมด") {
      const now = new Date();
      const cutoff = filterPeriod === "วันนี้"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : filterPeriod === "7 วันล่าสุด"
          ? new Date(now.getTime() - 7 * 86400000)
          : new Date(now.getTime() - 30 * 86400000);
      d = d.filter(r => new Date(r[timeKey]) >= cutoff);
    }
    return d;
  }

  const fBoxes    = applyFilter(boxes,     "line", "time_stamp");
  const fRej      = applyFilter(rejection, "line", "time_stamp");
  const fCamera   = applyFilter(camera,    "line", "time_stamp");
  const fRepass   = applyFilter(repass,    "line", "time_stamp");
  const fBacklog  = applyFilter(backlog,   "line");
  const fPlans    = filterLine === "ทั้งหมด" ? plans : plans.filter(p => p.line === filterLine);
  const runPlans  = fPlans.filter(p => p.batch_status !== "Finished");

  // ── KPIs ──────────────────────────────────────────────────────────────
  const totalTarget   = runPlans.reduce((s, p) => s + (p.need_af_box || 0), 0);
  const totalAF       = fBoxes.filter(b => b.status === "AF").length;
  const totalBoxes    = fBoxes.length;
  const totalNonAF    = totalBoxes - totalAF;
  const yieldPct      = totalTarget > 0 ? (totalAF / totalTarget * 100) : 0;
  const scrapPct      = totalBoxes > 0  ? (totalNonAF / totalBoxes * 100) : 0;
  const activeLines   = [...new Set(fBoxes.map(b => b.line))].length;
  const latestBacklog = Object.values(
    fBacklog.reduce((acc: any, b) => {
      if (!acc[b.line] || new Date(b.time_stamp) > new Date(acc[b.line].time_stamp)) acc[b.line] = b;
      return acc;
    }, {})
  ).reduce((s: number, b: any) => s + (b.total_backlog || 0), 0);

  // ── Line stats for matrix & table ───────────────────────────────────
  const ALL_LINES = Array.from({ length: 13 }, (_, i) => `H5${String(i + 1).padStart(2, "0")}`);
  const lineStats = ALL_LINES.map(ln => {
    const lb = fBoxes.filter(b => b.line === ln);
    const af = lb.filter(b => b.status === "AF").length;
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

  // ── Progress chart data ──────────────────────────────────────────────
  const progressData = lineStats
    .filter(s => s.tgt > 0 && s.tot > 0)
    .map(s => ({
      name: s.line,
      pct: parseFloat(s.yld.toFixed(1)),
      af: s.af,
      target: s.tgt,
      color: s.yld >= 90 ? SUCCESS : s.yld >= 60 ? WARNING : DANGER,
    }));

  // ── Defect pareto ────────────────────────────────────────────────────
  const defectCounts: Record<string, number> = {};
  fBoxes.filter(b => b.status !== "AF" && b.defects).forEach(b => {
    b.defects.split(",").forEach((d: string) => {
      const t = d.trim();
      if (t && !["nan","none","-",""].includes(t.toLowerCase())) {
        defectCounts[t] = (defectCounts[t] || 0) + 1;
      }
    });
  });
  const paretoRaw = Object.entries(defectCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 10);
  const paretoTotal = paretoRaw.reduce((s, [, v]) => s + v, 0);
  let cumPct = 0;
  const paretoData = paretoRaw.map(([name, count]) => {
    cumPct += count / paretoTotal * 100;
    return { name, count, cumPct: parseFloat(cumPct.toFixed(1)) };
  });

  // ── Camera data ──────────────────────────────────────────────────────
  const camByLine: Record<string, { c1: number[]; c2: number[] }> = {};
  fCamera.forEach(c => {
    if (!camByLine[c.line]) camByLine[c.line] = { c1: [], c2: [] };
    if (c.cam1_pass_rate != null) camByLine[c.line].c1.push(c.cam1_pass_rate);
    if (c.cam2_pass_rate != null) camByLine[c.line].c2.push(c.cam2_pass_rate);
  });
  const camData = Object.entries(camByLine).map(([line, v]) => ({
    line,
    cam1: v.c1.length > 0 ? parseFloat((v.c1.reduce((a, b) => a + b) / v.c1.length).toFixed(2)) : null,
    cam2: v.c2.length > 0 ? parseFloat((v.c2.reduce((a, b) => a + b) / v.c2.length).toFixed(2)) : null,
  }));

  // ── Camera defect pareto ─────────────────────────────────────────────
  const camDefCounts: Record<string, number> = {};
  fCamera.forEach(c => {
    [c.cam1_defects, c.cam2_defects].forEach((ds: string) => {
      if (!ds) return;
      ds.split(",").forEach((item: string) => {
        const m = item.trim().match(/^(.+)\((\d+)\)$/);
        if (m) camDefCounts[m[1].trim()] = (camDefCounts[m[1].trim()] || 0) + parseInt(m[2]);
      });
    });
  });
  const camDefData = Object.entries(camDefCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  // ── Pending non-AF ───────────────────────────────────────────────────
  const latestBoxMap: Record<string, any> = {};
  boxes.forEach(b => {
    const key = `${b.batch}__${b.box_number}`;
    if (!latestBoxMap[key] || new Date(b.time_stamp) > new Date(latestBoxMap[key].time_stamp))
      latestBoxMap[key] = b;
  });
  const pendingBoxes = Object.values(latestBoxMap)
    .filter(b => b.status !== "AF")
    .filter(b => filterLine === "ทั้งหมด" || b.line === filterLine);

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

  // ── Repass summary ───────────────────────────────────────────────────
  const rpSuccess  = fRepass.filter(r => r.result_status === "AF").length;
  const rpTotal    = fRepass.length;
  const rpRate     = rpTotal > 0 ? (rpSuccess / rpTotal * 100) : 0;
  const rpByLine   = Object.entries(
    fRepass.reduce((acc: any, r) => { acc[r.line] = (acc[r.line] || 0) + 1; return acc; }, {})
  ).map(([line, count]) => ({ line, count }));

  // ── UI ───────────────────────────────────────────────────────────────
  const cardStyle = { background: SURFACE, borderColor: BORDER };
  const lineOptions = ["ทั้งหมด", ...ALL_LINES];
  const periodOptions = ["ทั้งหมด", "วันนี้", "7 วันล่าสุด", "30 วันล่าสุด"];
  const tabs = ["📊 Overview & Progress", "🔬 Quality Analysis", "📋 Detail & Pending"];

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <p style={{ color: MUTED }}>กำลังโหลดข้อมูล...</p>
    </div>
  );

  return (
    <div className="w-full min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-wide" style={{ color: TEXT }}>
            📈 Executive Production Dashboard
          </h1>
          <p className="text-xs mt-1" style={{ color: MUTED }}>
            Monitoring 13 สายการผลิต · อัปเดตล่าสุด: {new Date().toLocaleString("th-TH")}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="rounded-xl border p-4 mb-6 flex flex-wrap gap-4 items-center"
             style={{ background: "#0a0c12", borderColor: BORDER }}>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: MUTED }}>🏭 Line</span>
            <select value={filterLine} onChange={e => setFilterLine(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm outline-none"
              style={{ background: ELEVATED, borderColor: BORDER, color: TEXT }}>
              {lineOptions.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: MUTED }}>📅 ช่วงเวลา</span>
            <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-sm outline-none"
              style={{ background: ELEVATED, borderColor: BORDER, color: TEXT }}>
              {periodOptions.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <span className="ml-auto text-xs" style={{ color: MUTED }}>
            Box Status: {fBoxes.length.toLocaleString()} รายการ
          </span>
          <button onClick={loadAll}
            className="text-xs px-3 py-1.5 rounded-lg border transition hover:opacity-80"
            style={{ borderColor: ACCENT, color: ACCENT }}>
            🔄 Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((t, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition"
              style={activeTab === i
                ? { background: ACCENT, color: "#fff" }
                : { ...cardStyle, border: `1px solid ${BORDER}`, color: MUTED }}>
              {t}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 1: Overview & Progress                                  */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 0 && (
          <div className="flex flex-col gap-6">
            <SectionHeader>Q1 — Executive KPIs</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard label="Yield Rate"    value={`${yieldPct.toFixed(1)}%`}  sub="AF / Target"      color={kpiColor(yieldPct, 90, 70)} />
              <KpiCard label="Good Boxes"    value={totalAF.toLocaleString()}   sub={`จาก ${totalTarget.toLocaleString()} เป้า`} color={SUCCESS} />
              <KpiCard label="Scrap Rate"    value={`${scrapPct.toFixed(1)}%`}  sub={`${totalNonAF} กล่องไม่ผ่าน`}    color={kpiColor(scrapPct, 2, 5, true)} />
              <KpiCard label="Active Lines"  value={`${activeLines}/13`}        sub="สายที่มีข้อมูล"    color={BLUE} />
              <KpiCard label="Backlog"       value={latestBacklog.toLocaleString()} sub="งานค้างสะสม"   color={kpiColor(latestBacklog, 0, 5, true)} />
              <KpiCard label="Re-pass Total" value={fRepass.length.toLocaleString()} sub="ชิ้นงานส่งซ่อม" color={WARNING} />
            </div>

            <SectionHeader>Q2 — Line Status Matrix & Production Progress</SectionHeader>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Line Matrix */}
              <div>
                <p className="text-sm font-semibold mb-3" style={{ color: TEXT }}>🟢 สถานะ 13 สายการผลิต</p>
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
                            <p className="text-sm font-black" style={{ color }}>
                              {s.af}/{s.tot}
                            </p>
                            <p className="text-xs" style={{ color }}>
                              {s.scr > 10 ? "⚠️" : s.scr > 3 ? "⚡" : "✅"} {s.scr.toFixed(1)}%
                            </p>
                            {s.batches && <p className="text-xs truncate mt-0.5" style={{ color: MUTED }}>{s.batches.slice(0, 18)}</p>}
                          </>
                        ) : (
                          <p className="text-xs" style={{ color: MUTED }}>ไม่มีข้อมูล</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress Bar Chart */}
              <div>
                <p className="text-sm font-semibold mb-3" style={{ color: TEXT }}>📊 Production Progress % by Line</p>
                {progressData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={progressData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                      <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fill: MUTED, fontSize: 11 }} domain={[0, 110]} />
                      <Tooltip
                        contentStyle={{ background: ELEVATED, border: `1px solid ${BORDER}`, borderRadius: 8 }}
                        labelStyle={{ color: TEXT }}
                        formatter={(v: any, _: any, p: any) => [
                          `${v}% (AF: ${p.payload.af} / ${p.payload.target})`, "Progress"
                        ]}
                      />
                      <Bar 
                        dataKey="pct" 
                        radius={[4, 4, 0, 0]} 
                        label={{ 
                            position: "top", 
                            fill: "var(--color-anu-muted)", 
                            fontSize: 10, 
                            formatter: ((v: number) => `${v}%`) as any 
                            }}>
                        {progressData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="rounded-xl border p-8 text-center" style={cardStyle}>
                    <p style={{ color: MUTED }}>ไม่มี Batch ที่กำลัง Running</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 2: Quality Analysis                                     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 1 && (
          <div className="flex flex-col gap-6">
            <SectionHeader>Q3 — Scrap Pareto & Camera Performance</SectionHeader>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Defect Pareto */}
              <div className="rounded-xl border p-5" style={cardStyle}>
                <p className="text-sm font-semibold mb-4" style={{ color: TEXT }}>🔴 Scrap / Defect Pareto</p>
                {paretoData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={paretoData} margin={{ top: 10, right: 30, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 10 }} />
                        <YAxis yAxisId="left" tick={{ fill: MUTED, fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}%`} tick={{ fill: MUTED, fontSize: 10 }} domain={[0, 110]} />
                        <Tooltip contentStyle={{ background: ELEVATED, border: `1px solid ${BORDER}`, borderRadius: 8 }} labelStyle={{ color: TEXT }} />
                        <Bar yAxisId="left" dataKey="count" radius={[4, 4, 0, 0]} name="จำนวน" >
                          {paretoData.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? DANGER : i === 1 ? "#ff6b81" : i < 4 ? WARNING : BLUE} />
                          ))}
                        </Bar>
                        <Line yAxisId="right" type="monotone" dataKey="cumPct" stroke={SUCCESS} strokeWidth={2} dot={{ r: 4, fill: SUCCESS }} name="Cumulative %" />
                      </ComposedChart>
                    </ResponsiveContainer>
                    {/* Top 3 */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      {paretoData.slice(0, 3).map((d, i) => (
                        <div key={i} className="rounded-lg border p-3 text-center"
                             style={{ borderColor: [DANGER, WARNING, BLUE][i] + "60", background: ELEVATED }}>
                          <p className="text-lg font-black" style={{ color: [DANGER, WARNING, BLUE][i] }}>#{i + 1}</p>
                          <p className="text-xs font-bold mt-1" style={{ color: TEXT }}>{d.name}</p>
                          <p className="text-xs" style={{ color: MUTED }}>{d.count} ครั้ง ({(d.count / paretoTotal * 100).toFixed(1)}%)</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p style={{ color: SUCCESS }}>🟢 ไม่พบ Defect</p>
                )}
              </div>

              {/* Camera Performance */}
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border p-5" style={cardStyle}>
                  <p className="text-sm font-semibold mb-4" style={{ color: TEXT }}>📷 Camera Pass Rate by Line</p>
                  {camData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={camData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis dataKey="line" tick={{ fill: MUTED, fontSize: 11 }} />
                        <YAxis tickFormatter={v => `${v}%`} tick={{ fill: MUTED, fontSize: 11 }} domain={[0, 105]} />
                        <Tooltip contentStyle={{ background: ELEVATED, border: `1px solid ${BORDER}`, borderRadius: 8 }} labelStyle={{ color: TEXT }} formatter={(v: any) => [`${v}%`]} />
                        <Legend wrapperStyle={{ color: MUTED, fontSize: 11 }} />
                        <Bar dataKey="cam1" name="Cam1 Pass%" fill={BLUE} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="cam2" name="Cam2 Pass%" fill={SUCCESS} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p style={{ color: MUTED }}>ไม่มีข้อมูล Camera</p>
                  )}
                </div>

                {/* Camera Defects */}
                {camDefData.length > 0 && (
                  <div className="rounded-xl border p-5" style={cardStyle}>
                    <p className="text-sm font-semibold mb-4" style={{ color: TEXT }}>Camera Defect รวม (Cam1+Cam2)</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={camDefData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis type="number" tick={{ fill: MUTED, fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: MUTED, fontSize: 10 }} width={55} />
                        <Tooltip contentStyle={{ background: ELEVATED, border: `1px solid ${BORDER}`, borderRadius: 8 }} labelStyle={{ color: TEXT }} />
                        <Bar dataKey="count" name="จำนวน" radius={[0, 4, 4, 0]}>
                          {camDefData.map((_, i) => (
                            <Cell key={i} fill={i < 2 ? DANGER : i < 4 ? WARNING : BLUE} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TAB 3: Detail & Pending                                     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {activeTab === 2 && (
          <div className="flex flex-col gap-6">
            <SectionHeader>📋 Detail Line-by-Line Breakdown & Pending Work</SectionHeader>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* Line Table */}
              <div className="xl:col-span-2">
                <p className="text-sm font-semibold mb-3" style={{ color: TEXT }}>📊 สรุปผลแต่ละสายการผลิต</p>
                <div className="overflow-x-auto rounded-xl border" style={{ borderColor: BORDER }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: ELEVATED }}>
                        {["Line", "AF Box", "Target", "Yield%", "Scrap%", "Rej (kg)", "Backlog", "Status"].map(h => (
                          <th key={h} className="px-3 py-3 text-left font-medium whitespace-nowrap"
                              style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lineStats.filter(s => s.tot > 0).map((s, i) => (
                        <tr key={s.line} style={{ background: i % 2 === 0 ? SURFACE : "var(--color-anu-void)", borderTop: `1px solid ${BORDER}` }}>
                          <td className="px-3 py-2.5 font-bold" style={{ color: TEXT }}>{s.line}</td>
                          <td className="px-3 py-2.5 font-bold" style={{ color: SUCCESS }}>{s.af.toLocaleString()}</td>
                          <td className="px-3 py-2.5" style={{ color: MUTED }}>{s.tgt.toLocaleString()}</td>
                          <td className="px-3 py-2.5 font-bold" style={{ color: kpiColor(s.yld, 90, 70) }}>{s.yld.toFixed(1)}%</td>
                          <td className="px-3 py-2.5 font-bold" style={{ color: kpiColor(s.scr, 2, 5, true) }}>{s.scr.toFixed(1)}%</td>
                          <td className="px-3 py-2.5" style={{ color: s.rejKg > 0 ? WARNING : MUTED }}>{s.rejKg.toFixed(2)}</td>
                          <td className="px-3 py-2.5" style={{ color: s.bl > 0 ? DANGER : MUTED }}>{s.bl}</td>
                          <td className="px-3 py-2.5">
                            <span style={{ color: s.scr <= 3 ? SUCCESS : s.scr <= 10 ? WARNING : DANGER }}>
                              {s.scr <= 3 ? "🟢" : s.scr <= 10 ? "🟡" : "🔴"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {lineStats.filter(s => s.tot > 0).length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-8 text-center" style={{ color: MUTED }}>ไม่มีข้อมูล</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right side */}
              <div className="flex flex-col gap-4">

                {/* Backlog chart */}
                <div className="rounded-xl border p-4" style={cardStyle}>
                  <p className="text-sm font-semibold mb-3" style={{ color: TEXT }}>⏳ Backlog by Line</p>
                  {rpByLine.length > 0 ? (
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={lineStats.filter(s => s.bl > 0).map(s => ({ line: s.line, backlog: s.bl }))}
                                margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                        <XAxis dataKey="line" tick={{ fill: MUTED, fontSize: 10 }} />
                        <YAxis tick={{ fill: MUTED, fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: ELEVATED, border: `1px solid ${BORDER}`, borderRadius: 8 }} labelStyle={{ color: TEXT }} />
                        <Bar dataKey="backlog" radius={[3, 3, 0, 0]}>
                          {lineStats.filter(s => s.bl > 0).map((s, i) => (
                            <Cell key={i} fill={s.bl > 10 ? DANGER : s.bl > 5 ? WARNING : SUCCESS} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center py-4 text-sm" style={{ color: SUCCESS }}>🟢 ไม่มีงานค้าง</p>
                  )}
                </div>

                {/* Repass summary */}
                <div className="rounded-xl border p-4" style={cardStyle}>
                  <p className="text-sm font-semibold mb-3" style={{ color: TEXT }}>🔄 Re-pass Summary</p>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { label: "ทั้งหมด", value: rpTotal, color: TEXT },
                      { label: "สำเร็จ",  value: rpSuccess, color: SUCCESS },
                      { label: "Rate",    value: `${rpRate.toFixed(1)}%`, color: kpiColor(rpRate, 80, 60) },
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
                        <XAxis dataKey="line" tick={{ fill: MUTED, fontSize: 10 }} />
                        <YAxis tick={{ fill: MUTED, fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: ELEVATED, border: `1px solid ${BORDER}`, borderRadius: 8 }} labelStyle={{ color: TEXT }} />
                        <Bar dataKey="count" fill={WARNING} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Non-AF Pending */}
            <div>
              <SectionHeader>⚠️ 'กล่องที่รอการ' Re-pass / ยังไม่ผ่าน (Non-AF)</SectionHeader>
              {pendingBoxes.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2 overflow-x-auto rounded-xl border" style={{ borderColor: BORDER }}>
                    <p className="px-4 py-3 text-sm" style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
                      พบ <span style={{ color: DANGER, fontWeight: 700 }}>{pendingBoxes.length}</span> กล่องรอดำเนินการ
                    </p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: ELEVATED }}>
                          {["Line", "Batch", "กล่อง", "Status", "Defects", "เวลา"].map(h => (
                            <th key={h} className="px-3 py-2.5 text-left font-medium" style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>{h}</th>
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
                            <td className="px-3 py-2" style={{ color: MUTED }}>{b.defects || "-"}</td>
                            <td className="px-3 py-2 whitespace-nowrap" style={{ color: MUTED }}>{b.time_stamp?.slice(0, 16).replace("T", " ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pie chart */}
                  <div className="rounded-xl border p-5" style={cardStyle}>
                    <p className="text-sm font-semibold mb-4" style={{ color: TEXT }}>
                      {pendingPieData.length > 0 ? "Defect ของ Non-AF" : "Status ของ Non-AF"}
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
                        <Tooltip contentStyle={{ background: ELEVATED, border: `1px solid ${BORDER}`, borderRadius: 8 }} labelStyle={{ color: TEXT }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border p-6 text-center" style={cardStyle}>
                  <p style={{ color: SUCCESS }}>🟢 ทุกกล่องผ่านเกณฑ์ AF แล้ว ไม่มีงานค้าง</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs mt-8" style={{ color: "#2a3550" }}>
          📊 ประมวลผลล่าสุด: {new Date().toLocaleString("th-TH")} · Production Tracking System
        </p>
      </div>
    </div>
  );
}