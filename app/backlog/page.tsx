"use client";

import { useCallback, useState } from "react";
import { ProductionFlowShell } from "@/components/ProductionFlowShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/context";

export default function BacklogPage() {
  const { t } = useI18n();
  const { user, loading } = useRequireAuth();

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState("");

  const [curAts, setCurAts] = useState(0);
  const [curPrint, setCurPrint] = useState(0);
  const [curCam, setCurCam] = useState(0);

  const [addAts, setAddAts] = useState("");
  const [clearAts, setClearAts] = useState("");
  const [addPrint, setAddPrint] = useState("");
  const [clearPrint, setClearPrint] = useState("");
  const [addCam, setAddCam] = useState("");
  const [clearCam, setClearCam] = useState("");

  const finalAts = curAts + (parseInt(addAts) || 0) - (parseInt(clearAts) || 0);
  const finalPrint = curPrint + (parseInt(addPrint) || 0) - (parseInt(clearPrint) || 0);
  const finalCam = curCam + (parseInt(addCam) || 0) - (parseInt(clearCam) || 0);
  const hasError = finalAts < 0 || finalPrint < 0 || finalCam < 0;

  const cardStyle = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };

  const loadCurrent = useCallback(async (line: string, batch: string) => {
    const { data } = await supabase
      .from("backlog")
      .select("ats_box, print_box, cam_box")
      .eq("line", line)
      .eq("batch", batch)
      .order("recorded_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setCurAts(data[0].ats_box || 0);
      setCurPrint(data[0].print_box || 0);
      setCurCam(data[0].cam_box || 0);
    } else {
      setCurAts(0);
      setCurPrint(0);
      setCurCam(0);
    }
  }, []);

  const resetInputs = useCallback(() => {
    setAddAts("");
    setClearAts("");
    setAddPrint("");
    setClearPrint("");
    setAddCam("");
    setClearCam("");
    setLastSaved("");
  }, []);

  const handleBatchReady = useCallback(
    (line: string, batch: string) => {
      resetInputs();
      loadCurrent(line, batch);
    },
    [loadCurrent, resetInputs],
  );

  async function handleSave(line: string, batch: string) {
    if (hasError) return;

    setSaving(true);
    const { error } = await supabase.from("backlog").insert([{
      line,
      batch,
      ats_box: finalAts,
      print_box: finalPrint,
      cam_box: finalCam,
      record_by: user?.fullname,
      recorded_by: user?.id,
    }]);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setLastSaved(t("backlog.saved_msg", { ats: finalAts, print: finalPrint, cam: finalCam }));
    setCurAts(finalAts);
    setCurPrint(finalPrint);
    setCurCam(finalCam);
    resetInputs();
    setSaving(false);
  }

  const STATIONS = [
    {
      label: "ATS",
      color: "#7c5cff",
      cur: curAts,
      add: addAts,
      setAdd: setAddAts,
      clear: clearAts,
      setClear: setClearAts,
      final: finalAts,
    },
    {
      label: "Printing",
      color: "#f97316",
      cur: curPrint,
      add: addPrint,
      setAdd: setAddPrint,
      clear: clearPrint,
      setClear: setClearPrint,
      final: finalPrint,
    },
    {
      label: "Camera",
      color: "#00d4aa",
      cur: curCam,
      add: addCam,
      setAdd: setAddCam,
      clear: clearCam,
      setClear: setClearCam,
      final: finalCam,
    },
  ];

  if (loading || !user) return null;

  return (
    <ProductionFlowShell
      title={t("backlog.title")}
      titleIcon="⏳"
      noBatchKey="backlog.no_batch"
      onBatchReady={handleBatchReady}
    >
      {({ line, batch }) => (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border p-4" style={cardStyle}>
            <p
              className="text-xs mb-3 font-medium uppercase tracking-wider"
              style={{ color: "var(--color-anu-muted)" }}
            >
              {t("backlog.current_backlog")}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {STATIONS.map((station) => (
                <div
                  key={station.label}
                  className="text-center rounded-lg p-3"
                  style={{ background: "var(--color-anu-elevated)" }}
                >
                  <p className="text-xs mb-1" style={{ color: station.color }}>
                    {station.label}
                  </p>
                  <p className="text-2xl font-black" style={{ color: "var(--color-anu-text)" }}>
                    {station.cur}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-anu-muted)" }}>
                    {t("backlog.box")}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {STATIONS.map((station) => (
            <div key={station.label} className="rounded-xl border p-4" style={cardStyle}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full" style={{ background: station.color }} />
                <p className="text-sm font-medium" style={{ color: "var(--color-anu-text)" }}>
                  {station.label}
                </p>
                <span
                  className="ml-auto text-xs px-2 py-0.5 rounded-full"
                  style={{
                    background: station.final < 0 ? "rgba(255,71,87,0.15)" : "rgba(0,212,170,0.1)",
                    color: station.final < 0 ? "var(--color-anu-danger)" : "var(--color-anu-success)",
                  }}
                >
                  {t("backlog.result")}: {station.final} {t("backlog.box")}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                    {t("backlog.new_backlog")}
                  </p>
                  <input
                    type="number"
                    min="0"
                    value={station.add}
                    placeholder="0"
                    onChange={(e) => station.setAdd(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none text-right"
                    style={{
                      background: "var(--color-anu-elevated)",
                      borderColor: "var(--color-anu-border)",
                      color: "var(--color-anu-text)",
                    }}
                  />
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                    {t("backlog.cleared")}
                  </p>
                  <input
                    type="number"
                    min="0"
                    value={station.clear}
                    placeholder="0"
                    onChange={(e) => station.setClear(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none text-right"
                    style={{
                      background: "var(--color-anu-elevated)",
                      borderColor: "var(--color-anu-border)",
                      color: "var(--color-anu-text)",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          <div
            className="rounded-xl border p-4 flex justify-between items-center"
            style={{
              ...cardStyle,
              borderColor: hasError ? "rgba(255,71,87,0.4)" : "var(--color-anu-border)",
            }}
          >
            <span className="text-sm font-medium" style={{ color: "var(--color-anu-muted)" }}>
              {t("backlog.total_backlog")}
            </span>
            <span
              className="text-2xl font-black"
              style={{ color: hasError ? "var(--color-anu-danger)" : "var(--color-anu-text)" }}
            >
              {hasError
                ? t("backlog.negative_error")
                : `${finalAts + finalPrint + finalCam} ${t("backlog.box")}`}
            </span>
          </div>

          {lastSaved && (
            <p className="text-sm text-center" style={{ color: "var(--color-anu-success)" }}>
              {lastSaved}
            </p>
          )}

          <button
            onClick={() => handleSave(line, batch)}
            disabled={saving || hasError}
            className="py-3 rounded-xl text-sm font-bold transition hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--color-anu-accent)", color: "#fff" }}
          >
            {saving ? t("common.saving") : t("backlog.save")}
          </button>
        </div>
      )}
    </ProductionFlowShell>
  );
}
