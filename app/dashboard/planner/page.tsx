"use client";

import { OpsDashboard } from "@/components/dashboard/ops/OpsDashboard";
import { useI18n } from "@/lib/i18n/context";

export default function PlannerDashboardPage() {
  const { t } = useI18n();
  return <OpsDashboard title={t("dashboard.planner_dash")} icon="chart" />;
}
