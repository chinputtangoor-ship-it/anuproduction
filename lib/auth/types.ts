/** Four shop-floor positions — access is combined with `department`. */
export type UserRole = "admin" | "manager" | "supervisor" | "operator";

export const POSITIONS: UserRole[] = ["admin", "manager", "supervisor", "operator"];

const LEGACY_ROLE_MAP: Record<string, UserRole> = {
  admin: "admin",
  manager: "manager",
  supervisor: "supervisor",
  operator: "operator",
  planner: "operator",
  qc_technician: "operator",
  production_operator: "operator",
  warehouse_operator: "operator",
};

/** Map legacy DB roles to the four positions (app layer). */
export function normalizeRole(role: string | null | undefined): UserRole {
  if (!role) return "operator";
  return LEGACY_ROLE_MAP[role] ?? "operator";
}

/** Client-safe session — never store password_hash or other secrets. */
export type SessionUser = {
  id: string;
  username: string;
  fullname: string;
  role: UserRole;
  department?: import("@/lib/constants/departments").Department | null;
  emp_id?: string | null;
  position?: string | null;
  first_login?: boolean;
};

export const SESSION_STORAGE_KEY = "anu_user";
