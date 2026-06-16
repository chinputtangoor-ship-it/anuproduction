"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/context";

// ─── Types ────────────────────────────────────────────────────────────────────
type FieldDef = {
  key: string;
  unit?: string;
  type?: "number" | "text" | "select";
  options?: string[];
};

type SectionDef = {
  id: string;
  icon: string;
  color: string;
  fields: FieldDef[];
};

// ─── Section definitions ──────────────────────────────────────────────────────
const SECTIONS: SectionDef[] = [
  {
    id: "dimension",
    icon: "📐",
    color: "#7C5CFF",
    fields: [
      { key: "dim_length",  unit: "mm", type: "number" },
      { key: "dim_width",   unit: "mm", type: "number" },
      { key: "dim_height",  unit: "mm", type: "number" },
    ],
  },
  {
    id: "outside_dimension",
    icon: "📏",
    color: "#4EA8DE",
    fields: [
      { key: "out_length",  unit: "mm", type: "number" },
      { key: "out_width",   unit: "mm", type: "number" },
      { key: "out_height",  unit: "mm", type: "number" },
    ],
  },
  {
    id: "thickness",
    icon: "🔲",
    color: "#F59E0B",
    fields: [
      { key: "thk_top",    unit: "mm", type: "number" },
      { key: "thk_bottom", unit: "mm", type: "number" },
      { key: "thk_side_a", unit: "mm", type: "number" },
      { key: "thk_side_b", unit: "mm", type: "number" },
    ],
  },
  {
    id: "cut_length",
    icon: "✂️",
    color: "#10B981",
    fields: [
      { key: "cut_a", unit: "mm", type: "number" },
      { key: "cut_b", unit: "mm", type: "number" },
    ],
  },
  {
    id: "weight",
    icon: "⚖️",
    color: "#EC4899",
    fields: [
      { key: "weight_gross", unit: "g", type: "number" },
      { key: "weight_net",   unit: "g", type: "number" },
    ],
  },
  {
    id: "attribute",
    icon: "🏷️",
    color: "#8B5CF6",
    fields: [
      { key: "attr_color",   type: "text" },
      { key: "attr_texture", type: "text" },
      { key: "attr_result",  type: "select", options: ["Pass", "Fail", "Hold"] },
    ],
  },
  {
    id: "defect",
    icon: "⚠️",
    color: "#EF4444",
    fields: [
      { key: "defect_type", type: "text" },
      { key: "defect_qty",  type: "number" },
      { key: "defect_note", type: "text" },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function QualityPage() {
  const router = useRouter();
  const { t }  = useI18n();

  const initValues = () =>
    SECTIONS.reduce<Record<string, string>>((acc, sec) => {
      sec.fields.forEach(f => { acc[f.key] = ""; });
      return acc;
    }, {});

  const [values, setValues]        = useState<Record<string, string>>(initValues);
  const [activeSection, setActive] = useState<string>(SECTIONS[0].id);
  const [submitted, setSubmitted]  = useState(false);

  const set = (key: string, val: string) =>
    setValues(prev => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    console.log("QC Form data:", values);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleReset = () => setValues(initValues());

  const activeSec = SECTIONS.find(s => s.id === activeSection)!;

  // ── progress ──
  const total  = Object.keys(values).length;
  const filled = Object.values(values).filter(v => v !== "").length;
  const pct    = Math.round((filled / total) * 100);

  return (
    <div className="min-h-screen p-4 lg:p-8" style={{ background: "var(--color-anu-void)" }}>

      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
            {t("quality.subtitle")}
          </p>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-anu-text)" }}>
            {t("quality.title")}
          </h1>
        </div>

        {/* Progress badge */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl border"
             style={{ background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" }}>
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-anu-border)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke="var(--color-anu-glow)" strokeWidth="3"
                strokeDasharray={`${pct * 0.942} 94.2`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold"
                  style={{ color: "var(--color-anu-glow)" }}>
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

      {/* ── Body ── */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* ── Left: Section tabs ── */}
        <div className="lg:w-52 shrink-0 rounded-2xl border p-3 flex flex-row lg:flex-col gap-1 overflow-x-auto"
             style={{ background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" }}>
          {SECTIONS.map(sec => {
            const secFilled = sec.fields.filter(f => values[f.key] !== "").length;
            const secTotal  = sec.fields.length;
            const isActive  = activeSection === sec.id;
            const allDone   = secFilled === secTotal;

            return (
              <button
                key={sec.id}
                onClick={() => setActive(sec.id)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all whitespace-nowrap lg:whitespace-normal"
                style={{
                  background: isActive ? `${sec.color}22` : "transparent",
                  color:      isActive ? sec.color : "var(--color-anu-muted)",
                  borderLeft: isActive ? `3px solid ${sec.color}` : "3px solid transparent",
                }}
              >
                <span className="text-base">{sec.icon}</span>
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

        {/* ── Right: Active section form ── */}
        <div className="flex-1">
          <div className="rounded-2xl border p-6"
               style={{ background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" }}>

            {/* Section header */}
            <div className="flex items-center gap-3 mb-6 pb-4"
                 style={{ borderBottom: "1px solid var(--color-anu-border)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                   style={{ background: `${activeSec.color}22` }}>
                {activeSec.icon}
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: "var(--color-anu-text)" }}>
                  {t(`quality.sections.${activeSec.id}`)}
                </h2>
                <p className="text-xs" style={{ color: "var(--color-anu-muted)" }}>
                  {activeSec.fields.filter(f => values[f.key] !== "").length}/{activeSec.fields.length} {t("quality.filled")}
                </p>
              </div>
            </div>

            {/* Fields grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeSec.fields.map(field => (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide"
                         style={{ color: "var(--color-anu-muted)" }}>
                    {t(`quality.fields.${field.key}`)}
                    {field.unit && (
                      <span className="ml-1 font-normal normal-case" style={{ color: activeSec.color }}>
                        ({field.unit})
                      </span>
                    )}
                  </label>

                  {field.type === "select" ? (
                    <select
                      value={values[field.key]}
                      onChange={e => set(field.key, e.target.value)}
                      className="px-3 py-2.5 rounded-lg text-sm outline-none transition"
                      style={{
                        background: "var(--color-anu-void)",
                        border:     `1px solid ${values[field.key] ? activeSec.color : "var(--color-anu-border)"}`,
                        color:      "var(--color-anu-text)",
                      }}
                    >
                      <option value="">{t("quality.select")}</option>
                      {field.options?.map(o => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type ?? "text"}
                      value={values[field.key]}
                      onChange={e => set(field.key, e.target.value)}
                      placeholder={field.unit ? "0.00" : t(`quality.fields.${field.key}`).toLowerCase()}
                      className="px-3 py-2.5 rounded-lg text-sm outline-none transition"
                      style={{
                        background: "var(--color-anu-void)",
                        border:     `1px solid ${values[field.key] ? activeSec.color : "var(--color-anu-border)"}`,
                        color:      "var(--color-anu-text)",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Section nav */}
            <div className="flex justify-between mt-8 pt-4"
                 style={{ borderTop: "1px solid var(--color-anu-border)" }}>
              <button
                disabled={SECTIONS[0].id === activeSection}
                onClick={() => {
                  const idx = SECTIONS.findIndex(s => s.id === activeSection);
                  if (idx > 0) setActive(SECTIONS[idx - 1].id);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-30"
                style={{
                  background: "var(--color-anu-void)",
                  border:     "1px solid var(--color-anu-border)",
                  color:      "var(--color-anu-muted)",
                }}
              >
                {t("quality.previous")}
              </button>

              {SECTIONS[SECTIONS.length - 1].id === activeSection ? (
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 rounded-lg text-sm font-semibold transition"
                  style={{ background: submitted ? "#10B981" : "var(--color-anu-accent)", color: "#fff" }}
                >
                  {submitted ? t("quality.saved") : t("quality.submit")}
                </button>
              ) : (
                <button
                  onClick={() => {
                    const idx = SECTIONS.findIndex(s => s.id === activeSection);
                    if (idx < SECTIONS.length - 1) setActive(SECTIONS[idx + 1].id);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition"
                  style={{ background: activeSec.color, color: "#fff" }}
                >
                  {t("quality.next")}
                </button>
              )}
            </div>
          </div>

          {/* ── Bottom action bar ── */}
          <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={{
                background:  "transparent",
                border:      "1px solid var(--color-anu-border)",
                color:       "var(--color-anu-muted)",
              }}
            >
              {t("quality.reset_all")}
            </button>

            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold transition"
              style={{
                background: submitted ? "#10B981" : "rgba(124,92,255,0.9)",
                color:      "#fff",
              }}
            >
              {submitted ? t("quality.saved") : t("quality.save_form")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}