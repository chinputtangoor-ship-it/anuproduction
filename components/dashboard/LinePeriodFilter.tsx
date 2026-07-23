"use client";

import { PRODUCTION_LINES } from "@/lib/constants/production";
import type { CustomRange, PeriodKey } from "@/lib/calculations/period";
import { todayIso } from "@/lib/calculations/period";
import { useI18n } from "@/lib/i18n/context";
import { sortByAsc } from "@/lib/sort/asc";

const PERIODS: PeriodKey[] = [
  "All",
  "Today",
  "Day shift (07-19)",
  "Night shift (19-07)",
  "Last 7 days",
  "Last 30 days",
  "Custom",
];

function periodLabel(p: PeriodKey, t: (k: string) => string): string {
  switch (p) {
    case "All":
      return t("analytics.period_all");
    case "Today":
      return t("analytics.period_today");
    case "Day shift (07-19)":
      return t("analytics.period_day_shift");
    case "Night shift (19-07)":
      return t("analytics.period_night_shift");
    case "Last 7 days":
      return t("analytics.period_7days");
    case "Last 30 days":
      return t("analytics.period_30days");
    case "Custom":
      return t("analytics.filter_custom");
  }
}

export function LinePeriodFilter({
  line,
  period,
  onLineChange,
  onPeriodChange,
  custom,
  onCustomChange,
}: {
  line: string;
  period: PeriodKey;
  onLineChange: (line: string) => void;
  onPeriodChange: (period: PeriodKey) => void;
  custom?: CustomRange;
  onCustomChange?: (next: CustomRange) => void;
}) {
  const { t } = useI18n();
  const today = todayIso();
  const range = custom ?? {
    start: today,
    end: today,
    startTime: "07:00",
    endTime: "19:00",
  };

  const inputStyle = {
    background: "var(--color-anu-elevated)",
    borderColor: "var(--color-anu-border)",
    color: "var(--color-anu-text)",
  };

  const periodsSorted = sortByAsc(PERIODS, (p) => periodLabel(p, t));

  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--color-anu-muted)" }}>
          {t("analytics.filter_line")}
          <select
            value={line}
            onChange={(e) => onLineChange(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none min-w-[120px] min-h-[44px]"
            style={inputStyle}
          >
            <option value="All">{t("analytics.period_all")}</option>
            {PRODUCTION_LINES.map((ln) => (
              <option key={ln} value={ln}>
                {ln}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--color-anu-muted)" }}>
          {t("analytics.filter_period")}
          <select
            value={period}
            onChange={(e) => onPeriodChange(e.target.value as PeriodKey)}
            className="rounded-lg border px-3 py-2 text-sm outline-none min-w-[160px] min-h-[44px]"
            style={inputStyle}
          >
            {periodsSorted.map((p) => (
              <option key={p} value={p}>
                {periodLabel(p, t)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {period === "Custom" && onCustomChange && (
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--color-anu-muted)" }}>
            {t("analytics.filter_from")}
            <div className="flex gap-2">
              <input
                type="date"
                value={range.start}
                onChange={(e) => onCustomChange({ ...range, start: e.target.value })}
                className="rounded-lg border px-3 py-2 text-sm outline-none min-h-[44px]"
                style={inputStyle}
              />
              <input
                type="time"
                value={range.startTime}
                onChange={(e) => onCustomChange({ ...range, startTime: e.target.value })}
                className="rounded-lg border px-3 py-2 text-sm outline-none min-h-[44px]"
                style={inputStyle}
              />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--color-anu-muted)" }}>
            {t("analytics.filter_to")}
            <div className="flex gap-2">
              <input
                type="date"
                value={range.end}
                onChange={(e) => onCustomChange({ ...range, end: e.target.value })}
                className="rounded-lg border px-3 py-2 text-sm outline-none min-h-[44px]"
                style={inputStyle}
              />
              <input
                type="time"
                value={range.endTime}
                onChange={(e) => onCustomChange({ ...range, endTime: e.target.value })}
                className="rounded-lg border px-3 py-2 text-sm outline-none min-h-[44px]"
                style={inputStyle}
              />
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
