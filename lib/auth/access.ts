import type { Department } from "@/lib/constants/departments";
import type { UserRole } from "@/lib/auth/types";
import { canApprove, canManageUsers } from "@/lib/auth/permissions";
import {
  ADMIN_ONLY_MENU_KEYS,
  GRANTABLE_MENU_KEYS,
  type AccessLevel,
  type GrantableMenuKey,
  type MenuKey,
  levelRank,
  maxLevel,
  menuKeyForPath,
} from "@/lib/auth/menu-catalog";

export type AccessGrantRow = {
  id?: string;
  scope: "user" | "department_position" | "position";
  user_id: string | null;
  department: string | null;
  position: string | null;
  menu_key: string;
  access_level: "read" | "edit";
};

export type AccessSubject = {
  id: string;
  role: UserRole;
  department?: Department | null;
};

/** Legacy fallback when grants table empty / unavailable (mirrors seed intent). */
export function legacyAccessLevel(
  menuKey: MenuKey,
  role: UserRole,
  department?: Department | null,
): AccessLevel {
  if ((ADMIN_ONLY_MENU_KEYS as readonly string[]).includes(menuKey)) {
    return canManageUsers(role) ? "edit" : "none";
  }

  switch (menuKey as GrantableMenuKey) {
    case "plan":
      return canApprove(role) ? "edit" : "read";
    case "ops_dashboard":
      if (role === "admin" || role === "manager") return "read";
      if (department === "planner") return "read";
      return "none";
    case "qc_form":
    case "box_grade":
      if (role === "admin" || role === "manager") return "edit";
      if (department === "quality") return "edit";
      return "none";
    case "box_status":
    case "batch_detail":
    case "rejection":
    case "backlog":
      if (role === "admin" || role === "manager") return "edit";
      if (department === "post_production") return "edit";
      return "none";
    case "camera":
    case "repass":
      return canApprove(role) ? "edit" : "none";
    default:
      return "none";
  }
}

/**
 * Resolve access for one menu key (D26).
 * Priority: user > department+position (default layer) > position (factory-wide) > none.
 * Legacy fallback only when grants table is empty / unavailable.
 * Revoke = delete grant at that scope (no "none" rows stored).
 */
export function resolveMenuAccess(
  menuKey: MenuKey,
  subject: AccessSubject,
  grants: AccessGrantRow[],
): AccessLevel {
  if ((ADMIN_ONLY_MENU_KEYS as readonly string[]).includes(menuKey)) {
    return canManageUsers(subject.role) ? "edit" : "none";
  }

  if (!isGrantable(menuKey)) return "none";

  // Empty table → bootstrapping / migration not applied
  if (grants.length === 0) {
    return legacyAccessLevel(menuKey, subject.role, subject.department);
  }

  // No department → cannot match dept+position layer (D28)
  const forKey = grants.filter((g) => g.menu_key === menuKey);

  const userRows = forKey.filter(
    (g) => g.scope === "user" && g.user_id === subject.id,
  );
  if (userRows.length > 0) {
    return foldLevels(userRows);
  }

  if (subject.department) {
    const deptPosRows = forKey.filter(
      (g) =>
        g.scope === "department_position" &&
        g.department === subject.department &&
        g.position === subject.role,
    );
    if (deptPosRows.length > 0) {
      return foldLevels(deptPosRows);
    }
  }

  const posRows = forKey.filter(
    (g) => g.scope === "position" && g.position === subject.role,
  );
  if (posRows.length > 0) {
    return foldLevels(posRows);
  }

  return "none";
}

function foldLevels(rows: AccessGrantRow[]): AccessLevel {
  return rows.reduce<AccessLevel>(
    (acc, r) => maxLevel(acc, r.access_level),
    "none",
  );
}

function isGrantable(key: MenuKey): key is GrantableMenuKey {
  return (GRANTABLE_MENU_KEYS as readonly string[]).includes(key);
}

export function resolveAllAccess(
  subject: AccessSubject,
  grants: AccessGrantRow[],
): Record<MenuKey, AccessLevel> {
  const keys = [
    ...GRANTABLE_MENU_KEYS,
    ...ADMIN_ONLY_MENU_KEYS,
  ] as MenuKey[];
  const out = {} as Record<MenuKey, AccessLevel>;
  for (const key of keys) {
    out[key] = resolveMenuAccess(key, subject, grants);
  }
  return out;
}

export function canReadAccess(level: AccessLevel): boolean {
  return levelRank(level) >= 1;
}

export function canEditAccess(level: AccessLevel): boolean {
  return level === "edit";
}

export function canAccessPathWithGrants(
  pathname: string,
  subject: AccessSubject,
  grants: AccessGrantRow[],
): boolean {
  if (pathname === "/login" || pathname === "/dashboard") return true;
  const key = menuKeyForPath(pathname);
  if (!key) return true;
  return canReadAccess(resolveMenuAccess(key, subject, grants));
}

/** Effective level for grants targeting a specific admin UI subject (not current user). */
export function resolveGrantsForTarget(
  menuKey: GrantableMenuKey,
  target: {
    scope: AccessGrantRow["scope"];
    userId?: string | null;
    department?: string | null;
    position?: string | null;
  },
  grants: AccessGrantRow[],
): AccessLevel {
  const forKey = grants.filter((g) => g.menu_key === menuKey);
  if (target.scope === "user" && target.userId) {
    const rows = forKey.filter((g) => g.scope === "user" && g.user_id === target.userId);
    return rows.length ? foldLevels(rows) : "none";
  }
  if (target.scope === "department_position") {
    const rows = forKey.filter(
      (g) =>
        g.scope === "department_position" &&
        g.department === target.department &&
        g.position === target.position,
    );
    return rows.length ? foldLevels(rows) : "none";
  }
  const rows = forKey.filter(
    (g) => g.scope === "position" && g.position === target.position,
  );
  return rows.length ? foldLevels(rows) : "none";
}
