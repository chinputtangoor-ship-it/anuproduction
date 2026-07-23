"use client";

import { PRODUCTION_LINES } from "@/lib/constants/production";
import {
  BATCH_STATUS,
  BOX_PACKING,
  COUNTRIES,
  CUSTOMER_NAMES,
  INK_OPTIONS,
  METAL_OPTIONS,
  type PlanFormValues,
} from "@/lib/constants/plan-form";
import { sortAsc } from "@/lib/sort/asc";

const inputStyle = {
  background: "var(--color-anu-elevated)",
  borderColor: "var(--color-anu-border)",
  color: "var(--color-anu-text)",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs" style={{ color: "var(--color-anu-muted)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="rounded-lg border px-3 py-2 text-sm outline-none w-full"
      style={inputStyle}
    />
  );
}

function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="rounded-lg border px-3 py-2 text-sm outline-none w-full"
      style={inputStyle}
    >
      {children}
    </select>
  );
}

type PlanFormFieldsProps = {
  values: PlanFormValues;
  onChange: (next: PlanFormValues) => void;
  readOnly?: boolean;
};

export function PlanFormFields({ values, onChange, readOnly = false }: PlanFormFieldsProps) {
  const set = <K extends keyof PlanFormValues>(key: K, val: PlanFormValues[K]) =>
    onChange({ ...values, [key]: val });

  const inputProps = readOnly ? { readOnly: true, disabled: true } : {};
  const selectProps = readOnly ? { disabled: true } : {};

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Field label="Line">
        <Select value={values.line} onChange={(e) => set("line", e.target.value)} {...selectProps}>
          {PRODUCTION_LINES.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </Select>
      </Field>

      <Field label="Size">
        <Input value={values.size} onChange={(e) => set("size", e.target.value)} {...inputProps} />
      </Field>

      <Field label="Batch *">
        <Input
          value={values.batch}
          onChange={(e) => set("batch", e.target.value)}
          placeholder="e.g. H50126052"
          {...inputProps}
        />
      </Field>

      <Field label="SAP Batch">
        <Input value={values.sap_batch} onChange={(e) => set("sap_batch", e.target.value)} {...inputProps} />
      </Field>

      <Field label="Prod. Order">
        <Input
          value={values.production_order}
          onChange={(e) => set("production_order", e.target.value)}
          {...inputProps}
        />
      </Field>

      <Field label="Insp. Lot">
        <Input value={values.inspection_lot} onChange={(e) => set("inspection_lot", e.target.value)} {...inputProps} />
      </Field>

      <Field label="Sales Order">
        <Input value={values.sales_order} onChange={(e) => set("sales_order", e.target.value)} {...inputProps} />
      </Field>

      <Field label="SO Item">
        <Input
          value={values.sales_order_item}
          onChange={(e) => set("sales_order_item", e.target.value)}
          {...inputProps}
        />
      </Field>

      <Field label="FERT Code">
        <Input value={values.fert_code} onChange={(e) => set("fert_code", e.target.value)} {...inputProps} />
      </Field>

      <Field label="Semi Code">
        <Input value={values.semifinish_code} onChange={(e) => set("semifinish_code", e.target.value)} {...inputProps} />
      </Field>

      <Field label="Item Qty (K)">
        <Input
          type="number"
          placeholder="0"
          value={values.item_qty_million}
          onChange={(e) => set("item_qty_million", e.target.value)}
          {...inputProps}
        />
      </Field>

      <Field label="Need AF Box">
        <Input
          type="number"
          placeholder="0"
          value={values.need_af_box}
          onChange={(e) => set("need_af_box", e.target.value)}
          {...inputProps}
        />
      </Field>

      <Field label="Customer">
        <Select
          value={values.customer_name}
          onChange={(e) => set("customer_name", e.target.value)}
          {...selectProps}
        >
          {CUSTOMER_NAMES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Field>

      <Field label="Country">
        <Select value={values.country} onChange={(e) => set("country", e.target.value)} {...selectProps}>
          {COUNTRIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Field>

      <Field label="Box Packing">
        <Select value={values.box_packing} onChange={(e) => set("box_packing", e.target.value)} {...selectProps}>
          {BOX_PACKING.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </Select>
      </Field>

      <Field label="Plan Finish">
        <Input
          type="date"
          value={values.planned_finish_date}
          onChange={(e) => set("planned_finish_date", e.target.value)}
          {...inputProps}
        />
      </Field>

      <Field label="To be Desp.">
        <Input
          type="date"
          value={values.to_be_desp_on}
          onChange={(e) => set("to_be_desp_on", e.target.value)}
          {...inputProps}
        />
      </Field>

      <Field label="Metal Det.">
        <Select
          value={values.metal_detector}
          onChange={(e) => set("metal_detector", e.target.value)}
          {...selectProps}
        >
          {METAL_OPTIONS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </Select>
      </Field>

      <Field label="Print">
        <Select value={values.print_type} onChange={(e) => set("print_type", e.target.value)} {...selectProps}>
          {sortAsc(["P", "U"]).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Ink Cap">
        <Select value={values.ink_cap} onChange={(e) => set("ink_cap", e.target.value)} {...selectProps}>
          {INK_OPTIONS.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </Select>
      </Field>

      <Field label="Roller Cap">
        <Input value={values.roller_des_cap} onChange={(e) => set("roller_des_cap", e.target.value)} {...inputProps} />
      </Field>

      <Field label="Ink Body">
        <Select value={values.ink_body} onChange={(e) => set("ink_body", e.target.value)} {...selectProps}>
          {INK_OPTIONS.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </Select>
      </Field>

      <Field label="Roller Body">
        <Input value={values.roller_des_body} onChange={(e) => set("roller_des_body", e.target.value)} {...inputProps} />
      </Field>

      <Field label="Status">
        <Select
          value={values.batch_status}
          onChange={(e) => set("batch_status", e.target.value)}
          {...selectProps}
        >
          {BATCH_STATUS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
