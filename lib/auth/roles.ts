import type { UserRole } from "@/lib/auth/types";
import {
  canAccessApproveOnlyRoutes,
  canManageUsers,
  canSeeAllDepartments,
} from "@/lib/auth/permissions";
import type { MenuItem } from "@/lib/navigation/menu";
import type { Department } from "@/lib/constants/departments";
import { menuKeyForPath } from "@/lib/auth/menu-catalog";

/** Map app routes → nav sectionKey (legacy helpers / docs). */
export const ROUTE_SECTION: Record<string, string> = {
  "/plan": "nav.planner",
  "/dashboard/planner": "nav.planner",
  "/quality": "nav.quality",
  "/quality/grade": "nav.quality",
  "/dashboard/quality": "nav.planner",
  "/dashboard/production": "nav.planner",
  "/dashboard/post-production": "nav.planner",
  "/record": "nav.post_production",
  "/rejection": "nav.post_production",
  "/backlog": "nav.post_production",
  "/camera": "nav.post_production",
  "/repass": "nav.post_production",
  "/analytics": "nav.planner",
  "/boxes": "nav.post_production",
  "/user": "nav.user",
  "/user/access": "nav.user",
  "/settings/features": "nav.user",
};

/** @deprecated use canSeeAllDepartments — sidebar no longer dept-scopes (D23) */
export const CROSS_DEPARTMENT_ROLES: UserRole[] = ["admin", "manager"];
export const FULL_ACCESS_ROLES: UserRole[] = CROSS_DEPARTMENT_ROLES;

export function hasFullAccess(role: UserRole): boolean {
  return canSeeAllDepartments(role);
}

/**
 * Legacy route check — Phase 11 prefers AccessProvider + grants.
 * Kept for non-UI callers; always allows login/dashboard/home hub.
 */
export function canAccessRoute(
  role: UserRole,
  pathname: string,
  _department?: Department | null,
): boolean {
  if (pathname === "/login" || pathname === "/dashboard") return true;

  const key = menuKeyForPath(pathname);
  if (key === "users" || key === "features" || key === "access_control") {
    return canManageUsers(role);
  }

  // Defer detailed grant checks to AccessProvider (async grants).
  if (key === "camera" || key === "repass") {
    return canAccessApproveOnlyRoutes(role);
  }

  return true;
}

/** @deprecated Prefer AccessProvider grants */
export function canAccessMenuItem(item: MenuItem, role: UserRole): boolean {
  if (item.adminOnly) return canManageUsers(role);
  return true;
}
