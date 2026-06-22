import type { UserRole } from "@/lib/auth/types";

export const FULL_ACCESS_ROLES: UserRole[] = ["admin", "supervisor", "manager"];

export const ROUTE_ROLES: Record<string, UserRole[]> = {
  "/dashboard": ["admin", "supervisor", "manager", "planner", "qc_technician", "production_operator", "warehouse_operator", "operator"],
  "/plan":        ["admin", "supervisor", "planner"],
  "/quality":     ["admin", "supervisor", "qc_technician"],
  "/record":      ["admin", "supervisor", "operator"],
  "/rejection":   ["admin", "supervisor", "operator"],
  "/backlog":     ["admin", "supervisor", "operator"],
  "/camera":      ["admin", "supervisor"],
  "/repass":      ["admin", "supervisor"],
  "/analytics":   ["admin", "supervisor"],
  "/boxes":       ["admin", "supervisor", "operator"],
  "/user":        ["admin"],
};

export function hasFullAccess(role: UserRole): boolean {
  return FULL_ACCESS_ROLES.includes(role);
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const allowed = ROUTE_ROLES[pathname];
  if (!allowed) return true;
  if (hasFullAccess(role)) return true;
  return allowed.includes(role);
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
