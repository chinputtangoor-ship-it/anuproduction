import { NextResponse } from "next/server";
import { usernameToAuthEmail } from "@/lib/auth/email";
import { createAdminClient } from "@/lib/supabase/admin";

type BootstrapBody = {
  token?: string;
  username?: string;
  password?: string;
  fullname?: string;
  emp_id?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as BootstrapBody;
  const expectedToken = process.env.ANU_BOOTSTRAP_TOKEN;

  if (!expectedToken || body.token !== expectedToken) {
    return NextResponse.json({ error: "Invalid bootstrap token" }, { status: 403 });
  }

  const username = body.username?.trim().toLowerCase();
  const password = body.password;
  const fullname = body.fullname?.trim();

  if (!username || !password || !fullname) {
    return NextResponse.json({ error: "username, password, and fullname are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { count } = await admin.from("profiles").select("*", { count: "exact", head: true });
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Bootstrap already completed" }, { status: 409 });
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: usernameToAuthEmail(username),
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? "Failed to create auth user" }, { status: 400 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: authData.user.id,
    username,
    fullname,
    emp_id: body.emp_id?.trim() || null,
    role: "admin",
    must_change_password: false,
    is_active: true,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    username,
    message: "Admin account created. You can now log in.",
  });
}
