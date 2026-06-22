import type { SessionUser, UserRole } from "@/lib/auth/types";

export type ProfileRow = {
  id: string;
  username: string;
  fullname: string;
  role: UserRole;
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
    emp_id: profile.emp_id ?? null,
    first_login: profile.must_change_password ?? false,
  };
}

export const PROFILE_SELECT =
  "id, username, fullname, role, emp_id, must_change_password, is_active";
