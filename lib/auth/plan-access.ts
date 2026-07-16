import type { UserRole } from "@/lib/auth/types";

/** All authenticated users may view production plans (Phase 3). */
export function canViewPlan(_role: UserRole): boolean {
  return true;
}

/** Planner + admin/manager/supervisor may create/edit plans. */
export function canEditPlan(role: UserRole): boolean {
  return ["admin", "manager", "planner", "supervisor"].includes(role);
}
