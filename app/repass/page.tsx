"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { withRecordedBy } from "@/lib/audit/stamp";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { PRODUCTION_LINES } from "@/lib/constants/production";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/context";
import { AppIcon } from "@/components/AppIcon";
import { FormSkeleton } from "@/components/ui/Skeleton";

const BOX_STATUS = ["AF", "HP", "HUP", "Sort", "PS", "Scrap", "HFX"];
const DEFECT_LIST = ["Bubble", "Mashed", "Dent cap", "Dent body", "Loose", "Rough edge", "Ink speck", "Soiled", "Dirty", "Skewing", "Machine breakdown"];

export default function RepassPage() {
  const router = useRouter();
  const { t }  = useI18n();

  const { user, loading: authLoading } = useRequireAuth();
  const [step, setStep] = useState<"line" | "batch" | "box" | "record" | "view">("line");

  const [activeLines, setActiveLines]     = useState<string[]>([]);
  const [activeBatches, setActiveBatches] = useState<string[]>([]);
  const [nonAfBoxes, setNonAfBoxes]       = useState<any[]>([]);

  const [selLine, setSelLine]   = useState("");
  const [selBatch, setSelBatch] = useState("");
  const [selBox, setSelBox]     = useState<any>(null);
  const [isOther, setIsOther]   = useState(false);

  const [otherLine, setOtherLine]     = useState(PRODUCTION_LINES[0]);
  const [otherBatch, setOtherBatch]   = useState("");
  const [otherBoxNum, setOtherBoxNum] = useState("");

  const [mode, setMode]                 = useState<"Online" | "Offline">("Online");
  const [resultStatus, setResultStatus] = useState("AF");
  const [newDefects, setNewDefects]     = useState<string[]>([]);
  const [reason, setReason]             = useState("");

  const now = new Date();
  const roundedMin = Math.floor(now.getMinutes() / 15) * 15;
  const defaultTime = `${String(now.getHours()).padStart(2, "0")}:${String(roundedMin).padStart(2, "0")}`;

  const [startDate, setStartDate] = useState(now.toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(defaultTime);
  const [endDate, setEndDate]     = useState(now.toISOString().slice(0, 10));
  const [endTime, setEndTime]     = useState("");

  const [saving, setSaving]         = useState(false);
  const [viewData, setViewData]     = useState<any[]>([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewPeriod, setViewPeriod] = useState<"All" | "Today" | "Last 7 days">("All");

  const needDefect = !["AF", "HP", "HUP"].includes(resultStatus);
  const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const h = Math.floor(i / 4);
    const m = (i % 4) * 15;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  });

  const cardStyle = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };
  const STATUS_COLORS: Record<string, string> = {
    AF: "var(--color-anu-success)", Sort: "var(--color-anu-warning)",
    PS: "#f97316", HP: "#3b82f6", HUP: "#6366f1",
    HFX: "#a855f7", Scrap: "var(--color-anu-danger)",
  };

  useEffect(() => {
    if (authLoading || !user) return;
    loadActiveLines();
  }, [authLoading, user]);

  async function loadActiveLines() {
    const { data } = await supabase.from("boxes").select("line").neq("status", "AF");
    const unique = [...new Set((data || []).map((d: any) => d.line))].sort();
    setActiveLines(unique);
  }

  async function loadActiveBatches(line: string) {
    const { data } = await supabase.from("boxes").select("batch").eq("line", line).neq("status", "AF");
    const unique = [...new Set((data || []).map((d: any) => d.batch))];
    setActiveBatches(unique);
  }

  async function loadNonAfBoxes(batch: string) {
    const { data } = await supabase.from("boxes").select("*").eq("batch", batch).neq("status", "AF").order("box_number");
    setNonAfBoxes(data || []);
  }

  async function loadViewData() {
    setViewLoading(true);
    const { data: repassData } = await supabase
      .from("repass")
      .select("*")
      .order("recorded_at", { ascending: false })
      .limit(200);

    if (!repassData || repassData.length === 0) {
      setViewData([]);
      setViewLoading(false);
      return;
    }

    const { data: boxData } = await supabase.from("boxes").select("batch, box_number, defects");
    const boxMap: Record<string, string> = {};
    (boxData || []).forEach((b: any) => {
      boxMap[`${b.batch}__${b.box_number}`] = b.defects || "-";
    });

    const merged = repassData.map(r => ({
      ...r,
      original_defects: boxMap[`${r.batch}__${r.box_number}`] || "-",
    }));

    setViewData(merged);
    setViewLoading(false);
  }

  function resetRecordForm() {
    setResultStatus("AF");
    setNewDefects([]);
    setReason("");
    setEndTime("");
  }

  async function handleSave() {
    const line       = isOther ? otherLine  : selLine;
    const batch      = isOther ? otherBatch : selBatch;
    const boxNum     = isOther ? parseInt(otherBoxNum) : selBox?.box_number;
    const prevStatus = isOther ? "N/A" : selBox?.status;

    if (!batch || !boxNum) { alert(t("repass.alert_specify_box")); return; }
    if (needDefect && newDefects.length === 0) {
      alert(t("repass.alert_specify_defect", { status: resultStatus }));
      return;
    }
    if (!user?.id) return;

    setSaving(true);
    await supabase.from("repass").insert([
      withRecordedBy(
        {
          line, batch,
          box_number: boxNum,
          previous_status: prevStatus,
          result_status: resultStatus,
          new_defects: needDefect ? newDefects.join(",") : null,
          type: mode,
          reason: resultStatus === "AF" ? t("repass.reason_normal") : reason,
          start_time: `${startDate}T${startTime}:00`,
          complete_time: endTime ? `${endDate}T${endTime}:00` : null,
          repass_by: user.id,
        },
        user.id,
      ),
    ]);

    if (!isOther) {
      await supabase.from("boxes").update({
        status:  resultStatus,
        defects: needDefect ? newDefects.join(",") : selBox?.defects,
      }).eq("batch", batch).eq("box_number", boxNum);
    }

    setSaving(false);
    resetRecordForm();

    if (isOther) {
      setOtherBatch("");
      setOtherBoxNum("");
      alert(t("repass.alert_success"));
    } else {
      await loadNonAfBoxes(batch);
      setStep("box");
      setSelBox(null);
    }
  }

  const filteredView = viewData.filter(r => {
    if (viewPeriod === "All") return true;
    const d = new Date(r.recorded_at);
    const n = new Date();
    if (viewPeriod === "Today") return d.toDateString() === n.toDateString();
    if (viewPeriod === "Last 7 days") return (n.getTime() - d.getTime()) < 7 * 86400000;
    return true;
  });

  const PERIODS: { key: "All" | "Today" | "Last 7 days"; labelKey: string }[] = [
    { key: "All",          labelKey: "repass.period_all" },
    { key: "Today",        labelKey: "repass.period_today" },
    { key: "Last 7 days",  labelKey: "repass.period_7days" },
  ];

  const TABLE_HEADERS = [
    t("repass.col_time"), t("repass.col_line"), t("repass.col_batch"), t("repass.col_box"),
    t("repass.col_prev_status"), t("repass.col_result"), t("repass.col_defects"),
    t("repass.col_type"), t("repass.col_reason"), t("repass.col_start"),
    t("repass.col_complete"), t("repass.col_done_by"),
  ];

  if (authLoading || !user) return <FormSkeleton />;

  return (
    <div className="w-full min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => {
            if (step === "record") setStep(isOther ? "line" : "box");
            else if (step === "box") { setStep("batch"); setSelBox(null); }
            else if (step === "batch") { setStep("line"); setSelBatch(""); }
            else router.push("/dashboard");
          }} className="text-sm px-3 py-1.5 rounded-lg border" style={cardStyle}>
            <AppIcon name="arrowLeft" size={14} /> {step === "view" || step === "line" ? t("repass.home") : t("repass.back")}
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-anu-text)" }}>
            <AppIcon name="refresh" size={22} /> {t("repass.title")}
          </h1>
          <button onClick={() => { setStep("view"); loadViewData(); }}
            className="ml-auto text-sm px-3 py-1.5 rounded-lg border transition"
            style={step === "view"
              ? { background: "var(--color-anu-accent)", color: "#fff", borderColor: "var(--color-anu-accent)" }
              : cardStyle}>
            <AppIcon name="clipboard" size={14} /> {t("repass.view_info")}
          </button>
        </div>

        {/* Breadcrumb */}
        {!["line", "view"].includes(step) && (
          <div className="flex gap-2 mb-6 text-sm flex-wrap">
            {isOther
              ? <span style={{ color: "var(--color-anu-glow)" }}>{t("repass.other_label")}</span>
              : <>
                  <span style={{ color: "var(--color-anu-glow)" }}>{selLine}</span>
                  {selBatch && (
                    <>
                      <span style={{ color: "var(--color-anu-muted)" }}>›</span>
                      <span style={{ color: "var(--color-anu-glow)" }}>{selBatch}</span>
                    </>
                  )}
                  {selBox && (
                    <>
                      <span style={{ color: "var(--color-anu-muted)" }}>›</span>
                      <span style={{ color: "var(--color-anu-text)" }}>#{selBox.box_number}</span>
                    </>
                  )}
                </>
            }
          </div>
        )}

        {/* VIEW */}
        {step === "view" && (
          <div>
            <div className="flex gap-3 mb-4 flex-wrap items-center">
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => { setViewPeriod(p.key); loadViewData(); }}
                  className="px-4 py-2 rounded-lg text-sm border transition"
                  style={viewPeriod === p.key
                    ? { background: "var(--color-anu-accent)", color: "#fff", borderColor: "var(--color-anu-accent)" }
                    : cardStyle}>
                  {t(p.labelKey)}
                </button>
              ))}
              <span className="ml-auto text-xs" style={{ color: "var(--color-anu-muted)" }}>
                {filteredView.length} {t("repass.view_list")}
              </span>
            </div>
            {viewLoading ? (
              <p style={{ color: "var(--color-anu-muted)" }}>{t("repass.view_loading")}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-anu-border)" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "var(--color-anu-elevated)" }}>
                      {TABLE_HEADERS.map(h => (
                        <th key={h} className="px-3 py-3 text-left font-medium whitespace-nowrap"
                            style={{ color: "var(--color-anu-muted)", borderBottom: "1px solid var(--color-anu-border)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredView.map((r, i) => (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? "var(--color-anu-surface)" : "var(--color-anu-void)", borderTop: "1px solid var(--color-anu-border)" }}>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-anu-muted)" }}>{r.recorded_at?.slice(0, 16).replace("T", " ")}</td>
                        <td className="px-3 py-2 font-medium" style={{ color: "var(--color-anu-text)" }}>{r.line}</td>
                        <td className="px-3 py-2" style={{ color: "var(--color-anu-text)" }}>{r.batch}</td>
                        <td className="px-3 py-2 text-center font-bold" style={{ color: "var(--color-anu-text)" }}>#{r.box_number}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(255,71,87,0.15)", color: "var(--color-anu-danger)" }}>
                            {r.previous_status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full" style={{
                            background: r.result_status === "AF" ? "rgba(0,212,170,0.15)" : "rgba(255,165,2,0.15)",
                            color: r.result_status === "AF" ? "var(--color-anu-success)" : "var(--color-anu-warning)",
                          }}>
                            {r.result_status}
                          </span>
                        </td>
                        <td className="px-3 py-2" style={{ color: "var(--color-anu-muted)" }}>{r.original_defects || "-"}</td>
                        <td className="px-3 py-2" style={{ color: "var(--color-anu-muted)" }}>{r.type}</td>
                        <td className="px-3 py-2" style={{ color: "var(--color-anu-muted)" }}>{r.reason || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-anu-muted)" }}>{r.start_time?.slice(0, 16).replace("T", " ")}</td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-anu-muted)" }}>{r.complete_time?.slice(0, 16).replace("T", " ") || "-"}</td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--color-anu-muted)" }}>{r.repass_by || "-"}</td>
                      </tr>
                    ))}
                    {filteredView.length === 0 && (
                      <tr><td colSpan={12} className="px-4 py-8 text-center" style={{ color: "var(--color-anu-muted)" }}>{t("repass.view_no_info")}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Line */}
        {step === "line" && (
          <div>
            <p className="text-sm mb-4" style={{ color: "var(--color-anu-muted)" }}>
              {t("repass.select_line")}
              {activeLines.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs"
                      style={{ background: "rgba(255,71,87,0.15)", color: "var(--color-anu-danger)" }}>
                  {activeLines.length} {t("repass.line_count")}
                </span>
              )}
            </p>
            {activeLines.length === 0
              ? <p className="mb-4" style={{ color: "var(--color-anu-success)" }}>{t("repass.no_pending_system")}</p>
              : <div className="grid grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                  {activeLines.map(l => (
                    <button key={l} onClick={() => {
                      setSelLine(l); setIsOther(false);
                      loadActiveBatches(l);
                      setStep("batch");
                    }}
                      className="py-4 rounded-xl border text-sm font-semibold transition hover:scale-105"
                      style={{ ...cardStyle, borderColor: "rgba(255,71,87,0.4)" }}>
                      <p style={{ color: "var(--color-anu-text)" }}>{l}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-anu-danger)" }}>Pending</p>
                    </button>
                  ))}
                </div>
            }
            <button onClick={() => {
              setIsOther(true);
              setOtherBatch("");
              setOtherBoxNum("");
              setStep("record");
              resetRecordForm();
            }}
              className="px-5 py-3 rounded-xl border text-sm font-medium transition hover:scale-105"
              style={{ ...cardStyle, borderColor: "var(--color-anu-glow)" }}>
              <span style={{ color: "var(--color-anu-glow)" }}>{t("repass.other_specify")}</span>
            </button>
          </div>
        )}

        {/* STEP 2: Batch */}
        {step === "batch" && (
          <div>
            <p className="text-sm mb-4" style={{ color: "var(--color-anu-muted)" }}>
              {t("repass.choose_batch")}
            </p>
            {activeBatches.length === 0
              ? <p style={{ color: "var(--color-anu-danger)" }}>
                  {t("repass.no_pending_line", { line: selLine })}
                </p>
              : <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {activeBatches.map(b => (
                    <button key={b} onClick={() => { setSelBatch(b); loadNonAfBoxes(b); setStep("box"); }}
                      className="py-4 px-4 rounded-xl border text-sm font-semibold transition hover:scale-105"
                      style={cardStyle}>
                      <span style={{ color: "var(--color-anu-text)" }}>{b}</span>
                    </button>
                  ))}
                </div>
            }
          </div>
        )}

        {/* STEP 3: เลือกกล่อง */}
        {step === "box" && (
          <div>
            <p className="text-sm mb-4" style={{ color: "var(--color-anu-muted)" }}>
              {t("repass.select_box")}
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs"
                    style={{ background: "rgba(255,71,87,0.15)", color: "var(--color-anu-danger)" }}>
                {nonAfBoxes.length} {t("repass.box_count")}
              </span>
            </p>
            {nonAfBoxes.length === 0
              ? <p style={{ color: "var(--color-anu-success)" }}>{t("repass.no_pending_boxes")}</p>
              : <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {nonAfBoxes.map(b => (
                    <button key={b.id} onClick={() => {
                      setSelBox(b);
                      resetRecordForm();
                      setStep("record");
                    }}
                      className="rounded-xl border p-4 text-left transition hover:scale-105"
                      style={{ ...cardStyle, borderColor: `${STATUS_COLORS[b.status] || "var(--color-anu-border)"}60` }}>
                      <p className="text-xl font-black mb-1" style={{ color: "var(--color-anu-text)" }}>#{b.box_number}</p>
                      <p className="text-xs font-bold" style={{ color: STATUS_COLORS[b.status] }}>{b.status}</p>
                      {b.defects && <p className="text-xs mt-1 truncate" style={{ color: "var(--color-anu-muted)" }}>{b.defects}</p>}
                    </button>
                  ))}
                </div>
            }
          </div>
        )}

        {/* STEP 4: บันทึก */}
        {step === "record" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Left */}
            <div className="flex flex-col gap-4">

              <div className="rounded-xl border p-4" style={cardStyle}>
                <p className="text-xs mb-3 uppercase tracking-wider font-medium" style={{ color: "var(--color-anu-muted)" }}>
                  {isOther ? t("repass.specify_yourself") : t("repass.previous_info")}
                </p>
                {isOther ? (
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>{t("repass.line")}</p>
                      <select
                        value={otherLine}
                        onChange={e => setOtherLine(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                        style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                      >
                        {PRODUCTION_LINES.map(l => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>{t("repass.batch")}</p>
                      <input
                        value={otherBatch}
                        onChange={e => setOtherBatch(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                        style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                      />
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>{t("repass.box_number")}</p>
                      <input
                        type="number" min="1"
                        value={otherBoxNum}
                        onChange={e => setOtherBoxNum(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                        style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <p className="text-4xl font-black" style={{ color: "var(--color-anu-accent)" }}>#{selBox?.box_number}</p>
                    <div>
                      <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>{t("repass.previous_status")}</p>
                      <span className="px-3 py-1.5 rounded-lg text-sm font-bold"
                            style={{ background: `${STATUS_COLORS[selBox?.status]}20`, color: STATUS_COLORS[selBox?.status] }}>
                        {selBox?.status}
                      </span>
                      {selBox?.defects && (
                        <p className="text-xs mt-2" style={{ color: "var(--color-anu-muted)" }}>
                          {t("repass.defect_label")}: {selBox.defects}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* เวลา */}
              <div className="rounded-xl border p-4" style={cardStyle}>
                <p className="text-xs mb-3 uppercase tracking-wider font-medium" style={{ color: "var(--color-anu-muted)" }}>
                  {t("repass.type_and_time")}
                </p>
                <div className="flex gap-2 mb-4">
                  {["Online", "Offline"].map(m => (
                    <button key={m} onClick={() => setMode(m as any)}
                      className="flex-1 py-2 rounded-lg text-sm font-medium border-2 transition"
                      style={{
                        borderColor: mode === m ? "var(--color-anu-accent)" : "transparent",
                        background: mode === m ? "rgba(124,92,255,0.15)" : "var(--color-anu-elevated)",
                        color: mode === m ? "var(--color-anu-glow)" : "var(--color-anu-muted)",
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>{t("repass.start_date")}</p>
                    <input
                      type="date" value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                    />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>{t("repass.start_time")}</p>
                    <select
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                    >
                      {timeOptions.map(tm => <option key={tm}>{tm}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>{t("repass.complete_date")}</p>
                    <input
                      type="date" value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                    />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>{t("repass.complete_time")}</p>
                    <select
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                      style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                    >
                      <option value="">{t("repass.not_specified")}</option>
                      {timeOptions.map(tm => <option key={tm}>{tm}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border p-4" style={cardStyle}>
                <p className="text-xs mb-3 uppercase tracking-wider font-medium" style={{ color: "var(--color-anu-muted)" }}>
                  {t("repass.result_after")}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {BOX_STATUS.map(s => (
                    <button key={s} onClick={() => { setResultStatus(s); setNewDefects([]); }}
                      className="py-2.5 rounded-lg text-sm font-bold border-2 transition"
                      style={{
                        borderColor: resultStatus === s ? STATUS_COLORS[s] : "transparent",
                        background: resultStatus === s ? `${STATUS_COLORS[s]}20` : "var(--color-anu-elevated)",
                        color: resultStatus === s ? STATUS_COLORS[s] : "var(--color-anu-muted)",
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {needDefect && (
                <div className="rounded-xl border p-4" style={cardStyle}>
                  <p className="text-xs mb-3" style={{ color: "var(--color-anu-danger)" }}>
                    {t("repass.specify_defects")}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {DEFECT_LIST.map(d => (
                      <button key={d}
                        onClick={() => setNewDefects(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border transition"
                        style={{
                          background: newDefects.includes(d) ? "rgba(255,71,87,0.2)" : "var(--color-anu-elevated)",
                          borderColor: newDefects.includes(d) ? "var(--color-anu-danger)" : "var(--color-anu-border)",
                          color: newDefects.includes(d) ? "var(--color-anu-danger)" : "var(--color-anu-muted)",
                        }}>
                        {d}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    rows={2}
                    placeholder={t("repass.additional_notes")}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
                    style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-auto">
                <button onClick={handleSave} disabled={saving}
                  className="py-3 rounded-xl text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--color-anu-accent)", color: "#fff" }}>
                  {saving ? t("repass.saving") : t("repass.save")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}