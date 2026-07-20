"use client";

import { useCallback, useState } from "react";
import { ProductionFlowShell } from "@/components/ProductionFlowShell";
import { DEFECT_LIST } from "@/lib/constants/production";
import { withRecordedBy } from "@/lib/audit/stamp";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/context";
import { FormSkeleton } from "@/components/ui/Skeleton";

type DefectRow = { type: string; qty: string };

const emptyDefects = (): DefectRow[] =>
  Array(4)
    .fill(null)
    .map(() => ({ type: "-", qty: "" }));

function buildDefectStr(defs: DefectRow[]) {
  return (
    defs
      .filter((d) => d.type !== "-")
      .map((d) => `${d.type}(${parseInt(d.qty) || 0})`)
      .join(",") || "None"
  );
}

function totalQty(defs: DefectRow[]) {
  return defs
    .filter((d) => d.type !== "-")
    .reduce((sum, d) => sum + (parseInt(d.qty) || 0), 0);
}

function DefectRows({
  defs,
  setDefs,
  inputStyle,
}: {
  defs: DefectRow[];
  setDefs: (rows: DefectRow[]) => void;
  inputStyle: React.CSSProperties;
}) {
  return (
    <div className="flex flex-col gap-2 mt-3">
      {defs.map((row, index) => (
        <div key={index} className="grid grid-cols-2 gap-2">
          <select
            value={row.type}
            onChange={(e) => {
              const next = [...defs];
              next[index] = { ...next[index], type: e.target.value };
              setDefs(next);
            }}
            className="rounded-lg border px-2 py-2 text-sm outline-none"
            style={inputStyle}
          >
            <option value="-">-</option>
            {DEFECT_LIST.map((defect) => (
              <option key={defect}>{defect}</option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            value={row.qty}
            placeholder=""
            onChange={(e) => {
              const next = [...defs];
              next[index] = { ...next[index], qty: e.target.value };
              setDefs(next);
            }}
            className="rounded-lg border px-2 py-2 text-sm outline-none text-right"
            style={inputStyle}
          />
        </div>
      ))}
    </div>
  );
}

export default function CameraPage() {
  const { t } = useI18n();
  const { user, loading } = useRequireAuth();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [c1Pass, setC1Pass] = useState("");
  const [c1Defs, setC1Defs] = useState<DefectRow[]>(emptyDefects);
  const [c2Pass, setC2Pass] = useState("");
  const [c2Defs, setC2Defs] = useState<DefectRow[]>(emptyDefects);

  const cardStyle = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };
  const inputStyle = {
    background: "var(--color-anu-elevated)",
    borderColor: "var(--color-anu-border)",
    color: "var(--color-anu-text)",
  };

  const resetForm = useCallback(() => {
    setC1Pass("");
    setC2Pass("");
    setC1Defs(emptyDefects());
    setC2Defs(emptyDefects());
    setSaved(false);
  }, []);

  async function handleSave(line: string, batch: string) {
    if (!user?.id) return;
    setSaving(true);
    const c1PassNum = parseFloat(c1Pass) || 0;
    const c2PassNum = parseFloat(c2Pass) || 0;

    const { error } = await supabase.from("camera_inspection").insert([
      withRecordedBy(
        {
          line,
          batch,
          cam1_pass_rate: c1PassNum,
          cam1_defects: buildDefectStr(c1Defs),
          cam1_total_qty: totalQty(c1Defs),
          cam2_pass_rate: c2PassNum,
          cam2_defects: buildDefectStr(c2Defs),
          cam2_total_qty: totalQty(c2Defs),
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

    setSaved(true);
    setSaving(false);
    setTimeout(resetForm, 1500);
  }

  if (loading || !user) return <FormSkeleton />;

  const cameras = [
    {
      labelKey: "camera.camera1",
      pass: c1Pass,
      setPass: setC1Pass,
      passNum: parseFloat(c1Pass) || 0,
      defs: c1Defs,
      setDefs: setC1Defs,
      color: "#54a0ff",
    },
    {
      labelKey: "camera.camera2",
      pass: c2Pass,
      setPass: setC2Pass,
      passNum: parseFloat(c2Pass) || 0,
      defs: c2Defs,
      setDefs: setC2Defs,
      color: "var(--color-anu-success)",
    },
  ];

  return (
    <ProductionFlowShell
      title={t("camera.title")}
      titleIcon="camera"
      noBatchKey="camera.no_batch"
      lineCols={6}
      batchCols={4}
      onBatchReady={resetForm}
    >
      {({ line, batch }) => (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {cameras.map((cam) => (
              <div key={cam.labelKey} className="rounded-xl border p-5" style={cardStyle}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 rounded-full" style={{ background: cam.color }} />
                  <p className="text-sm font-bold" style={{ color: cam.color }}>
                    {t(cam.labelKey)}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                    {t("camera.pass_rate")}
                  </p>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={cam.pass}
                      placeholder="0.00"
                      onChange={(e) => cam.setPass(e.target.value)}
                      className="flex-1 rounded-lg border px-3 py-2.5 text-xl font-bold outline-none text-right"
                      style={inputStyle}
                    />
                    <span
                      className="text-sm font-bold"
                      style={{
                        color:
                          cam.passNum >= 98
                            ? "var(--color-anu-success)"
                            : cam.passNum >= 95
                              ? "var(--color-anu-warning)"
                              : "var(--color-anu-danger)",
                      }}
                    >
                      %
                    </span>
                  </div>
                  <div
                    className="mt-2 rounded-full overflow-hidden h-1.5"
                    style={{ background: "var(--color-anu-elevated)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${cam.passNum}%`,
                        background:
                          cam.passNum >= 98
                            ? "var(--color-anu-success)"
                            : cam.passNum >= 95
                              ? "var(--color-anu-warning)"
                              : "var(--color-anu-danger)",
                      }}
                    />
                  </div>
                </div>

                <p className="text-xs mb-2 font-medium" style={{ color: "var(--color-anu-muted)" }}>
                  {t("camera.defects")}
                </p>
                <div className="grid grid-cols-2 gap-1 mb-1">
                  <p className="text-xs px-2" style={{ color: "var(--color-anu-muted)" }}>
                    {t("camera.defect_type")}
                  </p>
                  <p className="text-xs px-2" style={{ color: "var(--color-anu-muted)" }}>
                    {t("camera.qty")}
                  </p>
                </div>
                <DefectRows defs={cam.defs} setDefs={cam.setDefs} inputStyle={inputStyle} />

                <div
                  className="mt-3 rounded-lg p-2 flex justify-between text-xs"
                  style={{ background: "var(--color-anu-elevated)" }}
                >
                  <span style={{ color: "var(--color-anu-muted)" }}>{t("camera.total_defect")}</span>
                  <span style={{ color: cam.color, fontWeight: 700 }}>
                    {totalQty(cam.defs)} {t("camera.pieces")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {saved ? (
            <p className="text-center font-semibold" style={{ color: "var(--color-anu-success)" }}>
              {t("camera.saved")}
            </p>
          ) : (
            <button
              onClick={() => handleSave(line, batch)}
              disabled={saving}
              className="py-3 rounded-xl text-sm font-bold transition hover:opacity-90 disabled:opacity-50 max-w-lg"
              style={{ background: "var(--color-anu-accent)", color: "#fff" }}
            >
              {saving ? t("common.saving") : t("camera.save")}
            </button>
          )}
        </div>
      )}
    </ProductionFlowShell>
  );
}
