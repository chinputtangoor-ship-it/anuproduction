import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/supabase/server";
import { hardenApiRequest } from "@/lib/security/harden-route";

type RouteParams = { params: Promise<{ id: string }> };

function generatePassword(): string {
  const letters = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  let pwd = "";
  for (let i = 0; i < 2; i++) pwd += digits[Math.floor(Math.random() * digits.length)];
  for (let i = 0; i < 6; i++) pwd += letters[Math.floor(Math.random() * letters.length)];
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

export async function POST(request: Request, { params }: RouteParams) {
  const blocked = await hardenApiRequest(request, {
    bucket: "admin",
    methods: ["POST"],
    requireJson: false,
  });
  if (blocked) return blocked;

  const { profile } = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const newPassword = generatePassword();
  const admin = createAdminClient();

  const { error: authError } = await admin.auth.admin.updateUserById(id, {
    password: newPassword,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, password: newPassword });
}
