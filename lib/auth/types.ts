import type { Department } from "@/lib/constants/departments";

export type UserRole =
  | "operator"
  | "qc_technician"
  | "production_operator"
  | "warehouse_operator"
  | "supervisor"
  | "manager"
  | "planner"
  | "admin";

/** Client-safe session — never store password_hash or other secrets. */
export type SessionUser = {
  id: string;
  username: string;
  fullname: string;
  role: UserRole;
  department?: Department | null;
  emp_id?: string | null;
  position?: string | null;
  first_login?: boolean;
};

export const SESSION_STORAGE_KEY = "anu_user";
