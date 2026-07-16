import type { Department } from "@/lib/constants/departments";
import type { SessionUser, UserRole } from "@/lib/auth/types";

export type ProfileRow = {
  id: string;
  username: string;
  fullname: string;
  role: UserRole;
  department?: Department | null;
  emp_id?: string | null;
  must_change_password?: boolean;
  is_active?: boolean;
};

export function profileToSessionUser(profile: ProfileRow): SessionUser {
  return {
    id: profile.id,
    username: profile.username,
    fullname: profile.fullname,
    role: profile.role,
    department: profile.department ?? null,
    emp_id: profile.emp_id ?? null,
    first_login: profile.must_change_password ?? false,
  };
}

export const PROFILE_SELECT =
  "id, username, fullname, role, department, emp_id, must_change_password, is_active";
