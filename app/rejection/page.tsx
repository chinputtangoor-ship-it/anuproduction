"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/context";

const LINES = Array.from({ length: 13 }, (_, i) => `H5${String(i + 1).padStart(2, "0")}`);

export default function RejectionPage() {
  const router  = useRouter();
  const { t }   = useI18n();
  const [user, setUser]         = useState<any>(null);
  const [step, setStep]         = useState<"line" | "batch" | "record">("line");
  const [selLine, setSelLine]   = useState("");
  const [selBatch, setSelBatch] = useState("");
  const [batches, setBatches]   = useState<any[]>([]);
  const [atsKg, setAtsKg]       = useState("");
  const [printKg, setPrintKg]   = useState("");
  const [camKg, setCamKg]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [lastSaved, setLastSaved] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("anu_user");
    if (!stored) { router.push("/login"); return; }
    setUser(JSON.parse(stored));
  }, []);

  async function loadBatches(line: string) {
    const { data } = await supabase
      .from("production_plan")
      .select("batch")
      .eq("line", line)
      .neq("batch_status", "Finished");
    setBatches(data || []);
  }

  function selectLine(line: string) {
    setSelLine(line);
    loadBatches(line);
    setStep("batch");
  }

  function selectBatch(batch: string) {
    setSelBatch(batch);
    setAtsKg(""); setPrintKg(""); setCamKg("");
    setLastSaved("");
    setStep("record");
  }

  async function handleSave() {
    setSaving(true);
    const atsVal   = parseFloat(atsKg)   || 0;
    const printVal = parseFloat(printKg) || 0;
    const camVal   = parseFloat(camKg)   || 0;
    await supabase.from("rejection").insert([{
      time_stamp: new Date().toISOString(),
      line:       selLine,
      batch:      selBatch,
      ats_kg:     atsVal,
      print_kg:   printVal,
      cam_kg:     camVal,
      check_by:   user?.fullname,
    }]);
    setLastSaved(t("rejection.saved_msg", { ats: atsVal, print: printVal, cam: camVal }));
    setAtsKg(""); setPrintKg(""); setCamKg("");
    setSaving(false);
  }

  const cardStyle = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };
  const total = (parseFloat(atsKg) || 0) + (parseFloat(printKg) || 0) + (parseFloat(camKg) || 0);

  const backLabel =
    step === "line"  ? t("common.home") :
    step === "batch" ? t("common.change_line") :
                       t("common.change_batch");

  const STATIONS = [
    { labelKey: "rejection.ats",      key: "ats",   value: atsKg,   set: setAtsKg,   color: "#7c5cff" },
    { labelKey: "rejection.printing", key: "print", value: printKg, set: setPrintKg, color: "#f97316" },
    { labelKey: "rejection.camera",   key: "cam",   value: camKg,   set: setCamKg,   color: "#00d4aa" },
  ];

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
            🗑️ {t("rejection.title")}
          </h1>
        </div>

        {/* Breadcrumb */}
        {step !== "line" && (
          <div className="flex gap-2 mb-6 text-sm" style={{ color: "var(--color-anu-muted)" }}>
            <span style={{ color: "var(--color-anu-glow)" }}>{selLine}</span>
            {selBatch && <><span>›</span><span style={{ color: "var(--color-anu-glow)" }}>{selBatch}</span></>}
          </div>
        )}

        {/* STEP 1: Line */}
        {step === "line" && (
          <div>
            <p className="text-sm mb-4" style={{ color: "var(--color-anu-muted)" }}>
              {t("common.select_line")}
            </p>
            <div className="grid grid-cols-4 gap-3">
              {LINES.map(l => (
                <button key={l} onClick={() => selectLine(l)}
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
                  {t("rejection.no_batch", { line: selLine })}
                </p>
              : <div className="grid grid-cols-2 gap-3">
                  {batches.map(b => (
                    <button key={b.batch} onClick={() => selectBatch(b.batch)}
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

            {STATIONS.map(s => (
              <div key={s.key} className="rounded-xl border p-4" style={cardStyle}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <p className="text-sm font-medium" style={{ color: "var(--color-anu-text)" }}>
                    {t(s.labelKey)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min="0" step="0.001"
                    value={s.value} placeholder="0.000"
                    onChange={e => s.set(e.target.value)}
                    className="flex-1 rounded-lg border px-3 py-2.5 text-lg font-bold outline-none text-right"
                    style={{
                      background:  "var(--color-anu-elevated)",
                      borderColor: "var(--color-anu-border)",
                      color:       "var(--color-anu-text)",
                    }}
                  />
                  <span className="text-sm" style={{ color: "var(--color-anu-muted)" }}>kg</span>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="rounded-xl border p-4 flex justify-between items-center"
                 style={{ ...cardStyle, borderColor: total > 0 ? "rgba(255,71,87,0.4)" : "var(--color-anu-border)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--color-anu-muted)" }}>
                {t("rejection.total")}
              </span>
              <span className="text-2xl font-black"
                    style={{ color: total > 0 ? "var(--color-anu-danger)" : "var(--color-anu-muted)" }}>
                {total.toFixed(3)} kg
              </span>
            </div>

            {lastSaved && (
              <p className="text-sm text-center" style={{ color: "var(--color-anu-success)" }}>
                {lastSaved}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleSave} disabled={saving}
                className="py-3 rounded-xl text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--color-anu-accent)", color: "#fff" }}>
                {saving ? t("common.saving") : t("rejection.save")}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}