"use client";

import { useCallback, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { ProductionFlowShell } from "@/components/ProductionFlowShell";
import { emptyQcFormValues, QC_SECTIONS } from "@/lib/constants/qc-form";
import { fetchNextQcBoxNumber } from "@/lib/data/qc";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/context";
import { withRecordedBy } from "@/lib/audit/stamp";
import { FormSkeleton } from "@/components/ui/Skeleton";

export default function QualityPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { t } = useI18n();

  const [values, setValues] = useState<Record<string, string>>(emptyQcFormValues);
  const [activeSection, setActive] = useState(QC_SECTIONS[0].id);
  const [nextBox, setNextBox] = useState(1);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState("");
  const [submitFlash, setSubmitFlash] = useState(false);

  const resetForm = useCallback(() => {
    setValues(emptyQcFormValues());
    setActive(QC_SECTIONS[0].id);
    setLastSaved("");
    setSubmitFlash(false);
  }, []);

  const handleBatchReady = useCallback(
    async (_line: string, batchId: string) => {
      resetForm();
      const box = await fetchNextQcBoxNumber(batchId);
      setNextBox(box);
    },
    [resetForm],
  );

  const set = (key: string, val: string) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const activeSec = QC_SECTIONS.find((s) => s.id === activeSection)!;
  const total = Object.keys(values).length;
  const filled = Object.values(values).filter((v) => v !== "").length;
  const pct = Math.round((filled / total) * 100);
  const isComplete = filled === total;

  async function handleSubmit(line: string, batch: string) {
    if (!user) return;
    if (!isComplete) {
      alert(t("quality.alert_incomplete"));
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("qc_inspection").insert([
      withRecordedBy(
        {
          line,
          batch,
          box_number: nextBox,
          form_data: values,
          inspected_by: user.id,
        },
        user.id,
      ),
    ]);

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    setLastSaved(t("quality.saved_msg", { box: nextBox }));
    setSubmitFlash(true);
    setValues(emptyQcFormValues());
    setActive(QC_SECTIONS[0].id);
    setNextBox((n) => n + 1);
    setSaving(false);
    setTimeout(() => setSubmitFlash(false), 2000);
  }

  const cardStyle = {
    background: "var(--color-anu-surface)",
    borderColor: "var(--color-anu-border)",
  };

  if (authLoading || !user) return <FormSkeleton />;

  return (
    <ProductionFlowShell
      title={t("quality.title")}
      titleIcon="scan"
      noBatchKey="quality.no_batch"
      lineCols={6}
      batchCols={4}
      onBatchReady={handleBatchReady}
    >
      {({ line, batch }) => (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border p-4 text-center" style={cardStyle}>
            <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
              {t("quality.current_box")}
            </p>
            <p className="text-5xl font-black" style={{ color: "var(--color-anu-accent)" }}>
              #{nextBox}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--color-anu-muted)" }}>
              {t("quality.sequential_hint")}
            </p>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm" style={{ color: "var(--color-anu-muted)" }}>
              {t("quality.subtitle")} · {line} › {batch}
            </p>
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl border" style={cardStyle}>
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-anu-border)" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="var(--color-anu-glow)"
                    strokeWidth="3"
                    strokeDasharray={`${pct * 0.942} 94.2`}
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                  style={{ color: "var(--color-anu-glow)" }}
                >
                  {pct}%
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--color-anu-text)" }}>
                  {filled}/{total} {t("quality.fields")}
                </p>
                <p className="text-xs" style={{ color: "var(--color-anu-muted)" }}>
                  {t("quality.completed")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div
              className="lg:w-52 shrink-0 rounded-2xl border p-3 flex flex-row lg:flex-col gap-1 overflow-x-auto"
              style={cardStyle}
            >
              {QC_SECTIONS.map((sec) => {
                const secFilled = sec.fields.filter((f) => values[f.key] !== "").length;
                const secTotal = sec.fields.length;
                const isActive = activeSection === sec.id;
                const allDone = secFilled === secTotal;

                return (
                  <button
                    key={sec.id}
                    onClick={() => setActive(sec.id)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all whitespace-nowrap lg:whitespace-normal"
                    style={{
                      background: isActive ? `${sec.color}22` : "transparent",
                      color: isActive ? sec.color : "var(--color-anu-muted)",
                      borderLeft: isActive ? `3px solid ${sec.color}` : "3px solid transparent",
                    }}
                  >
                    <AppIcon name={sec.icon} size={16} />
                    <span className="flex-1">{t(`quality.sections.${sec.id}`)}</span>
                    {allDone && <span className="text-green-400 text-xs">✓</span>}
                    {!allDone && secFilled > 0 && (
                      <span className="text-xs" style={{ color: "var(--color-anu-muted)" }}>
                        {secFilled}/{secTotal}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex-1">
              <div className="rounded-2xl border p-6" style={cardStyle}>
                <div
                  className="flex items-center gap-3 mb-6 pb-4"
                  style={{ borderBottom: "1px solid var(--color-anu-border)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${activeSec.color}22`, color: activeSec.color }}
                  >
                    <AppIcon name={activeSec.icon} size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: "var(--color-anu-text)" }}>
                      {t(`quality.sections.${activeSec.id}`)}
                    </h2>
                    <p className="text-xs" style={{ color: "var(--color-anu-muted)" }}>
                      {activeSec.fields.filter((f) => values[f.key] !== "").length}/
                      {activeSec.fields.length} {t("quality.filled")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {activeSec.fields.map((field) => (
                    <div key={field.key} className="flex flex-col gap-1.5">
                      <label
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "var(--color-anu-muted)" }}
                      >
                        {t(`quality.field.${field.key}`)}
                        {field.unit && (
                          <span className="ml-1 font-normal normal-case" style={{ color: activeSec.color }}>
                            ({field.unit})
                          </span>
                        )}
                      </label>

                      {field.type === "select" ? (
                        <select
                          value={values[field.key]}
                          onChange={(e) => set(field.key, e.target.value)}
                          className="px-3 py-2.5 rounded-lg text-sm outline-none transition"
                          style={{
                            background: "var(--color-anu-void)",
                            border: `1px solid ${values[field.key] ? activeSec.color : "var(--color-anu-border)"}`,
                            color: "var(--color-anu-text)",
                          }}
                        >
                          <option value="">{t("quality.select")}</option>
                          {field.options?.map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type ?? "text"}
                          value={values[field.key]}
                          onChange={(e) => set(field.key, e.target.value)}
                          placeholder={field.unit ? "0.00" : t(`quality.field.${field.key}`).toLowerCase()}
                          className="px-3 py-2.5 rounded-lg text-sm outline-none transition"
                          style={{
                            background: "var(--color-anu-void)",
                            border: `1px solid ${values[field.key] ? activeSec.color : "var(--color-anu-border)"}`,
                            color: "var(--color-anu-text)",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div
                  className="flex justify-between mt-8 pt-4"
                  style={{ borderTop: "1px solid var(--color-anu-border)" }}
                >
                  <button
                    disabled={QC_SECTIONS[0].id === activeSection}
                    onClick={() => {
                      const idx = QC_SECTIONS.findIndex((s) => s.id === activeSection);
                      if (idx > 0) setActive(QC_SECTIONS[idx - 1].id);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-30"
                    style={{
                      background: "var(--color-anu-void)",
                      border: "1px solid var(--color-anu-border)",
                      color: "var(--color-anu-muted)",
                    }}
                  >
                    {t("quality.previous")}
                  </button>

                  {QC_SECTIONS[QC_SECTIONS.length - 1].id === activeSection ? (
                    <button
                      onClick={() => handleSubmit(line, batch)}
                      disabled={saving || !isComplete}
                      className="px-6 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                      style={{
                        background: submitFlash ? "#10B981" : "var(--color-anu-accent)",
                        color: "#fff",
                      }}
                    >
                      {saving
                        ? t("common.saving")
                        : submitFlash
                          ? t("quality.saved")
                          : t("quality.save_box", { box: nextBox })}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        const idx = QC_SECTIONS.findIndex((s) => s.id === activeSection);
                        if (idx < QC_SECTIONS.length - 1) setActive(QC_SECTIONS[idx + 1].id);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition"
                      style={{ background: activeSec.color, color: "#fff" }}
                    >
                      {t("quality.next")}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--color-anu-border)",
                    color: "var(--color-anu-muted)",
                  }}
                >
                  {t("quality.reset_form")}
                </button>

                <button
                  onClick={() => handleSubmit(line, batch)}
                  disabled={saving || !isComplete}
                  className="px-6 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                  style={{
                    background: submitFlash ? "#10B981" : "rgba(124,92,255,0.9)",
                    color: "#fff",
                  }}
                >
                  {saving
                    ? t("common.saving")
                    : submitFlash
                      ? t("quality.saved")
                      : t("quality.save_box", { box: nextBox })}
                </button>
              </div>

              {lastSaved && (
                <p className="text-sm text-center mt-3" style={{ color: "var(--color-anu-success)" }}>
                  {lastSaved}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </ProductionFlowShell>
  );
}
