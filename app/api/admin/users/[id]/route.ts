import { NextResponse } from "next/server";
import type { UserRole } from "@/lib/auth/types";
import { DEPARTMENTS, isDepartment } from "@/lib/constants/departments";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/supabase/server";

const ROLES: UserRole[] = [
  "operator",
  "qc_technician",
  "production_operator",
  "warehouse_operator",
  "supervisor",
  "manager",
  "planner",
  "admin",
];

type RouteParams = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const { profile } = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return null;
  }
  return profile;
}

function parseDepartment(raw: unknown): string | null | "__invalid__" {
  if (raw == null || raw === "") return null;
  const value = String(raw);
  if (!isDepartment(value)) return "__invalid__";
  return value;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const adminProfile = await requireAdmin();
  if (!adminProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const fullname = String(body.fullname ?? "").trim();
  const username = String(body.username ?? "").trim().toLowerCase();
  const role = String(body.role ?? "operator") as UserRole;
  const department = parseDepartment(body.department);

  if (!fullname || !username) {
    return NextResponse.json({ error: "fullname and username are required" }, { status: 400 });
  }

  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (department === "__invalid__") {
    return NextResponse.json(
      { error: `Invalid department. Allowed: ${DEPARTMENTS.join(", ")}` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      fullname,
      username,
      role,
      department,
      emp_id: body.emp_id?.trim() || null,
      birth_date: body.birth_date || null,
      join_date: body.join_date || null,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const adminProfile = await requireAdmin();
  if (!adminProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  if (id === adminProfile.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("role, username").eq("id", id).single();

  if (target?.role === "admin" || target?.username === "admin") {
    return NextResponse.json({ error: "Cannot delete admin account" }, { status: 400 });
  }

  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
