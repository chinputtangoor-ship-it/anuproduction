export type QcFieldDef = {
  key: string;
  unit?: string;
  type?: "number" | "text" | "select";
  options?: string[];
};

export type QcSectionDef = {
  id: string;
  icon: string;
  color: string;
  fields: QcFieldDef[];
};

export const QC_SECTIONS: QcSectionDef[] = [
  {
    id: "dimension",
    icon: "📐",
    color: "#7C5CFF",
    fields: [
      { key: "dim_length", unit: "mm", type: "number" },
      { key: "dim_width", unit: "mm", type: "number" },
      { key: "dim_height", unit: "mm", type: "number" },
    ],
  },
  {
    id: "outside_dimension",
    icon: "📏",
    color: "#4EA8DE",
    fields: [
      { key: "out_length", unit: "mm", type: "number" },
      { key: "out_width", unit: "mm", type: "number" },
      { key: "out_height", unit: "mm", type: "number" },
    ],
  },
  {
    id: "thickness",
    icon: "🔲",
    color: "#F59E0B",
    fields: [
      { key: "thk_top", unit: "mm", type: "number" },
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
      { key: "weight_net", unit: "g", type: "number" },
    ],
  },
  {
    id: "attribute",
    icon: "🏷️",
    color: "#8B5CF6",
    fields: [
      { key: "attr_color", type: "text" },
      { key: "attr_texture", type: "text" },
      { key: "attr_result", type: "select", options: ["Pass", "Fail", "Hold"] },
    ],
  },
  {
    id: "defect",
    icon: "⚠️",
    color: "#EF4444",
    fields: [
      { key: "defect_type", type: "text" },
      { key: "defect_qty", type: "number" },
      { key: "defect_note", type: "text" },
    ],
  },
];

export function emptyQcFormValues(): Record<string, string> {
  return QC_SECTIONS.reduce<Record<string, string>>((acc, section) => {
    section.fields.forEach((field) => {
      acc[field.key] = "";
    });
    return acc;
  }, {});
}
