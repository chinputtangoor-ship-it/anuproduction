import { NextResponse } from "next/server";
import { getSessionProfile } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { supabase, profile } = await getSessionProfile();

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const newPassword = body.password as string;
  const confirmPassword = body.confirm as string;

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", profile.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
