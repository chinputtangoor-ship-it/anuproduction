import { SESSION_STORAGE_KEY, normalizeRole, type SessionUser, type UserRole } from "@/lib/auth/types";
import type { Department } from "@/lib/constants/departments";
import { isDepartment } from "@/lib/constants/departments";

export function toSessionUser(raw: Record<string, unknown>): SessionUser | null {
  const id = raw.id;
  const username = raw.username;
  const fullname = raw.fullname;

  if (typeof id !== "string" || typeof username !== "string" || typeof fullname !== "string") {
    return null;
  }

  const role = normalizeRole(typeof raw.role === "string" ? raw.role : undefined);
  const department =
    typeof raw.department === "string" && isDepartment(raw.department)
      ? (raw.department as Department)
      : null;

  return {
    id,
    username,
    fullname,
    role,
    department,
    emp_id: typeof raw.emp_id === "string" ? raw.emp_id : null,
    position: typeof raw.position === "string" ? raw.position : null,
    first_login: raw.first_login === true,
  };
}

export function readSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    return toSessionUser(parsed);
  } catch {
    return null;
  }
}

export function writeSessionUser(raw: Record<string, unknown>): SessionUser | null {
  const session = toSessionUser(raw);
  if (!session) return null;
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function clearSessionUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

export type { UserRole };
