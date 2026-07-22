"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardSkeleton } from "@/components/ui/Skeleton";

/** D24 — Ops Dashboard lives under Planner only. */
export default function ProductionDashboardRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/planner");
  }, [router]);
  return <DashboardSkeleton />;
}
