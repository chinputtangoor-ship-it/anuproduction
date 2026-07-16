import type { UserRole } from "@/lib/auth/types";
import { POSITIONS, normalizeRole } from "@/lib/auth/types";

export { POSITIONS, normalizeRole };

/** admin — full access including User management */
export function canManageUsers(role: UserRole): boolean {
  return role === "admin";
}

/** admin + manager — see every department */
export function canSeeAllDepartments(role: UserRole): boolean {
  return role === "admin" || role === "manager";
}

/** admin + manager + supervisor — plan manage, batch approve, camera/repass, box corrections */
export function canApprove(role: UserRole): boolean {
  return role === "admin" || role === "manager" || role === "supervisor";
}

/** All positions may view production plans */
export function canViewPlan(_role: UserRole): boolean {
  return true;
}

/** Plan create / edit / manage batches */
export function canEditPlan(role: UserRole): boolean {
  return canApprove(role);
}

/** Batch detail: edit grade / defect / weight (approve-level) */
export function canEditBox(role: UserRole): boolean {
  return canApprove(role);
}

/** Camera & Re-pass screens */
export function canAccessApproveOnlyRoutes(role: UserRole): boolean {
  return canApprove(role);
}

export function isValidPosition(role: string): role is UserRole {
  return POSITIONS.includes(role as UserRole);
}
