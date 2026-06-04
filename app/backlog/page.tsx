"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const LINES = Array.from({ length: 13 }, (_, i) => `H5${String(i + 1).padStart(2, "0")}`);

export default function BacklogPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<"line" | "batch" | "record">("line");
  const [selLine, setSelLine] = useState("");
  const [selBatch, setSelBatch] = useState("");
  const [batches, setBatches] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState("");

  const [curAts, setCurAts] = useState(0);
  const [curPrint, setCurPrint] = useState(0);
  const [curCam, setCurCam] = useState(0);

  // เปลี่ยนเป็น string เพื่อให้ช่องว่างได้
  const [addAts, setAddAts] = useState("");
  const [clearAts, setClearAts] = useState("");
  const [addPrint, setAddPrint] = useState("");
  const [clearPrint, setClearPrint] = useState("");
  const [addCam, setAddCam] = useState("");
  const [clearCam, setClearCam] = useState("");

  const finalAts   = curAts   + (parseInt(addAts)   || 0) - (parseInt(clearAts)   || 0);
  const finalPrint = curPrint + (parseInt(addPrint)  || 0) - (parseInt(clearPrint) || 0);
  const finalCam   = curCam   + (parseInt(addCam)    || 0) - (parseInt(clearCam)   || 0);
  const hasError   = finalAts < 0 || finalPrint < 0 || finalCam < 0;

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

  async function loadCurrent(line: string, batch: string) {
    const { data } = await supabase
      .from("backlog")
      .select("ats_box, print_box, cam_box")
      .eq("line", line)
      .eq("batch", batch)
      .order("time_stamp", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setCurAts(data[0].ats_box || 0);
      setCurPrint(data[0].print_box || 0);
      setCurCam(data[0].cam_box || 0);
    } else {
      setCurAts(0); setCurPrint(0); setCurCam(0);
    }
  }

  function selectLine(line: string) {
    setSelLine(line);
    loadBatches(line);
    setStep("batch");
  }

  function selectBatch(batch: string) {
    setSelBatch(batch);
    setAddAts(""); setClearAts("");
    setAddPrint(""); setClearPrint("");
    setAddCam(""); setClearCam("");
    setLastSaved("");
    loadCurrent(selLine, batch);
    setStep("record");
  }

  async function handleSave() {
    if (hasError) return;
    setSaving(true);
    await supabase.from("backlog").insert([{
      time_stamp: new Date().toISOString(),
      line: selLine,
      batch: selBatch,
      ats_box:   finalAts,
      print_box: finalPrint,
      cam_box:   finalCam,
      record_by: user?.fullname,
    }]);
    setLastSaved(`✅ บันทึกสำเร็จ — ATS: ${finalAts} | Print: ${finalPrint} | Cam: ${finalCam} box`);
    setCurAts(finalAts); setCurPrint(finalPrint); setCurCam(finalCam);
    setAddAts(""); setClearAts("");
    setAddPrint(""); setClearPrint("");
    setAddCam(""); setClearCam("");
    setSaving(false);
  }

  const cardStyle = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };
  const STATIONS = [
    { label: "ATS",      color: "#7c5cff", cur: curAts,   add: addAts,   setAdd: setAddAts,   clear: clearAts,   setClear: setClearAts,   final: finalAts   },
    { label: "Printing", color: "#f97316", cur: curPrint, add: addPrint, setAdd: setAddPrint, clear: clearPrint, setClear: setClearPrint, final: finalPrint },
    { label: "Camera",   color: "#00d4aa", cur: curCam,   add: addCam,   setAdd: setAddCam,   clear: clearCam,   setClear: setClearCam,   final: finalCam   },
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
            ← {step === "line" ? "หลัก" : step === "batch" ? "เปลี่ยน Line" : "เปลี่ยน Batch"}
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-anu-text)" }}>⏳ Backlog</h1>
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
            <p className="text-sm mb-4" style={{ color: "var(--color-anu-muted)" }}>เลือก Line</p>
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
            <p className="text-sm mb-4" style={{ color: "var(--color-anu-muted)" }}>เลือก Batch</p>
            {batches.length === 0
              ? <p style={{ color: "var(--color-anu-danger)" }}>⚠️ ไม่พบ Batch ที่กำลัง Running ใน {selLine}</p>
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

            {/* Current summary */}
            <div className="rounded-xl border p-4" style={cardStyle}>
              <p className="text-xs mb-3 font-medium uppercase tracking-wider"
                 style={{ color: "var(--color-anu-muted)" }}>
                ยอดค้างปัจจุบัน
              </p>
              <div className="grid grid-cols-3 gap-3">
                {STATIONS.map(s => (
                  <div key={s.label} className="text-center rounded-lg p-3"
                       style={{ background: "var(--color-anu-elevated)" }}>
                    <p className="text-xs mb-1" style={{ color: s.color }}>{s.label}</p>
                    <p className="text-2xl font-black" style={{ color: "var(--color-anu-text)" }}>
                      {s.cur}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-anu-muted)" }}>box</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Station inputs */}
            {STATIONS.map(s => (
              <div key={s.label} className="rounded-xl border p-4" style={cardStyle}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <p className="text-sm font-medium" style={{ color: "var(--color-anu-text)" }}>
                    {s.label}
                  </p>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: s.final < 0 ? "rgba(255,71,87,0.15)" : "rgba(0,212,170,0.1)",
                          color: s.final < 0 ? "var(--color-anu-danger)" : "var(--color-anu-success)",
                        }}>
                    ผลลัพธ์: {s.final} box
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>📥 พบค้างเพิ่ม</p>
                    <input
                      type="number"
                      min="0"
                      value={s.add}
                      placeholder="0"
                      onChange={e => s.setAdd(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none text-right"
                      style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                    />
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>📤 เคลียร์สำเร็จ</p>
                    <input
                      type="number"
                      min="0"
                      value={s.clear}
                      placeholder="0"
                      onChange={e => s.setClear(e.target.value)}
                      className="w-full rounded-lg border px-3 py-2 text-sm outline-none text-right"
                      style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="rounded-xl border p-4 flex justify-between items-center"
                 style={{ ...cardStyle, borderColor: hasError ? "rgba(255,71,87,0.4)" : "var(--color-anu-border)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--color-anu-muted)" }}>รวม Backlog</span>
              <span className="text-2xl font-black"
                    style={{ color: hasError ? "var(--color-anu-danger)" : "var(--color-anu-text)" }}>
                {hasError ? "❌ ค่าติดลบ" : `${finalAts + finalPrint + finalCam} box`}
              </span>
            </div>

            {lastSaved && (
              <p className="text-sm text-center" style={{ color: "var(--color-anu-success)" }}>{lastSaved}</p>
            )}

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleSave} disabled={saving || hasError}
                className="py-3 rounded-xl text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
                style={{ background: "var(--color-anu-accent)", color: "#fff" }}>
                {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}