"use client";

import { useCallback, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { ProductionFlowShell } from "@/components/ProductionFlowShell";
import { STATUS_COLORS } from "@/lib/constants/production";
import {
  fetchPendingWeighBoxes,
  fetchProfileNames,
  type GradedBox,
} from "@/lib/data/boxes";
import { useMenuAccess } from "@/lib/auth/AccessProvider";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/context";
import { FormSkeleton } from "@/components/ui/Skeleton";

export default function RecordPage() {
  const { t } = useI18n();
  const { user, loading } = useRequireAuth();
  const { canEdit } = useMenuAccess("box_status");

  const [pending, setPending] = useState<GradedBox[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [netWeight, setNetWeight] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState("");
  const [loadingBoxes, setLoadingBoxes] = useState(false);

  const cardStyle = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };
  const selected = pending.find((b) => b.id === selectedId) ?? null;

  const loadPending = useCallback(async (batch: string) => {
    setLoadingBoxes(true);
    try {
      const rows = await fetchPendingWeighBoxes(batch);
      setPending(rows);
      setSelectedId(rows[0]?.id ?? null);
      setNetWeight("");
      setTotalWeight("");
      const ids = rows.map((r) => r.check_by).filter(Boolean) as string[];
      setNames(await fetchProfileNames(ids));
    } catch {
      setPending([]);
      setSelectedId(null);
    } finally {
      setLoadingBoxes(false);
    }
  }, []);

  const handleBatchReady = useCallback(
    (_line: string, batch: string) => {
      setLastSaved("");
      loadPending(batch);
    },
    [loadPending],
  );

  async function handleSave(batch: string) {
    if (!canEdit) {
      alert(t("access.read_only"));
      return;
    }
    if (!selected) {
      alert(t("record.alert_no_box"));
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
    if (!user?.id) {
      alert(t("common.error"));
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("boxes")
      .update({
        net_weight_kg: parseFloat(netWeight),
        total_weight_kg: parseFloat(totalWeight),
        weight_by: user.id,
      })
      .eq("id", selected.id);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setLastSaved(
      t("record.saved_msg", { box: selected.box_number, status: selected.status }),
    );
    setNetWeight("");
    setTotalWeight("");
    await loadPending(batch);
    setSaving(false);
  }

  if (loading || !user) return <FormSkeleton />;

  return (
    <ProductionFlowShell
      title={t("record.title")}
      titleIcon="package"
      noBatchKey="record.no_batch"
      lineCols={6}
      batchCols={4}
      onBatchReady={handleBatchReady}
    >
      {({ batch }) => (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border p-4" style={cardStyle}>
            <p className="text-xs mb-3 uppercase tracking-wider font-medium" style={{ color: "var(--color-anu-muted)" }}>
              {t("record.pending_queue")}
            </p>
            {loadingBoxes ? (
              <p className="text-sm" style={{ color: "var(--color-anu-muted)" }}>{t("common.loading")}</p>
            ) : pending.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-anu-muted)" }}>
                {t("record.no_pending_grade")}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {pending.map((box) => {
                  const active = box.id === selectedId;
                  const color = STATUS_COLORS[box.status] ?? "var(--color-anu-muted)";
                  return (
                    <button
                      key={box.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(box.id);
                        setNetWeight("");
                        setTotalWeight("");
                      }}
                      className="rounded-lg border px-3 py-3 text-left transition"
                      style={{
                        borderColor: active ? color : "var(--color-anu-border)",
                        background: active ? `${color}18` : "var(--color-anu-elevated)",
                      }}
                    >
                      <p className="text-lg font-bold" style={{ color: "var(--color-anu-text)" }}>
                        #{box.box_number}
                      </p>
                      <p className="text-xs font-semibold mt-1" style={{ color }}>
                        {box.status}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selected && (
            <>
              <div className="rounded-xl border p-4" style={cardStyle}>
                <p className="text-xs mb-3 uppercase tracking-wider font-medium" style={{ color: "var(--color-anu-muted)" }}>
                  {t("record.from_qc")}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span
                    className="px-3 py-1.5 rounded-full text-sm font-bold"
                    style={{
                      background: `${STATUS_COLORS[selected.status] ?? "#64748b"}22`,
                      color: STATUS_COLORS[selected.status] ?? "var(--color-anu-muted)",
                    }}
                  >
                    {selected.status}
                  </span>
                  {(selected.defects ? selected.defects.split(",").filter(Boolean) : []).map((d) => (
                    <span
                      key={d}
                      className="px-3 py-1.5 rounded-full text-xs border"
                      style={{
                        borderColor: "var(--color-anu-danger)",
                        color: "var(--color-anu-danger)",
                        background: "rgba(255,71,87,0.1)",
                      }}
                    >
                      {d}
                    </span>
                  ))}
                  {!selected.defects && (
                    <span className="text-xs" style={{ color: "var(--color-anu-muted)" }}>
                      {t("record.no_defect")}
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: "var(--color-anu-muted)" }}>
                  {t("record.check_by")}:{" "}
                  <span style={{ color: "var(--color-anu-text)" }}>
                    {(selected.check_by && names[selected.check_by]) || selected.check_by || "-"}
                  </span>
                </p>
              </div>

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
              </div>

              {lastSaved && (
                <p className="text-sm text-center" style={{ color: "var(--color-anu-success)" }}>
                  {lastSaved}
                </p>
              )}

              <button
                type="button"
                onClick={() => handleSave(batch)}
                disabled={saving || !canEdit}
                className="py-4 rounded-xl text-base font-bold transition hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                style={{ background: "var(--color-anu-accent)", color: "#fff" }}
              >
                {saving ? (
                  t("common.saving")
                ) : (
                  <>
                    <AppIcon name="save" size={18} />
                    {t("record.save_box")} #{selected.box_number}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </ProductionFlowShell>
  );
}
