"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { PRODUCTION_LINES } from "@/lib/constants/production";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n/context";

const BATCH_STATUS = ["Planing", "Running", "Finished"];
const CUSTOMER_NAMES = ["ACG NORTH AMERCA LLC", "FAME Pharma Pte ltd", "PT.ACG Indonesia", "COMMUNITY PHARMACY PUBLIC", "ERNEST CHEMIST LTD", "Gel strength Co Ltd (Head office)"];
const COUNTRIES = ["Thailand", "Indonesia", "USA", "Ghana", "Myanmar", "Singapore", "Vietnam"];
const METAL_OPTIONS = ["Normal", "Iron Oxide"];
const BOX_PACKING = ["Box 660", "Box 675", "Box 705", "Box 705+Liner", "Box 760+EPS Sheet", "Box Tabsule", "Box Fsample"];
const INK_OPTIONS = ["-", "RMI010004 Black ACG", "RMI010021 White ACG", "RMI010182 Black ACG/TEK", "RMI010017 Red ACG", "RMI010002 Black TEK", "RMI010057 Green TEK", "RMI010033 Yellow/Gold TEK"];

const inputStyle = {
  background:  "var(--color-anu-elevated)",
  borderColor: "var(--color-anu-border)",
  color:       "var(--color-anu-text)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs" style={{ color: "var(--color-anu-muted)" }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ ...props }) {
  return <input {...props} className="rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle} />;
}

function Select({ children, ...props }: any) {
  return (
    <select {...props} className="rounded-lg border px-3 py-2 text-sm outline-none" style={inputStyle}>
      {children}
    </select>
  );
}

export default function PlanPage() {
  const router = useRouter();
  const { t }  = useI18n();

  const { user, loading: authLoading } = useRequireAuth();
  const [plans, setPlans]             = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [tab, setTab]                 = useState<"view" | "add" | "manage">("view");
  const [showFinished, setShowFinished] = useState(false);
  const [showPlaning, setShowPlaning]   = useState(false);
  const [editingPlan, setEditingPlan]   = useState<any>(null);
  const [saving, setSaving]           = useState(false);
  const [form, setForm] = useState({
    line: "H501", batch: "", sap_batch: "", production_order: "",
    inspection_lot: "", sales_order: "", sales_order_item: "",
    fert_code: "", semifinish_code: "", item_qty_million: "",
    need_af_box: "", customer_name: CUSTOMER_NAMES[0],
    planned_finish_date: "", to_be_desp_on: "",
    metal_detector: "Normal", print_type: "U",
    country: "Thailand", box_packing: BOX_PACKING[0],
    ink_cap: "-", roller_des_cap: "", ink_body: "-", roller_des_body: "",
    batch_status: "Planing",
  });

  useEffect(() => {
    if (authLoading || !user) return;
    loadPlans();
  }, [authLoading, user]);

  async function loadPlans() {
    setLoading(true);
    const { data } = await supabase
      .from("production_plan")
      .select("*")
      .order("line");
    setPlans(data || []);
    setLoading(false);
  }

  const filteredPlans = plans.filter(p => {
    if (showFinished && showPlaning) return true;
    if (showFinished) return ["Running", "Finished"].includes(p.batch_status);
    if (showPlaning) return ["Running", "Planing"].includes(p.batch_status);
    return p.batch_status === "Running";
  });

  async function handleAdd() {
    if (!form.batch) return alert(t("plan.batch_required"));
    setSaving(true);
    await supabase.from("production_plan").insert([{
      ...form,
      item_qty_million: parseFloat(form.item_qty_million) || 0,
      need_af_box: parseInt(form.need_af_box) || 0,
    }]);
    await loadPlans();
    setSaving(false);
    setTab("view");
    setForm({ ...form, batch: "", sap_batch: "", production_order: "" });
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
    setSaving(true);
    await supabase.from("production_plan").update({
      ...editingPlan,
      item_qty_million: parseFloat(editingPlan.item_qty_million) || 0,
      need_af_box: parseInt(editingPlan.need_af_box) || 0,
    }).eq("id", editingPlan.id);
    await loadPlans();
    setSaving(false);
    setEditingPlan(null);
  }

  function openEdit(plan: any) {
    setEditingPlan({
      ...plan,
      sap_batch:           plan.sap_batch           ?? "",
      production_order:    plan.production_order     ?? "",
      fert_code:           plan.fert_code            ?? "",
      semifinish_code:     plan.semifinish_code      ?? "",
      item_qty_million:    plan.item_qty_million     != null ? String(plan.item_qty_million) : "",
      need_af_box:         plan.need_af_box          != null ? String(plan.need_af_box)      : "",
      planned_finish_date: plan.planned_finish_date?.slice(0, 10) ?? "",
      to_be_desp_on:       plan.to_be_desp_on?.slice(0, 10)       ?? "",
      roller_des_cap:      plan.roller_des_cap       ?? "",
      roller_des_body:     plan.roller_des_body      ?? "",
    });
  }

  const cardStyle    = { background: "var(--color-anu-surface)", borderColor: "var(--color-anu-border)" };
  const runningPlans = plans.filter(p => p.batch_status === "Running");
  const planingPlans = plans.filter(p => p.batch_status === "Planing");

  const TABLE_HEADERS = [
    "Line","Size","Batch","SAP Batch","Prod. Order","Insp. Lot",
    "Sales Order","SO Item","FERT Code","Semi Code",
    "Item Qty (K)","Need AF Box","Customer","Country","Box Packing",
    "Plan Finish","To be Desp.","Metal Det.","Print",
    "Ink Cap","Roller Cap","Ink Body","Roller Body",
    "Status","Finish Date",
  ];

  // ── Edit Modal ──────────────────────────────────────────────────────
  if (authLoading || !user) return null;

  if (editingPlan) return (
    <div className="w-full min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setEditingPlan(null)}
            className="text-sm px-3 py-1.5 rounded-lg border" style={cardStyle}>
            ← {t("common.back")}
          </button>
          <h1 className="text-lg font-bold" style={{ color: "var(--color-anu-text)" }}>
            {t("plan.edit_batch")}: {editingPlan.batch}
          </h1>
        </div>
        <div className="rounded-xl border p-6 grid grid-cols-2 md:grid-cols-4 gap-4" style={cardStyle}>
          {([
            ["Line",        <Select value={editingPlan.line} onChange={(e: any) => setEditingPlan({ ...editingPlan, line: e.target.value })}>{PRODUCTION_LINES.map(l => <option key={l}>{l}</option>)}</Select>],
            ["Batch",       <Input value={editingPlan.batch} onChange={(e: any) => setEditingPlan({ ...editingPlan, batch: e.target.value })} />],
            ["SAP Batch",   <Input value={editingPlan.sap_batch} onChange={(e: any) => setEditingPlan({ ...editingPlan, sap_batch: e.target.value })} />],
            ["Prod. Order", <Input value={editingPlan.production_order} onChange={(e: any) => setEditingPlan({ ...editingPlan, production_order: e.target.value })} />],
            ["FERT Code",   <Input value={editingPlan.fert_code} onChange={(e: any) => setEditingPlan({ ...editingPlan, fert_code: e.target.value })} />],
            ["Semi Code",   <Input value={editingPlan.semifinish_code} onChange={(e: any) => setEditingPlan({ ...editingPlan, semifinish_code: e.target.value })} />],
            ["Item Qty (K)", <Input type="number" placeholder="0" value={editingPlan.item_qty_million} onChange={(e: any) => setEditingPlan({ ...editingPlan, item_qty_million: e.target.value })} />],
            ["Need AF Box", <Input type="number" placeholder="0" value={editingPlan.need_af_box} onChange={(e: any) => setEditingPlan({ ...editingPlan, need_af_box: e.target.value })} />],
            ["Customer",    <Select value={editingPlan.customer_name} onChange={(e: any) => setEditingPlan({ ...editingPlan, customer_name: e.target.value })}>{CUSTOMER_NAMES.map(c => <option key={c}>{c}</option>)}</Select>],
            ["Plan Finish", <Input type="date" value={editingPlan.planned_finish_date} onChange={(e: any) => setEditingPlan({ ...editingPlan, planned_finish_date: e.target.value })} />],
            ["To be Desp.", <Input type="date" value={editingPlan.to_be_desp_on} onChange={(e: any) => setEditingPlan({ ...editingPlan, to_be_desp_on: e.target.value })} />],
            ["Status",      <Select value={editingPlan.batch_status} onChange={(e: any) => setEditingPlan({ ...editingPlan, batch_status: e.target.value })}>{BATCH_STATUS.map(s => <option key={s}>{s}</option>)}</Select>],
          ] as [string, React.ReactNode][]).map(([label, input]) => (
            <Field key={label} label={label}>{input}</Field>
          ))}
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={handleSaveEdit} disabled={saving}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={{ background: "var(--color-anu-accent)", color: "#fff" }}>
            {saving ? t("common.saving") : t("plan.save")}
          </button>
          <button onClick={() => setEditingPlan(null)}
            className="px-6 py-2.5 rounded-lg text-sm border" style={cardStyle}>
            {t("plan.cancel")}
          </button>
        </div>
      </div>
    </div>
  );

  // ── Main Page ───────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/dashboard")}
            className="text-sm px-3 py-1.5 rounded-lg border" style={cardStyle}>
            ← {t("common.home")}
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-anu-text)" }}>
            🗓️ {t("plan.title")}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {([["view", t("plan.tab_view")], ["add", t("plan.tab_add")], ["manage", t("plan.tab_manage")]] as [string, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key as any)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition"
              style={tab === key
                ? { background: "var(--color-anu-accent)", color: "#fff" }
                : { ...cardStyle, border: "1px solid", color: "var(--color-anu-muted)" }}>
              {label}
            </button>
          ))}
        </div>

        {/* TAB: VIEW */}
        {tab === "view" && (
          <div>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer"
                     style={{ color: "var(--color-anu-muted)" }}>
                <input type="checkbox" checked={showFinished}
                       onChange={e => setShowFinished(e.target.checked)} />
                {t("plan.show_finished")}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"
                     style={{ color: "var(--color-anu-muted)" }}>
                <input type="checkbox" checked={showPlaning}
                       onChange={e => setShowPlaning(e.target.checked)} />
                {t("plan.show_planing")}
              </label>
            </div>
            {loading ? (
              <p style={{ color: "var(--color-anu-muted)" }}>{t("common.loading")}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--color-anu-border)" }}>
                <table className="text-xs" style={{ minWidth: "2400px" }}>
                  <thead>
                    <tr style={{ background: "var(--color-anu-elevated)" }}>
                      {TABLE_HEADERS.map(h => (
                        <th key={h} className="px-3 py-3 text-left font-medium whitespace-nowrap"
                            style={{ color: "var(--color-anu-muted)", borderBottom: "1px solid var(--color-anu-border)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.map((p, i) => (
                      <tr key={p.id}
                          style={{
                            background: i % 2 === 0 ? "var(--color-anu-surface)" : "var(--color-anu-void)",
                            borderTop: "1px solid var(--color-anu-border)",
                          }}>
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
                          <td key={ci} className="px-3 py-2.5 whitespace-nowrap"
                              style={{ color: ci <= 2 ? "var(--color-anu-text)" : "var(--color-anu-muted)" }}>
                            {val ?? "-"}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              background: p.batch_status === "Running"  ? "rgba(0,212,170,0.15)"   :
                                          p.batch_status === "Finished" ? "rgba(100,116,139,0.15)" :
                                          "rgba(124,92,255,0.15)",
                              color:      p.batch_status === "Running"  ? "var(--color-anu-success)" :
                                          p.batch_status === "Finished" ? "var(--color-anu-muted)"   :
                                          "var(--color-anu-glow)",
                            }}>
                            {p.batch_status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: "var(--color-anu-muted)" }}>
                          {p.batch_finish_date?.slice(0, 10) ?? "-"}
                        </td>
                      </tr>
                    ))}
                    {filteredPlans.length === 0 && (
                      <tr>
                        <td colSpan={25} className="px-4 py-8 text-center"
                            style={{ color: "var(--color-anu-muted)" }}>
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

        {/* TAB: ADD */}
        {tab === "add" && (
          <div className="rounded-xl border p-6" style={cardStyle}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Field label="Line"><Select value={form.line} onChange={(e: any) => setForm({ ...form, line: e.target.value })}>{PRODUCTION_LINES.map(l => <option key={l}>{l}</option>)}</Select></Field>
              <Field label="Batch *"><Input value={form.batch} onChange={(e: any) => setForm({ ...form, batch: e.target.value })} placeholder="เช่น H50126052" /></Field>
              <Field label="SAP Batch"><Input value={form.sap_batch} onChange={(e: any) => setForm({ ...form, sap_batch: e.target.value })} /></Field>
              <Field label="Prod. Order"><Input value={form.production_order} onChange={(e: any) => setForm({ ...form, production_order: e.target.value })} /></Field>
              <Field label="FERT Code"><Input value={form.fert_code} onChange={(e: any) => setForm({ ...form, fert_code: e.target.value })} /></Field>
              <Field label="Semi Code"><Input value={form.semifinish_code} onChange={(e: any) => setForm({ ...form, semifinish_code: e.target.value })} /></Field>
              <Field label="Item Qty (K)"><Input type="number" placeholder="0" value={form.item_qty_million} onChange={(e: any) => setForm({ ...form, item_qty_million: e.target.value })} /></Field>
              <Field label="Need AF Box"><Input type="number" placeholder="0" value={form.need_af_box} onChange={(e: any) => setForm({ ...form, need_af_box: e.target.value })} /></Field>
              <Field label="Customer"><Select value={form.customer_name} onChange={(e: any) => setForm({ ...form, customer_name: e.target.value })}>{CUSTOMER_NAMES.map(c => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Plan Finish"><Input type="date" value={form.planned_finish_date} onChange={(e: any) => setForm({ ...form, planned_finish_date: e.target.value })} /></Field>
              <Field label="To be Desp."><Input type="date" value={form.to_be_desp_on} onChange={(e: any) => setForm({ ...form, to_be_desp_on: e.target.value })} /></Field>
              <Field label="Metal Det."><Select value={form.metal_detector} onChange={(e: any) => setForm({ ...form, metal_detector: e.target.value })}>{METAL_OPTIONS.map(m => <option key={m}>{m}</option>)}</Select></Field>
              <Field label="Print Type"><Select value={form.print_type} onChange={(e: any) => setForm({ ...form, print_type: e.target.value })}><option>U</option><option>P</option></Select></Field>
              <Field label="Country"><Select value={form.country} onChange={(e: any) => setForm({ ...form, country: e.target.value })}>{COUNTRIES.map(c => <option key={c}>{c}</option>)}</Select></Field>
              <Field label="Box Packing"><Select value={form.box_packing} onChange={(e: any) => setForm({ ...form, box_packing: e.target.value })}>{BOX_PACKING.map(b => <option key={b}>{b}</option>)}</Select></Field>
              <Field label="Ink Cap"><Select value={form.ink_cap} onChange={(e: any) => setForm({ ...form, ink_cap: e.target.value })}>{INK_OPTIONS.map(i => <option key={i}>{i}</option>)}</Select></Field>
              <Field label="Roller Cap"><Input value={form.roller_des_cap} onChange={(e: any) => setForm({ ...form, roller_des_cap: e.target.value })} /></Field>
              <Field label="Ink Body"><Select value={form.ink_body} onChange={(e: any) => setForm({ ...form, ink_body: e.target.value })}>{INK_OPTIONS.map(i => <option key={i}>{i}</option>)}</Select></Field>
              <Field label="Roller Body"><Input value={form.roller_des_body} onChange={(e: any) => setForm({ ...form, roller_des_body: e.target.value })} /></Field>
              <Field label="Status"><Select value={form.batch_status} onChange={(e: any) => setForm({ ...form, batch_status: e.target.value })}>{BATCH_STATUS.map(s => <option key={s}>{s}</option>)}</Select></Field>
            </div>
            <button onClick={handleAdd} disabled={saving}
              className="mt-6 px-6 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: "var(--color-anu-accent)", color: "#fff" }}>
              {saving ? t("common.saving") : t("plan.add_save")}
            </button>
          </div>
        )}

        {/* TAB: MANAGE */}
        {tab === "manage" && (
          <div className="flex flex-col gap-4">

            {/* Running */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                 style={{ color: "var(--color-anu-success)" }}>
                {t("plan.running_section")} ({runningPlans.length})
              </p>
              {runningPlans.length === 0
                ? <p className="text-sm" style={{ color: "var(--color-anu-muted)" }}>{t("plan.no_running")}</p>
                : runningPlans.map(p => (
                    <div key={p.id}
                         className="rounded-xl border p-4 flex items-center justify-between mb-2"
                         style={cardStyle}>
                      <div>
                        <span className="font-semibold" style={{ color: "var(--color-anu-text)" }}>{t("plan.line_label")}: {p.line}</span>
                        <span className="mx-2" style={{ color: "var(--color-anu-border)" }}>|</span>
                        <span style={{ color: "var(--color-anu-text)" }}>{t("plan.batch_label")}: {p.batch}</span>
                        <span className="mx-2" style={{ color: "var(--color-anu-border)" }}>|</span>
                        <span style={{ color: "var(--color-anu-muted)" }}>{t("plan.fert_label")}: {p.fert_code}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)}
                          className="px-3 py-1.5 rounded-lg text-xs border"
                          style={cardStyle}>
                          📝 {t("common.edit")}
                        </button>
                        <button onClick={() => handleFinish(p.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: "var(--color-anu-accent)", color: "#fff" }}>
                          {t("plan.batch_complete")}
                        </button>
                      </div>
                    </div>
                  ))
              }
            </div>

            <div style={{ borderTop: "1px solid var(--color-anu-border)" }} />

            {/* Planing */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                 style={{ color: "var(--color-anu-glow)" }}>
                {t("plan.planing_section")} ({planingPlans.length})
              </p>
              {planingPlans.length === 0
                ? <p className="text-sm" style={{ color: "var(--color-anu-muted)" }}>{t("plan.no_planing")}</p>
                : planingPlans.map(p => (
                    <div key={p.id}
                         className="rounded-xl border p-4 flex items-center justify-between mb-2"
                         style={cardStyle}>
                      <div>
                        <span className="font-semibold" style={{ color: "var(--color-anu-text)" }}>{t("plan.line_label")}: {p.line}</span>
                        <span className="mx-2" style={{ color: "var(--color-anu-border)" }}>|</span>
                        <span style={{ color: "var(--color-anu-text)" }}>{t("plan.batch_label")}: {p.batch}</span>
                        <span className="mx-2" style={{ color: "var(--color-anu-border)" }}>|</span>
                        <span style={{ color: "var(--color-anu-muted)" }}>{t("plan.fert_label")}: {p.fert_code}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)}
                          className="px-3 py-1.5 rounded-lg text-xs border"
                          style={cardStyle}>
                          📝 {t("common.edit")}
                        </button>
                        <button onClick={() => handleStartRunning(p.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ background: "var(--color-anu-success)", color: "#fff" }}>
                          {t("plan.start_batch")}
                        </button>
                      </div>
                    </div>
                  ))
              }
            </div>

          </div>
        )}

      </div>
    </div>
  );
}