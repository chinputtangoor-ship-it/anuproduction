"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanFormFields } from "@/components/plan/PlanFormFields";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  emptyPlanForm,
  planFormToPayload,
  planToFormValues,
  type PlanFormValues,
} from "@/lib/constants/plan-form";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/context";

export default function PlanPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, loading: authLoading } = useRequireAuth();

  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"view" | "add" | "manage">("view");
  const [showFinished, setShowFinished] = useState(false);
  const [showPlaning, setShowPlaning] = useState(false);
  const [editingPlan, setEditingPlan] = useState<{ id: string; form: PlanFormValues } | null>(null);
  const [form, setForm] = useState<PlanFormValues>(emptyPlanForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;
    loadPlans();
  }, [authLoading, user]);

  async function loadPlans() {
    setLoading(true);
    const { data, error } = await supabase.from("production_plan").select("*").order("line");
    if (error) setErrorMsg(error.message);
    setPlans(data || []);
    setLoading(false);
  }

  const filteredPlans = plans.filter((p) => {
    if (showFinished && showPlaning) return true;
    if (showFinished) return ["Running", "Finished"].includes(p.batch_status);
    if (showPlaning) return ["Running", "Planing"].includes(p.batch_status);
    return p.batch_status === "Running";
  });

  async function handleAdd() {
    if (!form.batch.trim()) {
      alert(t("plan.batch_required"));
      return;
    }
    setSaving(true);
    setErrorMsg("");
    const { error } = await supabase
      .from("production_plan")
      .insert([planFormToPayload(form, user?.id)]);

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }

    await loadPlans();
    setSaving(false);
    setTab("view");
    setForm({ ...emptyPlanForm(), line: form.line });
  }

  async function handleFinish(id: string) {
    await supabase.from("production_plan").update({ batch_status: "Finished" }).eq("id", id);
    await loadPlans();
  }

  async function handleStartRunning(id: string) {
    await supabase.from("production_plan").update({ batch_status: "Running" }).eq("id", id);
    await loadPlans();
  }

  async function handleSaveEdit() {
    if (!editingPlan) return;
    if (!editingPlan.form.batch.trim()) {
      alert(t("plan.batch_required"));
      return;
    }

    setSaving(true);
    setErrorMsg("");
    const { error } = await supabase
      .from("production_plan")
      .update(planFormToPayload(editingPlan.form, user?.id))
      .eq("id", editingPlan.id);

    if (error) {
      setErrorMsg(error.message);
      setSaving(false);
      return;
    }

    await loadPlans();
    setSaving(false);
    setEditingPlan(null);
  }

  function openEdit(plan: any) {
    setEditingPlan({ id: plan.id, form: planToFormValues(plan) });
  }

  const cardStyle = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };
  const runningPlans = plans.filter((p) => p.batch_status === "Running");
  const planingPlans = plans.filter((p) => p.batch_status === "Planing");

  const TABLE_HEADERS = [
    "Line", "Size", "Batch", "SAP Batch", "Prod. Order", "Insp. Lot",
    "Sales Order", "SO Item", "FERT Code", "Semi Code",
    "Item Qty (K)", "Need AF Box", "Customer", "Country", "Box Packing",
    "Plan Finish", "To be Desp.", "Metal Det.", "Print",
    "Ink Cap", "Roller Cap", "Ink Body", "Roller Body",
    "Status", "Finish Date",
  ];

  if (authLoading || !user) return null;

  if (editingPlan) {
    return (
      <div className="w-full min-h-screen" style={{ background: "var(--color-anu-void)" }}>
        <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setEditingPlan(null)}
              className="text-sm px-3 py-1.5 rounded-lg border"
              style={cardStyle}
            >
              ← {t("common.back")}
            </button>
            <h1 className="text-lg font-bold" style={{ color: "var(--color-anu-text)" }}>
              {t("plan.edit_batch")}: {editingPlan.form.batch}
            </h1>
          </div>

          {errorMsg && (
            <p className="mb-4 text-sm" style={{ color: "var(--color-anu-danger)" }}>
              {errorMsg}
            </p>
          )}

          <div className="rounded-xl border p-6" style={cardStyle}>
            <PlanFormFields
              values={editingPlan.form}
              onChange={(next) => setEditingPlan({ ...editingPlan, form: next })}
            />
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--color-anu-accent)", color: "#fff" }}
            >
              {saving ? t("common.saving") : t("plan.save")}
            </button>
            <button
              onClick={() => setEditingPlan(null)}
              className="px-6 py-2.5 rounded-lg text-sm border"
              style={cardStyle}
            >
              {t("plan.cancel")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm px-3 py-1.5 rounded-lg border"
            style={cardStyle}
          >
            ← {t("common.home")}
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-anu-text)" }}>
            🗓️ {t("plan.title")}
          </h1>
        </div>

        {errorMsg && tab !== "view" && (
          <p className="mb-4 text-sm" style={{ color: "var(--color-anu-danger)" }}>
            {errorMsg}
          </p>
        )}

        <div className="flex gap-2 mb-6">
          {(
            [
              ["view", t("plan.tab_view")],
              ["add", t("plan.tab_add")],
              ["manage", t("plan.tab_manage")],
            ] as [string, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setTab(key as "view" | "add" | "manage");
                setErrorMsg("");
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={
                tab === key
                  ? { background: "var(--color-anu-accent)", color: "#fff" }
                  : { ...cardStyle, border: "1px solid", color: "var(--color-anu-muted)" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "view" && (
          <div>
            <div className="flex gap-4 mb-4">
              <label
                className="flex items-center gap-2 text-sm cursor-pointer"
                style={{ color: "var(--color-anu-muted)" }}
              >
                <input
                  type="checkbox"
                  checked={showFinished}
                  onChange={(e) => setShowFinished(e.target.checked)}
                />
                {t("plan.show_finished")}
              </label>
              <label
                className="flex items-center gap-2 text-sm cursor-pointer"
                style={{ color: "var(--color-anu-muted)" }}
              >
                <input
                  type="checkbox"
                  checked={showPlaning}
                  onChange={(e) => setShowPlaning(e.target.checked)}
                />
                {t("plan.show_planing")}
              </label>
            </div>

            {loading ? (
              <p style={{ color: "var(--color-anu-muted)" }}>{t("common.loading")}</p>
            ) : (
              <div
                className="overflow-x-auto rounded-xl border"
                style={{ borderColor: "var(--color-anu-border)" }}
              >
                <table className="text-xs" style={{ minWidth: "2400px" }}>
                  <thead>
                    <tr style={{ background: "var(--color-anu-elevated)" }}>
                      {TABLE_HEADERS.map((h) => (
                        <th
                          key={h}
                          className="px-3 py-3 text-left font-medium whitespace-nowrap"
                          style={{
                            color: "var(--color-anu-muted)",
                            borderBottom: "1px solid var(--color-anu-border)",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.map((p, i) => (
                      <tr
                        key={p.id}
                        style={{
                          background: i % 2 === 0 ? "var(--color-anu-surface)" : "var(--color-anu-void)",
                          borderTop: "1px solid var(--color-anu-border)",
                        }}
                      >
                        {[
                          p.line, p.size, p.batch, p.sap_batch, p.production_order,
                          p.inspection_lot, p.sales_order, p.sales_order_item,
                          p.fert_code, p.semifinish_code,
                          p.item_qty_million, p.need_af_box,
                          p.customer_name, p.country, p.box_packing,
                          p.planned_finish_date?.slice(0, 10),
                          p.to_be_desp_on?.slice(0, 10),
                          p.metal_detector, p.print_type,
                          p.ink_cap, p.roller_des_cap, p.ink_body, p.roller_des_body,
                        ].map((val, ci) => (
                          <td
                            key={ci}
                            className="px-3 py-2.5 whitespace-nowrap"
                            style={{
                              color: ci <= 2 ? "var(--color-anu-text)" : "var(--color-anu-muted)",
                            }}
                          >
                            {val ?? "-"}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              background:
                                p.batch_status === "Running"
                                  ? "rgba(0,212,170,0.15)"
                                  : p.batch_status === "Finished"
                                    ? "rgba(100,116,139,0.15)"
                                    : "rgba(124,92,255,0.15)",
                              color:
                                p.batch_status === "Running"
                                  ? "var(--color-anu-success)"
                                  : p.batch_status === "Finished"
                                    ? "var(--color-anu-muted)"
                                    : "var(--color-anu-glow)",
                            }}
                          >
                            {p.batch_status}
                          </span>
                        </td>
                        <td
                          className="px-3 py-2.5 whitespace-nowrap"
                          style={{ color: "var(--color-anu-muted)" }}
                        >
                          {p.batch_finish_date?.slice(0, 10) ?? "-"}
                        </td>
                      </tr>
                    ))}
                    {filteredPlans.length === 0 && (
                      <tr>
                        <td
                          colSpan={25}
                          className="px-4 py-8 text-center"
                          style={{ color: "var(--color-anu-muted)" }}
                        >
                          {t("plan.no_info")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "add" && (
          <div className="rounded-xl border p-6" style={cardStyle}>
            <PlanFormFields values={form} onChange={setForm} />
            <button
              onClick={handleAdd}
              disabled={saving}
              className="mt-6 px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--color-anu-accent)", color: "#fff" }}
            >
              {saving ? t("common.saving") : t("plan.add_save")}
            </button>
          </div>
        )}

        {tab === "manage" && (
          <div className="flex flex-col gap-4">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--color-anu-success)" }}
              >
                {t("plan.running_section")} ({runningPlans.length})
              </p>
              {runningPlans.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-anu-muted)" }}>
                  {t("plan.no_running")}
                </p>
              ) : (
                runningPlans.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border p-4 flex items-center justify-between mb-2"
                    style={cardStyle}
                  >
                    <div>
                      <span className="font-semibold" style={{ color: "var(--color-anu-text)" }}>
                        {t("plan.line_label")}: {p.line}
                      </span>
                      <span className="mx-2" style={{ color: "var(--color-anu-border)" }}>
                        |
                      </span>
                      <span style={{ color: "var(--color-anu-text)" }}>
                        {t("plan.batch_label")}: {p.batch}
                      </span>
                      <span className="mx-2" style={{ color: "var(--color-anu-border)" }}>
                        |
                      </span>
                      <span style={{ color: "var(--color-anu-muted)" }}>
                        {t("plan.fert_label")}: {p.fert_code}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="px-3 py-1.5 rounded-lg text-xs border"
                        style={cardStyle}
                      >
                        📝 {t("common.edit")}
                      </button>
                      <button
                        onClick={() => handleFinish(p.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: "var(--color-anu-accent)", color: "#fff" }}
                      >
                        {t("plan.batch_complete")}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--color-anu-border)" }} />

            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--color-anu-glow)" }}
              >
                {t("plan.planing_section")} ({planingPlans.length})
              </p>
              {planingPlans.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-anu-muted)" }}>
                  {t("plan.no_planing")}
                </p>
              ) : (
                planingPlans.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border p-4 flex items-center justify-between mb-2"
                    style={cardStyle}
                  >
                    <div>
                      <span className="font-semibold" style={{ color: "var(--color-anu-text)" }}>
                        {t("plan.line_label")}: {p.line}
                      </span>
                      <span className="mx-2" style={{ color: "var(--color-anu-border)" }}>
                        |
                      </span>
                      <span style={{ color: "var(--color-anu-text)" }}>
                        {t("plan.batch_label")}: {p.batch}
                      </span>
                      <span className="mx-2" style={{ color: "var(--color-anu-border)" }}>
                        |
                      </span>
                      <span style={{ color: "var(--color-anu-muted)" }}>
                        {t("plan.fert_label")}: {p.fert_code}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="px-3 py-1.5 rounded-lg text-xs border"
                        style={cardStyle}
                      >
                        📝 {t("common.edit")}
                      </button>
                      <button
                        onClick={() => handleStartRunning(p.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: "var(--color-anu-success)", color: "#fff" }}
                      >
                        {t("plan.start_batch")}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
