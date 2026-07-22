import { NextResponse } from "next/server";
import { usernameToAuthEmail } from "@/lib/auth/email";
import { isValidUsername, sanitizeUsername } from "@/lib/auth/username";
import type { UserRole } from "@/lib/auth/types";
import { isValidPosition } from "@/lib/auth/permissions";
import { DEPARTMENTS, isDepartment } from "@/lib/constants/departments";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/supabase/server";
import { hardenApiRequest } from "@/lib/security/harden-route";

function adminConfigError(error: unknown) {
  const message = error instanceof Error ? error.message : "Server configuration error";
  if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    return "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY ใน .env.local (Supabase Dashboard → Settings → API → service_role)";
  }
  return message;
}

function parseDepartment(raw: unknown): string | null | "__invalid__" {
  if (raw == null || raw === "") return null;
  const value = String(raw);
  if (!isDepartment(value)) return "__invalid__";
  return value;
}

async function requireAdmin() {
  const { profile } = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return null;
  }
  return profile;
}

export async function GET(request: Request) {
  const blocked = await hardenApiRequest(request, {
    bucket: "admin",
    methods: ["GET"],
    requireJson: false,
  });
  if (blocked) return blocked;

  const adminProfile = await requireAdmin();
  if (!adminProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select(
        "id, username, fullname, emp_id, role, department, birth_date, join_date, must_change_password, is_active, created_at",
      )
      .order("fullname");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ users: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: adminConfigError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const blocked = await hardenApiRequest(request, {
    bucket: "admin",
    methods: ["POST"],
  });
  if (blocked) return blocked;

  const adminProfile = await requireAdmin();
  if (!adminProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const fullname = String(body.fullname ?? "").trim();
  const username = sanitizeUsername(String(body.username ?? ""));
  const password = String(body.password ?? "");
  const role = String(body.role ?? "operator") as UserRole;
  const department = parseDepartment(body.department);

  if (!fullname || !username || !password) {
    return NextResponse.json(
      { error: "fullname, username, and password are required" },
      { status: 400 },
    );
  }

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Username must be at least 3 characters (a-z, 0-9, ., _, - only)" },
      { status: 400 },
    );
  }

  if (!isValidPosition(role)) {
    return NextResponse.json({ error: "Invalid position" }, { status: 400 });
  }

  if ((role === "operator" || role === "supervisor") && !department) {
    return NextResponse.json(
      { error: "Department is required for operator and supervisor" },
      { status: 400 },
    );
  }

  if (department === "__invalid__") {
    return NextResponse.json(
      { error: `Invalid department. Allowed: ${DEPARTMENTS.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const admin = createAdminClient();

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: usernameToAuthEmail(username),
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create user" },
        { status: 400 },
      );
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: authData.user.id,
      username,
      fullname,
      emp_id: body.emp_id?.trim() || null,
      role,
      department,
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
  } catch (error) {
    return NextResponse.json({ error: adminConfigError(error) }, { status: 500 });
  }
}
