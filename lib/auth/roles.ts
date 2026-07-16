import type { UserRole } from "@/lib/auth/types";
import {
  DEPARTMENT_SECTION_KEY,
  type Department,
} from "@/lib/constants/departments";

/** Roles that see every department in the menu / routes. Supervisor is NOT included. */
export const CROSS_DEPARTMENT_ROLES: UserRole[] = ["admin", "manager"];

/** @deprecated use canSeeAllDepartments */
export const FULL_ACCESS_ROLES: UserRole[] = CROSS_DEPARTMENT_ROLES;

export const ROUTE_ROLES: Record<string, UserRole[]> = {
  "/dashboard": ["admin", "supervisor", "manager", "planner", "qc_technician", "production_operator", "warehouse_operator", "operator"],
  "/plan": [
    "admin",
    "supervisor",
    "manager",
    "planner",
    "qc_technician",
    "production_operator",
    "warehouse_operator",
    "operator",
  ],
  "/quality": ["admin", "supervisor", "manager", "qc_technician"],
  "/quality/grade": ["admin", "supervisor", "manager", "qc_technician"],
  "/record": ["admin", "supervisor", "manager", "operator"],
  "/rejection": ["admin", "supervisor", "manager", "operator"],
  "/backlog": ["admin", "supervisor", "manager", "operator"],
  "/camera": ["admin", "supervisor", "manager"],
  "/repass": ["admin", "supervisor", "manager"],
  "/analytics": ["admin", "supervisor", "manager", "operator"],
  "/boxes": ["admin", "supervisor", "manager", "operator"],
  "/dashboard/planner": ["admin", "supervisor", "manager", "planner"],
  "/dashboard/quality": ["admin", "supervisor", "manager", "qc_technician"],
  "/dashboard/production": ["admin", "supervisor", "manager", "production_operator"],
  "/user": ["admin"],
};

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
};

export function canSeeAllDepartments(role: UserRole): boolean {
  return CROSS_DEPARTMENT_ROLES.includes(role);
}

export function hasFullAccess(role: UserRole): boolean {
  return canSeeAllDepartments(role);
}

export function canAccessRoute(
  role: UserRole,
  pathname: string,
  department?: Department | null,
): boolean {
  const allowed = ROUTE_ROLES[pathname];
  if (allowed) {
    const roleOk = hasFullAccess(role) || allowed.includes(role);
    if (!roleOk) return false;
  }

  if (pathname === "/dashboard" || pathname === "/login") return true;

  // Phase 3: every authenticated role may view production plans (read-only for non-editors).
  if (pathname === "/plan") return true;

  if (canSeeAllDepartments(role)) return true;

  // supervisor must stay inside own department routes
  if (role === "supervisor") {
    if (!department) return false;
    const section = ROUTE_SECTION[pathname];
    if (!section) return true;
    return section === DEPARTMENT_SECTION_KEY[department];
  }

  // other roles with department: keep inside own section when mapped
  if (department) {
    const section = ROUTE_SECTION[pathname];
    if (section && section !== DEPARTMENT_SECTION_KEY[department] && section !== "nav.user") {
      // allow if role still grants and path is not cross-dept restricted beyond role lists
      // Operators etc. already limited by ROUTE_ROLES; only enforce when they have a department
      return section === DEPARTMENT_SECTION_KEY[department];
    }
  }

  return true;
}

export function canAccessSection(sectionRoles: UserRole[] | undefined, role: UserRole): boolean {
  if (!sectionRoles) return true;
  if (hasFullAccess(role)) return true;
  return sectionRoles.includes(role);
}

export function canAccessMenuItem(
  itemRoles: UserRole[] | undefined,
  sectionRoles: UserRole[] | undefined,
  role: UserRole,
): boolean {
  if (itemRoles) return hasFullAccess(role) || itemRoles.includes(role);
  return canAccessSection(sectionRoles, role);
}
