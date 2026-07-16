"use client";

import { PRODUCTION_LINES } from "@/lib/constants/production";
import type { PeriodKey } from "@/lib/calculations/period";
import { useI18n } from "@/lib/i18n/context";

const PERIODS: PeriodKey[] = [
  "All",
  "Today",
  "Day shift (07-19)",
  "Night shift (19-07)",
  "Last 7 days",
  "Last 30 days",
];

export function LinePeriodFilter({
  line,
  period,
  onLineChange,
  onPeriodChange,
}: {
  line: string;
  period: PeriodKey;
  onLineChange: (line: string) => void;
  onPeriodChange: (period: PeriodKey) => void;
}) {
  const { t } = useI18n();
  const inputStyle = {
    background: "var(--color-anu-elevated)",
    borderColor: "var(--color-anu-border)",
    color: "var(--color-anu-text)",
  };

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--color-anu-muted)" }}>
        {t("analytics.filter_line")}
        <select
          value={line}
          onChange={(e) => onLineChange(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none min-w-[120px]"
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
          className="rounded-lg border px-3 py-2 text-sm outline-none min-w-[160px]"
          style={inputStyle}
        >
          {PERIODS.map((p) => (
            <option key={p} value={p}>
              {p === "All"
                ? t("analytics.period_all")
                : p === "Today"
                  ? t("analytics.period_today")
                  : p === "Day shift (07-19)"
                    ? t("analytics.period_day_shift")
                    : p === "Night shift (19-07)"
                      ? t("analytics.period_night_shift")
                      : p === "Last 7 days"
                        ? t("analytics.period_7days")
                        : t("analytics.period_30days")}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
