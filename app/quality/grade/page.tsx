"use client";

import { useCallback, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { ProductionFlowShell } from "@/components/ProductionFlowShell";
import { withRecordedBy } from "@/lib/audit/stamp";
import {
  BOX_STATUS,
  DEFECT_LIST,
  STATUS_COLORS,
  statusNeedsDefect,
} from "@/lib/constants/production";
import { fetchNextBoxNumber } from "@/lib/data/boxes";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/context";

export default function BoxGradePage() {
  const { t } = useI18n();
  const { user, loading } = useRequireAuth();

  const [nextBox, setNextBox] = useState(1);
  const [status, setStatus] = useState("AF");
  const [defects, setDefects] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState("");

  const needDefect = statusNeedsDefect(status);
  const cardStyle = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };

  const resetForm = useCallback(() => {
    setStatus("AF");
    setDefects([]);
    setLastSaved("");
  }, []);

  const handleBatchReady = useCallback(
    async (_line: string, batch: string) => {
      resetForm();
      const n = await fetchNextBoxNumber(batch);
      setNextBox(n);
    },
    [resetForm],
  );

  async function handleSave(line: string, batch: string) {
    if (needDefect && defects.length === 0) {
      alert(t("grade.alert_no_defect"));
      return;
    }
    if (!user?.id) {
      alert(t("common.error"));
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("boxes").insert([
      withRecordedBy(
        {
          line,
          batch,
          box_number: nextBox,
          status,
          defects: needDefect ? defects.join(",") : null,
          net_weight_kg: null,
          total_weight_kg: null,
          weight_by: null,
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

    setLastSaved(t("grade.saved_msg", { box: nextBox, status }));
    setNextBox((n) => n + 1);
    setStatus("AF");
    setDefects([]);
    setSaving(false);
  }

  if (loading || !user) return null;

  return (
    <ProductionFlowShell
      title={t("grade.title")}
      titleIcon="badgeCheck"
      noBatchKey="grade.no_batch"
      lineCols={6}
      batchCols={4}
      onBatchReady={handleBatchReady}
    >
      {({ line, batch }) => (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border p-4 text-center" style={cardStyle}>
            <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
              {t("grade.current_box")}
            </p>
            <p className="text-5xl font-black" style={{ color: "var(--color-anu-accent)" }}>
              #{nextBox}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--color-anu-muted)" }}>
              {line} › {batch}
            </p>
          </div>

          <div className="rounded-xl border p-4" style={cardStyle}>
            <p className="text-xs mb-3" style={{ color: "var(--color-anu-muted)" }}>
              {t("grade.grade_label")}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {BOX_STATUS.map((s) => (
                <button
                  key={s}
                  type="button"
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
                {t("grade.defect_required")}
              </p>
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                {DEFECT_LIST.map((d) => (
                  <button
                    key={d}
                    type="button"
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
            <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
              {t("grade.check_by")}
            </p>
            <div
              className="rounded-lg border px-3 py-2.5 text-sm"
              style={{
                background: "var(--color-anu-void)",
                borderColor: "var(--color-anu-border)",
                color: "var(--color-anu-muted)",
              }}
            >
              {user.fullname}
            </div>
          </div>

          {lastSaved && (
            <p className="text-sm text-center" style={{ color: "var(--color-anu-success)" }}>
              {lastSaved}
            </p>
          )}

          <button
            type="button"
            onClick={() => handleSave(line, batch)}
            disabled={saving}
            className="py-4 rounded-xl text-base font-bold transition hover:opacity-90 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            style={{ background: "var(--color-anu-accent)", color: "#fff" }}
          >
            {saving ? (
              t("common.saving")
            ) : (
              <>
                <AppIcon name="save" size={18} />
                {t("grade.save_box")} #{nextBox}
              </>
            )}
          </button>
        </div>
      )}
    </ProductionFlowShell>
  );
}
