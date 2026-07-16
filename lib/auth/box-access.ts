import type { UserRole } from "@/lib/auth/types";

/** Roles allowed to edit box fields (matches boxes UPDATE RLS). */
export function canEditBox(role: UserRole): boolean {
  return [
    "admin",
    "manager",
    "supervisor",
    "operator",
    "production_operator",
    "qc_technician",
  ].includes(role);
}
