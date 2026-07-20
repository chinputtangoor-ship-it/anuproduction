import { NextResponse } from "next/server";
import { createClient, getSessionProfile } from "@/lib/supabase/server";

type Body = {
  action?: "check" | "claim" | "release";
  deviceId?: string;
  deviceLabel?: string;
};

/**
 * Single-session handshake.
 * - check: returns conflict if another device holds the session
 * - claim: take over (bump version) for this device
 * - release: clear session on logout
 */
export async function POST(request: Request) {
  const { profile } = await getSessionProfile();
  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Body;
  const action = body.action ?? "check";
  const deviceId = String(body.deviceId ?? "").trim();
  const deviceLabel = String(body.deviceLabel ?? "Browser").slice(0, 80);

  if ((action === "check" || action === "claim") && !deviceId) {
    return NextResponse.json({ error: "deviceId required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("profiles")
    .select("active_session_id, active_session_version, active_device_label")
    .eq("id", profile.id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? "Profile not found" }, { status: 400 });
  }

  const activeId = row.active_session_id as string | null;
  const version = Number(row.active_session_version ?? 0);

  if (action === "release") {
    await supabase
      .from("profiles")
      .update({
        active_session_id: null,
        active_device_label: null,
        session_updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
    return NextResponse.json({ ok: true });
  }

  if (action === "check") {
    if (!activeId || activeId === deviceId) {
      // No conflict — claim quietly if empty or same device
      const { data: claimed } = await supabase
        .from("profiles")
        .update({
          active_session_id: deviceId,
          active_device_label: deviceLabel,
          session_updated_at: new Date().toISOString(),
          // keep version if same device; bump only on first claim from empty
          active_session_version: activeId ? version : version + 1,
        })
        .eq("id", profile.id)
        .select("active_session_id, active_session_version")
        .single();

      return NextResponse.json({
        status: "ok",
        sessionId: claimed?.active_session_id ?? deviceId,
        version: claimed?.active_session_version ?? version + 1,
      });
    }

    return NextResponse.json({
      status: "conflict",
      otherDeviceLabel: row.active_device_label ?? "Other device",
      version,
    });
  }

  if (action === "claim") {
    const nextVersion = version + 1;
    const { data: claimed, error: claimError } = await supabase
      .from("profiles")
      .update({
        active_session_id: deviceId,
        active_session_version: nextVersion,
        active_device_label: deviceLabel,
        session_updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id)
      .select("active_session_id, active_session_version")
      .single();

    if (claimError) {
      return NextResponse.json({ error: claimError.message }, { status: 400 });
    }

    return NextResponse.json({
      status: "ok",
      sessionId: claimed?.active_session_id ?? deviceId,
      version: claimed?.active_session_version ?? nextVersion,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET() {
  const { profile } = await getSessionProfile();
  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("active_session_id, active_session_version")
    .eq("id", profile.id)
    .single();

  return NextResponse.json({
    sessionId: data?.active_session_id ?? null,
    version: data?.active_session_version ?? 0,
  });
}
