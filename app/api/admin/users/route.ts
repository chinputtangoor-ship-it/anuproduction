import { NextResponse } from "next/server";
import { usernameToAuthEmail } from "@/lib/auth/email";
import type { UserRole } from "@/lib/auth/types";
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

async function requireAdmin() {
  const { profile } = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return null;
  }
  return profile;
}

export async function GET() {
  const adminProfile = await requireAdmin();
  if (!adminProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, username, fullname, emp_id, role, birth_date, join_date, must_change_password, is_active, created_at")
    .order("fullname");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ users: data ?? [] });
}

export async function POST(request: Request) {
  const adminProfile = await requireAdmin();
  if (!adminProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const fullname = String(body.fullname ?? "").trim();
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = String(body.role ?? "operator") as UserRole;

  if (!fullname || !username || !password) {
    return NextResponse.json({ error: "fullname, username, and password are required" }, { status: 400 });
  }

  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: usernameToAuthEmail(username),
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "Failed to create user" }, { status: 400 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    username,
    fullname,
    emp_id: body.emp_id?.trim() || null,
    role,
    birth_date: body.birth_date || null,
    join_date: body.join_date || null,
    must_change_password: true,
    is_active: true,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    user: { username, password, fullname },
  });
}
