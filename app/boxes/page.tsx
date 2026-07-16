"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { canEditBox } from "@/lib/auth/box-access";
import {
  fetchBatchDetail,
  fetchBoxChangeLog,
  updateBoxWithHistory,
  type BatchBacklog,
  type BatchBox,
  type BatchPlan,
  type BatchRejection,
  type BoxChangeLog,
} from "@/lib/data/batch";
import {
  BOX_STATUS,
  DEFECT_LIST,
  statusNeedsDefect,
} from "@/lib/constants/production";
import { useI18n } from "@/lib/i18n/context";

const STATUS_COLORS: Record<string, string> = {
  AF: "var(--color-anu-success)",
  Sort: "var(--color-anu-warning)",
  PS: "#f97316",
  HP: "#3b82f6",
  HUP: "#6366f1",
  HFX: "#a855f7",
  Scrap: "var(--color-anu-danger)",
};

const FIELD_LABEL: Record<string, string> = {
  status: "Status",
  defects: "Defects",
  net_weight_kg: "Net (kg)",
  total_weight_kg: "Total (kg)",
  weight_by: "Weight by",
  check_by: "Check by",
};

function displayName(id: string | null | undefined, names: Record<string, string>) {
  if (!id) return "-";
  return names[id] || id.slice(0, 8);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return value.slice(0, 10);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return value.slice(0, 16).replace("T", " ");
}

export default function BoxesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, loading: authLoading } = useRequireAuth();

  const [searchBatch, setSearchBatch] = useState("");
  const [plan, setPlan] = useState<BatchPlan | null>(null);
  const [boxes, setBoxes] = useState<BatchBox[]>([]);
  const [rejections, setRejections] = useState<BatchRejection[]>([]);
  const [backlogs, setBacklogs] = useState<BatchBacklog[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedBox, setSelectedBox] = useState<BatchBox | null>(null);
  const [history, setHistory] = useState<BoxChangeLog[]>([]);
  const [historyNames, setHistoryNames] = useState<Record<string, string>>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const [editStatus, setEditStatus] = useState("");
  const [editDefects, setEditDefects] = useState("");
  const [netWeight, setNetWeight] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const canEdit = user ? canEditBox(user.role) : false;
  const cardStyle = {
    background: "var(--color-anu-surface)",
    borderColor: "var(--color-anu-border)",
  };

  if (authLoading || !user) return null;

  async function handleSearch() {
    if (!searchBatch.trim()) return;
    setLoading(true);
    setSearched(true);
    setErrorMsg("");
    setSelectedBox(null);
    setEditing(false);

    try {
      const detail = await fetchBatchDetail(searchBatch);
      setPlan(detail.plan);
      setBoxes(detail.boxes);
      setRejections(detail.rejections);
      setBacklogs(detail.backlogs);
      setNames(detail.names);
      if (!detail.plan && detail.boxes.length === 0) {
        setErrorMsg(t("boxes.batch_not_found", { batch: searchBatch.trim() }));
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function openBox(box: BatchBox) {
    setSelectedBox(box);
    setEditing(false);
    setSaveMsg("");
    setEditStatus(box.status);
    setEditDefects(box.defects || "");
    setNetWeight(box.net_weight_kg?.toString() ?? "");
    setTotalWeight(box.total_weight_kg?.toString() ?? "");
    setHistoryLoading(true);
    try {
      const { rows, names: hNames } = await fetchBoxChangeLog(box.id);
      setHistory(rows);
      setHistoryNames(hNames);
    } catch {
      setHistory([]);
      setHistoryNames({});
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleSaveEdit() {
    if (!selectedBox || !user) return;
    if (statusNeedsDefect(editStatus) && !editDefects.trim()) {
      setSaveMsg(t("boxes.defect_required"));
      return;
    }

    setSaving(true);
    setSaveMsg("");
    try {
      const updated = await updateBoxWithHistory(
        selectedBox,
        {
          status: editStatus,
          defects: statusNeedsDefect(editStatus) ? editDefects.trim() : null,
          net_weight_kg: netWeight !== "" ? parseFloat(netWeight) : null,
          total_weight_kg: totalWeight !== "" ? parseFloat(totalWeight) : null,
        },
        user.id,
      );

      setBoxes((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      setSelectedBox(updated);
      setNames((prev) => ({
        ...prev,
        ...(updated.weight_by ? { [updated.weight_by]: prev[updated.weight_by] || user.fullname } : {}),
        ...(updated.updated_by ? { [updated.updated_by]: prev[updated.updated_by] || user.fullname } : {}),
      }));

      const { rows, names: hNames } = await fetchBoxChangeLog(updated.id);
      setHistory(rows);
      setHistoryNames(hNames);
      setSaveMsg(t("boxes.save_success"));
      setEditing(false);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const afCount = boxes.filter((b) => b.status === "AF").length;
  const total = boxes.length;
  const afRate = total > 0 ? ((afCount / total) * 100).toFixed(1) : "0";

  const totalAts = rejections.reduce((s, r) => s + (r.ats_kg || 0), 0);
  const totalPrint = rejections.reduce((s, r) => s + (r.print_kg || 0), 0);
  const totalCam = rejections.reduce((s, r) => s + (r.cam_kg || 0), 0);
  const totalReject = rejections.reduce((s, r) => s + (r.total_kg || 0), 0);

  const latestBacklog = backlogs.length > 0 ? backlogs[backlogs.length - 1] : null;

  const PLAN_FIELDS: { label: string; value: string }[] = plan
    ? [
        { label: "Line", value: plan.line },
        { label: "Size", value: plan.size || "-" },
        { label: "Batch", value: plan.batch },
        { label: "SAP Batch", value: plan.sap_batch || "-" },
        { label: "Prod. Order", value: plan.production_order || "-" },
        { label: "Sales Order", value: plan.sales_order || "-" },
        { label: "SO Item", value: plan.sales_order_item || "-" },
        { label: "FERT Code", value: plan.fert_code || "-" },
        { label: "Semi Code", value: plan.semifinish_code || "-" },
        { label: "Plan Finish", value: formatDate(plan.planned_finish_date) },
        { label: "Start Date", value: formatDate(plan.created_at) },
        { label: "Finish Date", value: formatDate(plan.batch_finish_date) },
        { label: "Status", value: plan.batch_status || "-" },
      ]
    : [];

  return (
    <div className="w-full min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              if (selectedBox) {
                setSelectedBox(null);
                setEditing(false);
                return;
              }
              router.push("/dashboard");
            }}
            className="text-sm px-3 py-1.5 rounded-lg border"
            style={cardStyle}
          >
            <AppIcon name="arrowLeft" size={14} />{" "}
            {selectedBox ? t("boxes.back") : t("common.home")}
          </button>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-anu-text)" }}>
            {selectedBox
              ? t("boxes.box_detail", { box: String(selectedBox.box_number) })
              : t("boxes.title")}
          </h1>
        </div>

        {selectedBox ? (
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border p-6" style={cardStyle}>
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <p className="text-4xl font-black" style={{ color: "var(--color-anu-accent)" }}>
                    #{selectedBox.box_number}
                  </p>
                  <div>
                    <p className="text-xs" style={{ color: "var(--color-anu-muted)" }}>
                      {t("boxes.batch_label")}: {selectedBox.batch} · {selectedBox.line}
                    </p>
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${STATUS_COLORS[selectedBox.status] || "#64748b"}20`,
                        color: STATUS_COLORS[selectedBox.status] || "var(--color-anu-muted)",
                      }}
                    >
                      {selectedBox.status}
                    </span>
                    {selectedBox.defects && (
                      <p className="text-xs mt-1" style={{ color: "var(--color-anu-muted)" }}>
                        {t("boxes.defect_label")}: {selectedBox.defects}
                      </p>
                    )}
                  </div>
                </div>
                {canEdit && !editing && (
                  <button
                    onClick={() => {
                      setEditing(true);
                      setSaveMsg("");
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border"
                    style={{ borderColor: "var(--color-anu-glow)", color: "var(--color-anu-glow)" }}
                  >
                    <AppIcon name="pencil" size={14} /> {t("boxes.btn_edit")}
                  </button>
                )}
              </div>

              {!editing ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {[
                    ["Net (kg)", selectedBox.net_weight_kg ?? "-"],
                    ["Total (kg)", selectedBox.total_weight_kg ?? "-"],
                    ["Weight by", displayName(selectedBox.weight_by, names)],
                    ["Check by", displayName(selectedBox.check_by, names)],
                    ["Recorded", formatDateTime(selectedBox.recorded_at)],
                    ["Updated", formatDateTime(selectedBox.updated_at)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs" style={{ color: "var(--color-anu-muted)" }}>
                        {label}
                      </p>
                      <p style={{ color: "var(--color-anu-text)" }}>{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                        Status
                      </p>
                      <select
                        value={editStatus}
                        onChange={(e) => {
                          setEditStatus(e.target.value);
                          if (!statusNeedsDefect(e.target.value)) setEditDefects("");
                        }}
                        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                        style={{
                          background: "var(--color-anu-elevated)",
                          borderColor: "var(--color-anu-border)",
                          color: "var(--color-anu-text)",
                        }}
                      >
                        {BOX_STATUS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    {statusNeedsDefect(editStatus) && (
                      <div>
                        <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                          Defect
                        </p>
                        <select
                          value={editDefects}
                          onChange={(e) => setEditDefects(e.target.value)}
                          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                          style={{
                            background: "var(--color-anu-elevated)",
                            borderColor: "var(--color-anu-border)",
                            color: "var(--color-anu-text)",
                          }}
                        >
                          <option value="">{t("boxes.select_defect")}</option>
                          {DEFECT_LIST.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div>
                      <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                        {t("boxes.net_weight")}
                      </p>
                      <input
                        type="number"
                        step="0.001"
                        value={netWeight}
                        onChange={(e) => setNetWeight(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2.5 text-lg font-bold outline-none text-right"
                        style={{
                          background: "var(--color-anu-elevated)",
                          borderColor: "var(--color-anu-border)",
                          color: "var(--color-anu-text)",
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                        {t("boxes.total_weight")}
                      </p>
                      <input
                        type="number"
                        step="0.001"
                        value={totalWeight}
                        onChange={(e) => setTotalWeight(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2.5 text-lg font-bold outline-none text-right"
                        style={{
                          background: "var(--color-anu-elevated)",
                          borderColor: "var(--color-anu-border)",
                          color: "var(--color-anu-text)",
                        }}
                      />
                    </div>
                  </div>
                  {saveMsg && (
                    <p
                      className="text-sm"
                      style={{
                        color: saveMsg === t("boxes.save_success")
                          ? "var(--color-anu-success)"
                          : "var(--color-anu-danger)",
                      }}
                    >
                      {saveMsg}
                    </p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="px-6 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50"
                      style={{ background: "var(--color-anu-accent)", color: "#fff" }}
                    >
                      {saving ? t("boxes.saving") : t("boxes.save")}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setSaveMsg("");
                      }}
                      className="px-6 py-2.5 rounded-lg text-sm border"
                      style={cardStyle}
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border p-5" style={cardStyle}>
              <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-anu-text)" }}>
                {t("boxes.history_title")}
              </h2>
              {historyLoading ? (
                <p className="text-sm" style={{ color: "var(--color-anu-muted)" }}>
                  {t("common.loading")}
                </p>
              ) : history.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-anu-muted)" }}>
                  {t("boxes.history_empty")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "var(--color-anu-elevated)" }}>
                        {[
                          t("boxes.history_when"),
                          t("boxes.history_who"),
                          t("boxes.history_field"),
                          t("boxes.history_from"),
                          t("boxes.history_to"),
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left font-medium whitespace-nowrap"
                            style={{ color: "var(--color-anu-muted)" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((row) => (
                        <tr
                          key={row.id}
                          style={{ borderTop: "1px solid var(--color-anu-border)" }}
                        >
                          <td
                            className="px-3 py-2 whitespace-nowrap text-xs"
                            style={{ color: "var(--color-anu-muted)" }}
                          >
                            {formatDateTime(row.changed_at)}
                          </td>
                          <td className="px-3 py-2" style={{ color: "var(--color-anu-text)" }}>
                            {displayName(row.changed_by, { ...names, ...historyNames })}
                          </td>
                          <td className="px-3 py-2" style={{ color: "var(--color-anu-text)" }}>
                            {FIELD_LABEL[row.field_name] || row.field_name}
                          </td>
                          <td className="px-3 py-2 text-xs" style={{ color: "var(--color-anu-muted)" }}>
                            {row.old_value ?? "-"}
                          </td>
                          <td className="px-3 py-2 text-xs" style={{ color: "var(--color-anu-text)" }}>
                            {row.new_value ?? "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-3 mb-6">
              <input
                value={searchBatch}
                onChange={(e) => setSearchBatch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder={t("boxes.search_ph")}
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm outline-none"
                style={{
                  background: "var(--color-anu-elevated)",
                  borderColor: "var(--color-anu-border)",
                  color: "var(--color-anu-text)",
                }}
              />
              <button
                onClick={handleSearch}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: "var(--color-anu-accent)", color: "#fff" }}
              >
                <AppIcon name="search" size={16} />
                {t("boxes.search_btn")}
              </button>
            </div>

            {errorMsg && (
              <p className="mb-4 text-sm" style={{ color: "var(--color-anu-danger)" }}>
                {errorMsg}
              </p>
            )}

            {loading && (
              <p style={{ color: "var(--color-anu-muted)" }}>{t("boxes.searching")}</p>
            )}

            {searched && !loading && plan && (
              <div className="rounded-xl border p-5 mb-6" style={cardStyle}>
                <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-anu-text)" }}>
                  {t("boxes.plan_header")}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {PLAN_FIELDS.map((f) => (
                    <div key={f.label}>
                      <p className="text-xs" style={{ color: "var(--color-anu-muted)" }}>
                        {f.label}
                      </p>
                      <p className="text-sm font-medium" style={{ color: "var(--color-anu-text)" }}>
                        {f.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searched && !loading && boxes.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: t("boxes.summary_all_boxes"), value: total, color: "var(--color-anu-text)" },
                  { label: t("boxes.summary_af"), value: afCount, color: "var(--color-anu-success)" },
                  {
                    label: t("boxes.summary_af_rate"),
                    value: `${afRate}%`,
                    color:
                      parseFloat(afRate) >= 90
                        ? "var(--color-anu-success)"
                        : "var(--color-anu-warning)",
                  },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border p-4 text-center" style={cardStyle}>
                    <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                      {s.label}
                    </p>
                    <p className="text-2xl font-black" style={{ color: s.color }}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {searched && !loading && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-anu-muted)" }}>
                  {t("boxes.rejection_section", { batch: searchBatch.trim() })}
                </h2>
                {rejections.length === 0 ? (
                  <div className="rounded-xl border p-4 text-center text-sm" style={cardStyle}>
                    <span style={{ color: "var(--color-anu-success)" }}>{t("boxes.no_rejection")}</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {[
                        { label: t("boxes.rej_ats"), value: totalAts },
                        { label: t("boxes.rej_print"), value: totalPrint },
                        { label: t("boxes.rej_cam"), value: totalCam },
                        { label: t("boxes.rej_total"), value: totalReject, highlight: true },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl border p-4 text-center" style={cardStyle}>
                          <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                            {s.label}
                          </p>
                          <p
                            className="text-2xl font-black"
                            style={{
                              color: s.highlight
                                ? "var(--color-anu-danger)"
                                : "var(--color-anu-text)",
                            }}
                          >
                            {s.value.toFixed(3)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {searched && !loading && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--color-anu-muted)" }}>
                  {t("boxes.backlog_section", { batch: searchBatch.trim() })}
                </h2>
                {backlogs.length === 0 ? (
                  <div className="rounded-xl border p-4 text-center text-sm" style={cardStyle}>
                    <span style={{ color: "var(--color-anu-success)" }}>{t("boxes.no_backlog")}</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      {[
                        { label: t("boxes.bl_ats"), value: latestBacklog?.ats_box ?? 0 },
                        { label: t("boxes.bl_print"), value: latestBacklog?.print_box ?? 0 },
                        { label: t("boxes.bl_cam"), value: latestBacklog?.cam_box ?? 0 },
                        {
                          label: t("boxes.bl_total"),
                          value: latestBacklog?.total_backlog ?? 0,
                          highlight: true,
                        },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl border p-4 text-center" style={cardStyle}>
                          <p className="text-xs mb-1" style={{ color: "var(--color-anu-muted)" }}>
                            {s.label}
                          </p>
                          <p
                            className="text-2xl font-black"
                            style={{
                              color: s.highlight
                                ? "var(--color-anu-warning)"
                                : "var(--color-anu-text)",
                            }}
                          >
                            {s.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div
                      className="overflow-x-auto rounded-xl border"
                      style={{ borderColor: "var(--color-anu-border)" }}
                    >
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ background: "var(--color-anu-elevated)" }}>
                            {[
                              t("boxes.bl_col_no"),
                              t("boxes.bl_col_line"),
                              t("boxes.bl_ats"),
                              t("boxes.bl_print"),
                              t("boxes.bl_cam"),
                              t("boxes.bl_total"),
                              t("boxes.bl_col_recordedby"),
                              t("boxes.bl_col_date"),
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-3 text-left font-medium whitespace-nowrap"
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
                          {backlogs.map((row, i) => (
                            <tr
                              key={row.id}
                              style={{
                                background:
                                  i % 2 === 0
                                    ? "var(--color-anu-surface)"
                                    : "var(--color-anu-void)",
                                borderTop: "1px solid var(--color-anu-border)",
                              }}
                            >
                              <td className="px-4 py-3 text-xs" style={{ color: "var(--color-anu-muted)" }}>
                                {i + 1}
                              </td>
                              <td className="px-4 py-3 font-medium" style={{ color: "var(--color-anu-text)" }}>
                                {row.line}
                              </td>
                              <td className="px-4 py-3" style={{ color: "var(--color-anu-text)" }}>
                                {row.ats_box}
                              </td>
                              <td className="px-4 py-3" style={{ color: "var(--color-anu-text)" }}>
                                {row.print_box}
                              </td>
                              <td className="px-4 py-3" style={{ color: "var(--color-anu-text)" }}>
                                {row.cam_box}
                              </td>
                              <td
                                className="px-4 py-3 font-bold"
                                style={{ color: "var(--color-anu-warning)" }}
                              >
                                {row.total_backlog}
                              </td>
                              <td className="px-4 py-3 text-xs" style={{ color: "var(--color-anu-muted)" }}>
                                {displayName(row.recorded_by, names)}
                              </td>
                              <td
                                className="px-4 py-3 text-xs whitespace-nowrap"
                                style={{ color: "var(--color-anu-muted)" }}
                              >
                                {formatDateTime(row.recorded_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {searched && !loading && boxes.length > 0 && (
              <div
                className="overflow-x-auto rounded-xl border"
                style={{ borderColor: "var(--color-anu-border)" }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--color-anu-elevated)" }}>
                      {[
                        t("boxes.box_col_no"),
                        t("boxes.box_col_status"),
                        t("boxes.box_col_defects"),
                        t("boxes.box_col_net"),
                        t("boxes.box_col_total"),
                        t("boxes.box_col_weighby"),
                        t("boxes.box_col_checkby"),
                        "",
                      ].map((h, i) => (
                        <th
                          key={`${h}-${i}`}
                          className="px-4 py-3 text-left font-medium whitespace-nowrap"
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
                    {boxes.map((b, i) => (
                      <tr
                        key={b.id}
                        style={{
                          background:
                            i % 2 === 0 ? "var(--color-anu-surface)" : "var(--color-anu-void)",
                          borderTop: "1px solid var(--color-anu-border)",
                        }}
                      >
                        <td
                          className="px-4 py-3 font-black text-lg"
                          style={{ color: "var(--color-anu-accent)" }}
                        >
                          #{b.box_number}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-1 rounded-full text-xs font-bold"
                            style={{
                              background: `${STATUS_COLORS[b.status] || "#64748b"}20`,
                              color: STATUS_COLORS[b.status] || "var(--color-anu-muted)",
                            }}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--color-anu-muted)" }}>
                          {b.defects || "-"}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--color-anu-text)" }}>
                          {b.net_weight_kg ?? "-"}
                        </td>
                        <td className="px-4 py-3" style={{ color: "var(--color-anu-text)" }}>
                          {b.total_weight_kg ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--color-anu-muted)" }}>
                          {displayName(b.weight_by, names)}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: "var(--color-anu-muted)" }}>
                          {displayName(b.check_by, names)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openBox(b)}
                            className="px-3 py-1.5 rounded-lg text-xs border transition hover:opacity-80"
                            style={{
                              borderColor: "var(--color-anu-glow)",
                              color: "var(--color-anu-glow)",
                            }}
                          >
                            {t("boxes.btn_open")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
