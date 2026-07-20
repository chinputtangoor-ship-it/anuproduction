import type { UserRole } from "@/lib/auth/types";
import {
  canAccessApproveOnlyRoutes,
  canManageUsers,
  canSeeAllDepartments,
} from "@/lib/auth/permissions";
import type { MenuItem } from "@/lib/navigation/menu";
import {
  DEPARTMENT_SECTION_KEY,
  type Department,
} from "@/lib/constants/departments";

/** Map app routes → nav sectionKey for department scoping. */
export const ROUTE_SECTION: Record<string, string> = {
  "/plan": "nav.planner",
  "/dashboard/planner": "nav.planner",
  "/quality": "nav.quality",
  "/quality/grade": "nav.quality",
  "/dashboard/quality": "nav.quality",
  "/dashboard/production": "nav.production",
  "/record": "nav.post_production",
  "/rejection": "nav.post_production",
  "/backlog": "nav.post_production",
  "/camera": "nav.post_production",
  "/repass": "nav.post_production",
  "/analytics": "nav.post_production",
  "/boxes": "nav.post_production",
  "/user": "nav.user",
  "/settings/features": "nav.user",
};

const APPROVE_ONLY_ROUTES = new Set(["/camera", "/repass"]);

/** @deprecated use canSeeAllDepartments */
export const CROSS_DEPARTMENT_ROLES: UserRole[] = ["admin", "manager"];
export const FULL_ACCESS_ROLES: UserRole[] = CROSS_DEPARTMENT_ROLES;

export function hasFullAccess(role: UserRole): boolean {
  return canSeeAllDepartments(role);
}

function matchesDepartment(pathname: string, department: Department): boolean {
  const section = ROUTE_SECTION[pathname];
  if (!section || section === "nav.user") return true;
  return section === DEPARTMENT_SECTION_KEY[department];
}

export function canAccessRoute(
  role: UserRole,
  pathname: string,
  department?: Department | null,
): boolean {
  if (pathname === "/login" || pathname === "/dashboard") return true;

  if (pathname === "/user" || pathname === "/settings/features") {
    return canManageUsers(role);
  }

  if (pathname === "/plan") return true;

  if (APPROVE_ONLY_ROUTES.has(pathname) && !canAccessApproveOnlyRoutes(role)) {
    return false;
  }

  if (canSeeAllDepartments(role)) return true;

  if (!department) return false;

  return matchesDepartment(pathname, department);
}

export function canAccessMenuItem(item: MenuItem, role: UserRole): boolean {
  if (item.adminOnly) return canManageUsers(role);
  if (item.approveOnly) return canAccessApproveOnlyRoutes(role);
  return true;
}
