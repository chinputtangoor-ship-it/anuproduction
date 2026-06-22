"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { ProductionFlowShell } from "@/components/ProductionFlowShell";
import {
  BOX_STATUS,
  DEFECT_LIST,
  STATUS_COLORS,
  STATUSES_WITHOUT_DEFECT,
} from "@/lib/constants/production";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/context";

export default function RecordPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, loading } = useRequireAuth();

  const [nextBox, setNextBox] = useState(1);
  const [status, setStatus] = useState("AF");
  const [defects, setDefects] = useState<string[]>([]);
  const [netWeight, setNetWeight] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [checkBy, setCheckBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState("");

  const needDefect = !STATUSES_WITHOUT_DEFECT.includes(status as typeof STATUSES_WITHOUT_DEFECT[number]);
  const cardStyle = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };

  const loadNextBox = useCallback(async (batch: string) => {
    const { data } = await supabase
      .from("boxes")
      .select("box_number")
      .eq("batch", batch)
      .order("box_number", { ascending: false })
      .limit(1);

    setNextBox(data && data.length > 0 ? data[0].box_number + 1 : 1);
  }, []);

  const resetForm = useCallback(() => {
    setStatus("AF");
    setDefects([]);
    setNetWeight("");
    setTotalWeight("");
    setCheckBy("");
    setLastSaved("");
  }, []);

  const handleBatchReady = useCallback(
    (_line: string, batch: string) => {
      resetForm();
      loadNextBox(batch);
    },
    [loadNextBox, resetForm],
  );

  async function handleSave(line: string, batch: string) {
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
    const { error } = await supabase.from("boxes").insert([{
      line,
      batch,
      box_number: nextBox,
      status,
      defects: defects.join(",") || null,
      net_weight_kg: parseFloat(netWeight),
      total_weight_kg: parseFloat(totalWeight),
      weight_by: user?.fullname,
      check_by: checkBy.trim(),
      recorded_by: user?.id,
    }]);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setLastSaved(t("record.saved_msg", { box: nextBox, status }));
    setNextBox((n) => n + 1);
    setStatus("AF");
    setDefects([]);
    setNetWeight("");
    setTotalWeight("");
    setSaving(false);
  }

  if (loading || !user) return null;

  return (
    <ProductionFlowShell
      title={t("record.title")}
      titleIcon="📦"
      noBatchKey="record.no_batch"
      lineCols={6}
      batchCols={4}
      onBatchReady={handleBatchReady}
      headerExtra={
        <button
          onClick={() => router.push("/boxes")}
          className="ml-auto text-sm px-3 py-1.5 rounded-lg border transition hover:opacity-80"
          style={cardStyle}
        >
          📋 {t("common.view_info")}
        </button>
      }
    >
      {({ line, batch }) => (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border p-4 text-center" style={cardStyle}>
            <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
              {t("record.current_box")}
            </p>
            <p className="text-5xl font-black" style={{ color: "var(--color-anu-accent)" }}>
              #{nextBox}
            </p>
          </div>

          <div className="rounded-xl border p-4" style={cardStyle}>
            <p className="text-xs mb-3" style={{ color: "var(--color-anu-muted)" }}>
              {t("record.box_status")}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {BOX_STATUS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatus(s);
                    setDefects([]);
                  }}
                  className="py-3 rounded-lg text-sm font-bold border-2 transition hover:scale-105"
                  style={{
                    borderColor: status === s ? STATUS_COLORS[s] : "transparent",
                    background: status === s ? `${STATUS_COLORS[s]}20` : "var(--color-anu-elevated)",
                    color: status === s ? STATUS_COLORS[s] : "var(--color-anu-muted)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {needDefect && (
            <div className="rounded-xl border p-4" style={cardStyle}>
              <p className="text-xs mb-3" style={{ color: "var(--color-anu-danger)" }}>
                {t("record.defect_required")}
              </p>
              <div className="flex flex-wrap gap-2">
                {DEFECT_LIST.map((d) => (
                  <button
                    key={d}
                    onClick={() =>
                      setDefects((prev) =>
                        prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
                      )
                    }
                    className="px-3 py-1.5 rounded-full text-xs font-medium border transition"
                    style={{
                      background: defects.includes(d) ? "rgba(255,71,87,0.2)" : "var(--color-anu-elevated)",
                      borderColor: defects.includes(d) ? "var(--color-anu-danger)" : "var(--color-anu-border)",
                      color: defects.includes(d) ? "var(--color-anu-danger)" : "var(--color-anu-muted)",
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border p-4" style={cardStyle}>
            <p
              className="text-xs mb-3 uppercase tracking-wider font-medium"
              style={{ color: "var(--color-anu-muted)" }}
            >
              {t("record.weight_section")}
            </p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                  {t("record.net_weight")}
                </p>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={netWeight}
                  onChange={(e) => setNetWeight(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none text-right"
                  style={{
                    background: "var(--color-anu-elevated)",
                    borderColor: "var(--color-anu-border)",
                    color: "var(--color-anu-text)",
                  }}
                />
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                  {t("record.total_weight")}
                </p>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={totalWeight}
                  onChange={(e) => setTotalWeight(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none text-right"
                  style={{
                    background: "var(--color-anu-elevated)",
                    borderColor: "var(--color-anu-border)",
                    color: "var(--color-anu-text)",
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                  {t("record.weigh_by")}
                </p>
                <div
                  className="rounded-lg border px-3 py-2.5 text-sm"
                  style={{
                    background: "var(--color-anu-void)",
                    borderColor: "var(--color-anu-border)",
                    color: "var(--color-anu-muted)",
                  }}
                >
                  {user.fullname || "-"}
                </div>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                  {t("record.check_by")}
                </p>
                <input
                  type="text"
                  value={checkBy}
                  onChange={(e) => setCheckBy(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                  style={{
                    background: "var(--color-anu-elevated)",
                    borderColor: "var(--color-anu-border)",
                    color: "var(--color-anu-text)",
                  }}
                />
              </div>
            </div>
          </div>

          {lastSaved && (
            <p className="text-sm text-center" style={{ color: "var(--color-anu-success)" }}>
              {lastSaved}
            </p>
          )}

          <button
            onClick={() => handleSave(line, batch)}
            disabled={saving}
            className="py-4 rounded-xl text-base font-bold transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--color-anu-accent)", color: "#fff" }}
          >
            {saving ? t("common.saving") : `💾 ${t("record.save_box")} #${nextBox}`}
          </button>
        </div>
      )}
    </ProductionFlowShell>
  );
}
