import { SESSION_STORAGE_KEY, type SessionUser, type UserRole } from "@/lib/auth/types";

const VALID_ROLES: UserRole[] = [
  "operator",
  "qc_technician",
  "production_operator",
  "warehouse_operator",
  "supervisor",
  "manager",
  "planner",
  "admin",
];

export function toSessionUser(raw: Record<string, unknown>): SessionUser | null {
  const id = raw.id;
  const username = raw.username;
  const fullname = raw.fullname;
  const role = raw.role;

  if (typeof id !== "string" || typeof username !== "string" || typeof fullname !== "string") {
    return null;
  }

  const safeRole = typeof role === "string" && VALID_ROLES.includes(role as UserRole)
    ? (role as UserRole)
    : "operator";

  return {
    id,
    username,
    fullname,
    role: safeRole,
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
