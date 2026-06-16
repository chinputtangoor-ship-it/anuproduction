"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/context";

const LINES = Array.from({ length: 13 }, (_, i) => `H5${String(i + 1).padStart(2, "0")}`);
const BOX_STATUS = ["AF", "HP", "HUP", "Sort", "PS", "Scrap", "HFX"];
const DEFECT_LIST = ["Bubble", "Mashed", "Dent cap", "Dent body", "Loose", "Rough edge", "Ink speck", "Soiled", "Dirty", "Skewing", "Machine breakdown"];

export default function RecordPage() {
  const router  = useRouter();
  const { t }   = useI18n();
  const [user, setUser]             = useState<any>(null);
  const [step, setStep]             = useState<"line" | "batch" | "record">("line");
  const [selLine, setSelLine]       = useState("");
  const [selBatch, setSelBatch]     = useState("");
  const [batches, setBatches]       = useState<any[]>([]);
  const [nextBox, setNextBox]       = useState(1);
  const [status, setStatus]         = useState("AF");
  const [defects, setDefects]       = useState<string[]>([]);
  const [netWeight, setNetWeight]   = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [checkBy, setCheckBy]       = useState("");
  const [saving, setSaving]         = useState(false);
  const [lastSaved, setLastSaved]   = useState("");

  const needDefect = !["AF", "HP", "HUP"].includes(status);
  const cardStyle  = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };
  const STATUS_COLORS: Record<string, string> = {
    AF: "var(--color-anu-success)", Sort: "var(--color-anu-warning)",
    PS: "#f97316", HP: "#3b82f6", HUP: "#6366f1",
    HFX: "#a855f7", Scrap: "var(--color-anu-danger)",
  };

  useEffect(() => {
    const stored = localStorage.getItem("anu_user");
    if (!stored) { router.push("/login"); return; }
    setUser(JSON.parse(stored));
  }, []);

  async function loadBatches(line: string) {
    const { data } = await supabase
      .from("production_plan").select("batch")
      .eq("line", line).neq("batch_status", "Finished");
    setBatches(data || []);
  }

  async function loadNextBox(batch: string) {
    const { data } = await supabase
      .from("boxes").select("box_number")
      .eq("batch", batch).order("box_number", { ascending: false }).limit(1);
    setNextBox(data && data.length > 0 ? data[0].box_number + 1 : 1);
  }

  async function handleSave() {
    if (needDefect && defects.length === 0) {
      alert(t("record.alert_no_defect"));
      return;
    }
    if (!netWeight || parseFloat(netWeight) <= 0) {
      alert(t("record.alert_no_net_weight"));
      return;
    }
    if (!totalWeight || parseFloat(totalWeight) <= 0) {
      alert(t("record.alert_no_total_weight"));
      return;
    }
    if (!checkBy.trim()) {
      alert(t("record.alert_no_checker"));
      return;
    }

    setSaving(true);
    await supabase.from("boxes").insert([{
      time_stamp:      new Date().toISOString(),
      line:            selLine,
      batch:           selBatch,
      box_number:      nextBox,
      status,
      defects:         defects.join(",") || null,
      net_weight_kg:   parseFloat(netWeight),
      total_weight_kg: parseFloat(totalWeight),
      weight_by:       user?.fullname,
      check_by:        checkBy.trim(),
    }]);

    setLastSaved(t("record.saved_msg", { box: nextBox, status }));
    setNextBox(n => n + 1);
    setStatus("AF");
    setDefects([]);
    setNetWeight("");
    setTotalWeight("");
    setSaving(false);
  }

  const backLabel =
    step === "line"  ? t("common.home") :
    step === "batch" ? t("common.change_line") :
                       t("common.change_batch");

  return (
    <div className="w-full min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => {
            if (step === "record") { setStep("batch"); setSelBatch(""); }
            else if (step === "batch") { setStep("line"); setSelLine(""); }
            else router.push("/dashboard");
          }} className="text-sm px-3 py-1.5 rounded-lg border" style={cardStyle}>
            ← {backLabel}
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-anu-text)" }}>
            📦 {t("record.title")}
          </h1>
          <button onClick={() => router.push("/boxes")}
            className="ml-auto text-sm px-3 py-1.5 rounded-lg border transition hover:opacity-80"
            style={cardStyle}>
            📋 {t("common.view_info")}
          </button>
        </div>

        {/* Breadcrumb */}
        {step !== "line" && (
          <div className="flex gap-2 mb-6 text-sm">
            <span style={{ color: "var(--color-anu-glow)" }}>{selLine}</span>
            {selBatch && (
              <>
                <span style={{ color: "var(--color-anu-muted)" }}>›</span>
                <span style={{ color: "var(--color-anu-glow)" }}>{selBatch}</span>
              </>
            )}
            {step === "record" && (
              <>
                <span style={{ color: "var(--color-anu-muted)" }}>›</span>
                <span style={{ color: "var(--color-anu-text)" }}>Box #{nextBox}</span>
              </>
            )}
          </div>
        )}

        {/* STEP 1: Line */}
        {step === "line" && (
          <div>
            <p className="text-sm mb-4" style={{ color: "var(--color-anu-muted)" }}>
              {t("common.select_line")}
            </p>
            <div className="grid grid-cols-4 lg:grid-cols-6 gap-3">
              {LINES.map(l => (
                <button key={l} onClick={() => { setSelLine(l); loadBatches(l); setStep("batch"); }}
                  className="py-4 rounded-xl border text-sm font-semibold transition hover:scale-105"
                  style={cardStyle}>
                  <span style={{ color: "var(--color-anu-text)" }}>{l}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Batch */}
        {step === "batch" && (
          <div>
            <p className="text-sm mb-4" style={{ color: "var(--color-anu-muted)" }}>
              {t("common.select_batch")}
            </p>
            {batches.length === 0
              ? <p style={{ color: "var(--color-anu-danger)" }}>
                  {t("record.no_batch", { line: selLine })}
                </p>
              : <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {batches.map(b => (
                    <button key={b.batch}
                      onClick={() => {
                        setSelBatch(b.batch);
                        loadNextBox(b.batch);
                        setStep("record");
                        setStatus("AF");
                        setDefects([]);
                        setNetWeight("");
                        setTotalWeight("");
                        setCheckBy("");
                        setLastSaved("");
                      }}
                      className="py-4 px-4 rounded-xl border text-sm font-semibold transition hover:scale-105"
                      style={cardStyle}>
                      <span style={{ color: "var(--color-anu-text)" }}>{b.batch}</span>
                    </button>
                  ))}
                </div>
            }
          </div>
        )}

        {/* STEP 3: Record */}
        {step === "record" && (
          <div className="flex flex-col gap-4">

            {/* Box number */}
            <div className="rounded-xl border p-4 text-center" style={cardStyle}>
              <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                {t("record.current_box")}
              </p>
              <p className="text-5xl font-black" style={{ color: "var(--color-anu-accent)" }}>
                #{nextBox}
              </p>
            </div>

            {/* Status */}
            <div className="rounded-xl border p-4" style={cardStyle}>
              <p className="text-xs mb-3" style={{ color: "var(--color-anu-muted)" }}>
                {t("record.box_status")}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {BOX_STATUS.map(s => (
                  <button key={s} onClick={() => { setStatus(s); setDefects([]); }}
                    className="py-3 rounded-lg text-sm font-bold border-2 transition hover:scale-105"
                    style={{
                      borderColor: status === s ? STATUS_COLORS[s] : "transparent",
                      background:  status === s ? `${STATUS_COLORS[s]}20` : "var(--color-anu-elevated)",
                      color:       status === s ? STATUS_COLORS[s] : "var(--color-anu-muted)",
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Defects */}
            {needDefect && (
              <div className="rounded-xl border p-4" style={cardStyle}>
                <p className="text-xs mb-3" style={{ color: "var(--color-anu-danger)" }}>
                  {t("record.defect_required")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {DEFECT_LIST.map(d => (
                    <button key={d}
                      onClick={() => setDefects(prev =>
                        prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
                      )}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border transition"
                      style={{
                        background:  defects.includes(d) ? "rgba(255,71,87,0.2)" : "var(--color-anu-elevated)",
                        borderColor: defects.includes(d) ? "var(--color-anu-danger)" : "var(--color-anu-border)",
                        color:       defects.includes(d) ? "var(--color-anu-danger)" : "var(--color-anu-muted)",
                      }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Weight + Inspector */}
            <div className="rounded-xl border p-4" style={cardStyle}>
              <p className="text-xs mb-3 uppercase tracking-wider font-medium"
                 style={{ color: "var(--color-anu-muted)" }}>
                {t("record.weight_section")}
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                    {t("record.net_weight")}
                  </p>
                  <input
                    type="number" step="0.001" min="0"
                    value={netWeight} onChange={e => setNetWeight(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none text-right"
                    style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                  />
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                    {t("record.total_weight")}
                  </p>
                  <input
                    type="number" step="0.001" min="0"
                    value={totalWeight} onChange={e => setTotalWeight(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none text-right"
                    style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                    {t("record.weigh_by")}
                  </p>
                  <div className="rounded-lg border px-3 py-2.5 text-sm"
                       style={{ background: "var(--color-anu-void)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-muted)" }}>
                    {user?.fullname || "-"}
                  </div>
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                    {t("record.check_by")}
                  </p>
                  <input
                    type="text" value={checkBy}
                    onChange={e => setCheckBy(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                    style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                  />
                </div>
              </div>
            </div>

            {lastSaved && (
              <p className="text-sm text-center" style={{ color: "var(--color-anu-success)" }}>
                {lastSaved}
              </p>
            )}

            <button onClick={handleSave} disabled={saving}
              className="py-4 rounded-xl text-base font-bold transition hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--color-anu-accent)", color: "#fff" }}>
              {saving ? t("common.saving") : `💾 ${t("record.save_box")} #${nextBox}`}
            </button>

          </div>
        )}
      </div>
    </div>
  );
}