"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const LINES = Array.from({ length: 13 }, (_, i) => `H5${String(i + 1).padStart(2, "0")}`);
const DEFECT_LIST = ["Bubble", "Mashed", "Dent cap", "Dent body", "Loose", "Rough edge", "Ink speck", "Soiled", "Dirty", "Skewing", "Machine breakdown"];

export default function CameraPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<"line" | "batch" | "record">("line");
  const [selLine, setSelLine] = useState("");
  const [selBatch, setSelBatch] = useState("");
  const [batches, setBatches] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Camera 1 — ใช้ string เพื่อให้ช่องว่างได้
  const [c1Pass, setC1Pass] = useState("");
  const [c1Defs, setC1Defs] = useState<{ type: string; qty: string }[]>(
    Array(4).fill(null).map(() => ({ type: "-", qty: "" }))
  );

  // Camera 2
  const [c2Pass, setC2Pass] = useState("");
  const [c2Defs, setC2Defs] = useState<{ type: string; qty: string }[]>(
    Array(4).fill(null).map(() => ({ type: "-", qty: "" }))
  );

  const cardStyle = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };
  const inputStyle = { background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" };

  const c1PassNum = parseFloat(c1Pass) || 0;
  const c2PassNum = parseFloat(c2Pass) || 0;

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

  function buildDefectStr(defs: { type: string; qty: string }[]) {
    return defs
      .filter(d => d.type !== "-")
      .map(d => `${d.type}(${parseInt(d.qty) || 0})`)
      .join(",") || "None";
  }

  function totalQty(defs: { type: string; qty: string }[]) {
    return defs
      .filter(d => d.type !== "-")
      .reduce((s, d) => s + (parseInt(d.qty) || 0), 0);
  }

  function resetForm() {
    setC1Pass(""); setC2Pass("");
    setC1Defs(Array(4).fill(null).map(() => ({ type: "-", qty: "" })));
    setC2Defs(Array(4).fill(null).map(() => ({ type: "-", qty: "" })));
  }

  async function handleSave() {
    setSaving(true);
    await supabase.from("camera_inspection").insert([{
      time_stamp:     new Date().toISOString(),
      line:           selLine,
      batch:          selBatch,
      cam1_pass_rate: c1PassNum,
      cam1_defects:   buildDefectStr(c1Defs),
      cam1_total_qty: totalQty(c1Defs),
      cam2_pass_rate: c2PassNum,
      cam2_defects:   buildDefectStr(c2Defs),
      cam2_total_qty: totalQty(c2Defs),
      check_by:       user?.fullname,
    }]);
    setSaved(true);
    setSaving(false);
    setTimeout(() => {
      setSaved(false);
      setStep("line");
      setSelLine(""); setSelBatch("");
      resetForm();
    }, 1500);
  }

  function DefectRows({
    defs, setDefs
  }: { defs: { type: string; qty: string }[]; setDefs: (d: any) => void }) {
    return (
      <div className="flex flex-col gap-2 mt-3">
        {defs.map((d, i) => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <select
              value={d.type}
              onChange={e => {
                const n = [...defs];
                n[i] = { ...n[i], type: e.target.value };
                setDefs(n);
              }}
              className="rounded-lg border px-2 py-2 text-sm outline-none"
              style={inputStyle}
            >
              <option value="-">-</option>
              {DEFECT_LIST.map(dl => <option key={dl}>{dl}</option>)}
            </select>
            <input
              type="number"
              min="0"
              value={d.qty}
              placeholder="จำนวน (ชิ้น)"
              onChange={e => {
                const n = [...defs];
                n[i] = { ...n[i], qty: e.target.value };
                setDefs(n);
              }}
              className="rounded-lg border px-2 py-2 text-sm outline-none text-right"
              style={inputStyle}
            />
          </div>
        ))}
      </div>
    );
  }

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
          <h1 className="text-xl font-bold" style={{ color: "var(--color-anu-text)" }}>📷 Camera Analysis</h1>
        </div>

        {/* Breadcrumb */}
        {step !== "line" && (
          <div className="flex gap-2 mb-6 text-sm">
            <span style={{ color: "var(--color-anu-glow)" }}>{selLine}</span>
            {selBatch && <><span style={{ color: "var(--color-anu-muted)" }}>›</span><span style={{ color: "var(--color-anu-glow)" }}>{selBatch}</span></>}
          </div>
        )}

        {/* STEP 1: Line */}
        {step === "line" && (
          <div>
            <p className="text-sm mb-4" style={{ color: "var(--color-anu-muted)" }}>เลือก Line</p>
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
            <p className="text-sm mb-4" style={{ color: "var(--color-anu-muted)" }}>เลือก Batch ที่กำลังผลิต</p>
            {batches.length === 0
              ? <p style={{ color: "var(--color-anu-danger)" }}>⚠️ ไม่พบ Batch ที่กำลัง Running ใน {selLine}</p>
              : <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {batches.map(b => (
                    <button key={b.batch} onClick={() => { setSelBatch(b.batch); setStep("record"); }}
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
          <div className="flex flex-col gap-6">

            {/* 2 cameras side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[
                { label: "📸 Camera 1", pass: c1Pass, setPass: setC1Pass, passNum: c1PassNum, defs: c1Defs, setDefs: setC1Defs, color: "#54a0ff" },
                { label: "📸 Camera 2", pass: c2Pass, setPass: setC2Pass, passNum: c2PassNum, defs: c2Defs, setDefs: setC2Defs, color: "var(--color-anu-success)" },
              ].map(cam => (
                <div key={cam.label} className="rounded-xl border p-5" style={cardStyle}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-5 rounded-full" style={{ background: cam.color }} />
                    <p className="text-sm font-bold" style={{ color: cam.color }}>{cam.label}</p>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                      Passing Rate (%)
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={cam.pass}
                        placeholder="0.00"
                        onChange={e => cam.setPass(e.target.value)}
                        className="flex-1 rounded-lg border px-3 py-2.5 text-xl font-bold outline-none text-right"
                        style={inputStyle}
                      />
                      <span className="text-sm font-bold"
                            style={{ color: cam.passNum >= 98 ? "var(--color-anu-success)" : cam.passNum >= 95 ? "var(--color-anu-warning)" : "var(--color-anu-danger)" }}>
                        %
                      </span>
                    </div>
                    {/* Visual bar */}
                    <div className="mt-2 rounded-full overflow-hidden h-1.5" style={{ background: "var(--color-anu-elevated)" }}>
                      <div className="h-full rounded-full transition-all"
                           style={{
                             width: `${cam.passNum}%`,
                             background: cam.passNum >= 98 ? "var(--color-anu-success)" : cam.passNum >= 95 ? "var(--color-anu-warning)" : "var(--color-anu-danger)"
                           }} />
                    </div>
                  </div>

                  <p className="text-xs mb-2 font-medium" style={{ color: "var(--color-anu-muted)" }}>
                    📌 ข้อมูลของเสีย (Defects)
                  </p>
                  <div className="grid grid-cols-2 gap-1 mb-1">
                    <p className="text-xs px-2" style={{ color: "var(--color-anu-muted)" }}>ประเภท Defect</p>
                    <p className="text-xs px-2" style={{ color: "var(--color-anu-muted)" }}>จำนวน (ชิ้น)</p>
                  </div>
                  <DefectRows defs={cam.defs} setDefs={cam.setDefs} />

                  {/* Summary */}
                  <div className="mt-3 rounded-lg p-2 flex justify-between text-xs"
                       style={{ background: "var(--color-anu-elevated)" }}>
                    <span style={{ color: "var(--color-anu-muted)" }}>รวม Defect</span>
                    <span style={{ color: cam.color, fontWeight: 700 }}>
                      {cam.defs.filter(d => d.type !== "-").reduce((s, d) => s + (parseInt(d.qty) || 0), 0)} ชิ้น
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Save / Cancel */}
            {saved ? (
              <p className="text-center font-semibold" style={{ color: "var(--color-anu-success)" }}>
                🎉 บันทึกข้อมูลการวิเคราะห์จากกล้องเรียบร้อยแล้ว!
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 max-w-lg">
                <button onClick={() => { setStep("batch"); setSelBatch(""); }}
                  className="py-3 rounded-xl border text-sm font-medium" style={cardStyle}>
                  ❌ ยกเลิก/ย้อนกลับ
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="py-3 rounded-xl text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: "var(--color-anu-accent)", color: "#fff" }}>
                  {saving ? "กำลังบันทึก..." : "💾 บันทึกข้อมูล"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}