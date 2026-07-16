"use client";

import { useCallback, useState } from "react";
import { ProductionFlowShell } from "@/components/ProductionFlowShell";
import { withRecordedBy } from "@/lib/audit/stamp";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/context";

export default function RejectionPage() {
  const { t } = useI18n();
  const { user, loading } = useRequireAuth();

  const [atsKg, setAtsKg] = useState("");
  const [printKg, setPrintKg] = useState("");
  const [camKg, setCamKg] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState("");

  const cardStyle = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };
  const total = (parseFloat(atsKg) || 0) + (parseFloat(printKg) || 0) + (parseFloat(camKg) || 0);

  const resetForm = useCallback(() => {
    setAtsKg("");
    setPrintKg("");
    setCamKg("");
    setLastSaved("");
  }, []);

  async function handleSave(line: string, batch: string) {
    if (!user?.id) return;
    setSaving(true);
    const atsVal = parseFloat(atsKg) || 0;
    const printVal = parseFloat(printKg) || 0;
    const camVal = parseFloat(camKg) || 0;

    const { error } = await supabase.from("rejection").insert([
      withRecordedBy(
        {
          line,
          batch,
          ats_kg: atsVal,
          print_kg: printVal,
          cam_kg: camVal,
          check_by: user.id,
        },
        user.id,
      ),
    ]);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setLastSaved(t("rejection.saved_msg", { ats: atsVal, print: printVal, cam: camVal }));
    setAtsKg("");
    setPrintKg("");
    setCamKg("");
    setSaving(false);
  }

  const STATIONS = [
    { labelKey: "rejection.ats", value: atsKg, set: setAtsKg, color: "#7c5cff" },
    { labelKey: "rejection.printing", value: printKg, set: setPrintKg, color: "#f97316" },
    { labelKey: "rejection.camera", value: camKg, set: setCamKg, color: "#00d4aa" },
  ];

  if (loading || !user) return null;

  return (
    <ProductionFlowShell
      title={t("rejection.title")}
      titleIcon="ban"
      noBatchKey="rejection.no_batch"
      onBatchReady={resetForm}
    >
      {({ line, batch }) => (
        <div className="flex flex-col gap-4">
          {STATIONS.map((station) => (
            <div key={station.labelKey} className="rounded-xl border p-4" style={cardStyle}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: station.color }} />
                <p className="text-sm font-medium" style={{ color: "var(--color-anu-text)" }}>
                  {t(station.labelKey)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={station.value}
                  placeholder="0.000"
                  onChange={(e) => station.set(e.target.value)}
                  className="flex-1 rounded-lg border px-3 py-2.5 text-lg font-bold outline-none text-right"
                  style={{
                    background: "var(--color-anu-elevated)",
                    borderColor: "var(--color-anu-border)",
                    color: "var(--color-anu-text)",
                  }}
                />
                <span className="text-sm" style={{ color: "var(--color-anu-muted)" }}>kg</span>
              </div>
            </div>
          ))}

          <div
            className="rounded-xl border p-4 flex justify-between items-center"
            style={{
              ...cardStyle,
              borderColor: total > 0 ? "rgba(255,71,87,0.4)" : "var(--color-anu-border)",
            }}
          >
            <span className="text-sm font-medium" style={{ color: "var(--color-anu-muted)" }}>
              {t("rejection.total")}
            </span>
            <span
              className="text-2xl font-black"
              style={{ color: total > 0 ? "var(--color-anu-danger)" : "var(--color-anu-muted)" }}
            >
              {total.toFixed(3)} kg
            </span>
          </div>

          {lastSaved && (
            <p className="text-sm text-center" style={{ color: "var(--color-anu-success)" }}>
              {lastSaved}
            </p>
          )}

          <button
            onClick={() => handleSave(line, batch)}
            disabled={saving}
            className="py-3 rounded-xl text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--color-anu-accent)", color: "#fff" }}
          >
            {saving ? t("common.saving") : t("rejection.save")}
          </button>
        </div>
      )}
    </ProductionFlowShell>
  );
}
