"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardSkeleton } from "@/components/ui/Skeleton";

/** Legacy URL — Ops Dashboard is under Planner (D24). */
export default function AnalyticsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/planner");
  }, [router]);
  return <DashboardSkeleton />;
}
