"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function BoxesPage() {
  const router = useRouter();
  const [searchBatch, setSearchBatch] = useState("");
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [editBox, setEditBox] = useState<any>(null);
  const [netWeight, setNetWeight] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const cardStyle = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };
  const STATUS_COLORS: Record<string, string> = {
    AF: "var(--color-anu-success)", Sort: "var(--color-anu-warning)",
    PS: "#f97316", HP: "#3b82f6", HUP: "#6366f1",
    HFX: "#a855f7", Scrap: "var(--color-anu-danger)"
  };

  useEffect(() => {
    const stored = localStorage.getItem("anu_user");
    if (!stored) { router.push("/login"); return; }
  }, []);

  async function handleSearch() {
    if (!searchBatch.trim()) return;
    setLoading(true);
    setSearched(true);
    const { data } = await supabase
      .from("boxes")
      .select("*")
      .eq("batch", searchBatch.trim())
      .order("box_number");
    setBoxes(data || []);
    setLoading(false);
  }

  async function handleSaveWeight() {
    if (!editBox) return;
    setSaving(true);
    await supabase.from("boxes").update({
      net_weight_kg:   netWeight !== "" ? parseFloat(netWeight) : null,
      total_weight_kg: totalWeight !== "" ? parseFloat(totalWeight) : null,
    }).eq("id", editBox.id);

    setBoxes(prev => prev.map(b => b.id === editBox.id
      ? {
          ...b,
          net_weight_kg:   netWeight !== "" ? parseFloat(netWeight) : null,
          total_weight_kg: totalWeight !== "" ? parseFloat(totalWeight) : null,
        }
      : b
    ));
    setSaveMsg("✅ บันทึกน้ำหนักสำเร็จ");
    setSaving(false);
    setTimeout(() => { setSaveMsg(""); setEditBox(null); }, 1500);
  }

  const afCount = boxes.filter(b => b.status === "AF").length;
  const total = boxes.length;
  const afRate = total > 0 ? ((afCount / total) * 100).toFixed(1) : "0";

  return (
    <div className="w-full min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => editBox ? setEditBox(null) : router.push("/record")}
            className="text-sm px-3 py-1.5 rounded-lg border" style={cardStyle}>
            ← {editBox ? "กลับตาราง" : "Box Status"}
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-anu-text)" }}>
            {editBox ? `แก้น้ำหนัก กล่อง #${editBox.box_number}` : "📋 ดูข้อมูลกล่อง"}
          </h1>
        </div>

        {/* Edit weight view */}
        {editBox ? (
          <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
            <div className="rounded-xl border p-6 flex flex-col gap-4" style={cardStyle}>

              {/* Info */}
              <div className="rounded-lg p-3" style={{ background: "var(--color-anu-elevated)" }}>
                <div className="flex items-center gap-4">
                  <p className="text-4xl font-black" style={{ color: "var(--color-anu-accent)" }}>#{editBox.box_number}</p>
                  <div>
                    <p className="text-xs" style={{ color: "var(--color-anu-muted)" }}>Batch: {editBox.batch}</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${STATUS_COLORS[editBox.status]}20`, color: STATUS_COLORS[editBox.status] }}>
                      {editBox.status}
                    </span>
                    {editBox.defects && <p className="text-xs mt-1" style={{ color: "var(--color-anu-muted)" }}>Defect: {editBox.defects}</p>}
                  </div>
                </div>
              </div>

              {/* Weight inputs */}
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>Net Weight (kg)</p>
                <input
                  type="number"
                  step="0.001"
                  value={netWeight}
                  placeholder="กรอกน้ำหนักสุทธิ"
                  onChange={e => setNetWeight(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-lg font-bold outline-none text-right"
                  style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                />
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>Total Weight (kg)</p>
                <input
                  type="number"
                  step="0.001"
                  value={totalWeight}
                  placeholder="กรอกน้ำหนักรวม"
                  onChange={e => setTotalWeight(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-lg font-bold outline-none text-right"
                  style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
                />
              </div>

              {saveMsg && <p className="text-sm text-center" style={{ color: "var(--color-anu-success)" }}>{saveMsg}</p>}

              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleSaveWeight} disabled={saving}
                  className="py-3 rounded-xl text-sm font-bold disabled:opacity-50"
                  style={{ background: "var(--color-anu-accent)", color: "#fff" }}>
                  {saving ? "กำลังบันทึก..." : "💾 บันทึกน้ำหนัก"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="flex gap-3 mb-6">
              <input
                value={searchBatch}
                onChange={e => setSearchBatch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                placeholder="พิมพ์ Batch เช่น H503260522"
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm outline-none"
                style={{ background: "var(--color-anu-elevated)", borderColor: "var(--color-anu-border)", color: "var(--color-anu-text)" }}
              />
              <button onClick={handleSearch}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: "var(--color-anu-accent)", color: "#fff" }}>
                🔍 ค้นหา
              </button>
            </div>

            {/* Summary */}
            {searched && !loading && boxes.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: "กล่องทั้งหมด", value: total, color: "var(--color-anu-text)" },
                  { label: "AF", value: afCount, color: "var(--color-anu-success)" },
                  { label: "AF Rate", value: `${afRate}%`, color: parseFloat(afRate) >= 90 ? "var(--color-anu-success)" : "var(--color-anu-warning)" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl border p-4 text-center" style={cardStyle}>
                    <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>{s.label}</p>
                    <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Table */}
            {loading && <p style={{ color: "var(--color-anu-muted)" }}>กำลังค้นหา...</p>}
            {searched && !loading && boxes.length === 0 && (
              <p style={{ color: "var(--color-anu-danger)" }}>⚠️ ไม่พบ Batch "{searchBatch}"</p>
            )}
            {boxes.length > 0 && (
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-anu-border)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--color-anu-elevated)" }}>
                      {["กล่อง", "เวลา", "Status", "Defects", "Net (kg)", "Total (kg)", "ชั่งโดย", "ตรวจโดย", ""].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-medium whitespace-nowrap"
                            style={{ color: "var(--color-anu-muted)", borderBottom: "1px solid var(--color-anu-border)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boxes.map((b, i) => (
                      <tr key={b.id} style={{ background: i % 2 === 0 ? "var(--color-anu-surface)" : "var(--color-anu-void)", borderTop: "1px solid var(--color-anu-border)" }}>
                        <td className="px-4 py-3 font-black text-lg" style={{ color: "var(--color-anu-accent)" }}>#{b.box_number}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "var(--color-anu-muted)" }}>
                          {b.time_stamp?.slice(0, 16).replace("T", " ")}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 rounded-full text-xs font-bold"
                                style={{ background: `${STATUS_COLORS[b.status] || "#64748b"}20`, color: STATUS_COLORS[b.status] || "var(--color-anu-muted)" }}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--color-anu-muted)" }}>{b.defects || "-"}</td>
                        <td className="px-4 py-3 font-medium" style={{ color: b.net_weight_kg ? "var(--color-anu-text)" : "var(--color-anu-muted)" }}>
                          {b.net_weight_kg ?? "-"}
                        </td>
                        <td className="px-4 py-3 font-medium" style={{ color: b.total_weight_kg ? "var(--color-anu-text)" : "var(--color-anu-muted)" }}>
                          {b.total_weight_kg ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--color-anu-muted)" }}>{b.weight_by || "-"}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--color-anu-muted)" }}>{b.check_by || "-"}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => {
                            setEditBox(b);
                            setNetWeight(b.net_weight_kg?.toString() ?? "");
                            setTotalWeight(b.total_weight_kg?.toString() ?? "");
                            setSaveMsg("");
                          }}
                            className="px-3 py-1.5 rounded-lg text-xs border transition hover:opacity-80"
                            style={{ borderColor: "var(--color-anu-glow)", color: "var(--color-anu-glow)" }}>
                            ✏️ แก้น้ำหนัก
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}