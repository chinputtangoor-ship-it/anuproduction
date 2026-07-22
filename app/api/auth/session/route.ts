import { NextResponse } from "next/server";
import { createClient, getSessionProfile } from "@/lib/supabase/server";
import { hardenApiRequest } from "@/lib/security/harden-route";
import {
  AUTH_SESSION_IDEMPOTENCY_SCOPE,
  getIdempotentResponse,
  readIdempotencyKey,
  storeIdempotentResponse,
} from "@/lib/security/idempotency";

type Body = {
  action?: "check" | "claim" | "release";
  deviceId?: string;
  deviceLabel?: string;
};

async function jsonResult(
  body: unknown,
  status: number,
  idempotency?: { userId: string; key: string } | null,
) {
  if (idempotency) {
    await storeIdempotentResponse({
      scope: AUTH_SESSION_IDEMPOTENCY_SCOPE,
      userId: idempotency.userId,
      key: idempotency.key,
      status,
      body,
    });
  }
  return NextResponse.json(body, { status });
}

/**
 * Single-session handshake.
 * - check: returns conflict if another device holds the session
 * - claim: take over (bump version) for this device
 * - release: clear session on logout
 */
export async function POST(request: Request) {
  const blocked = await hardenApiRequest(request, {
    bucket: "auth",
    methods: ["POST"],
  });
  if (blocked) return blocked;

  const { profile } = await getSessionProfile();
  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const idemKey = readIdempotencyKey(request);
  if (idemKey) {
    const cached = await getIdempotentResponse({
      scope: AUTH_SESSION_IDEMPOTENCY_SCOPE,
      userId: profile.id,
      key: idemKey,
    });
    if (cached) {
      return NextResponse.json(cached.body, { status: cached.status });
    }
  }

  const idempotency = idemKey ? { userId: profile.id, key: idemKey } : null;

  const body = (await request.json()) as Body;
  const action = body.action ?? "check";
  const deviceId = String(body.deviceId ?? "").trim();
  const deviceLabel = String(body.deviceLabel ?? "Browser").slice(0, 80);

  if ((action === "check" || action === "claim") && !deviceId) {
    return jsonResult({ error: "deviceId required" }, 400, idempotency);
  }

  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("profiles")
    .select("active_session_id, active_session_version, active_device_label")
    .eq("id", profile.id)
    .single();

  if (error || !row) {
    return jsonResult(
      { error: error?.message ?? "Profile not found" },
      400,
      idempotency,
    );
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
    return jsonResult({ ok: true }, 200, idempotency);
  }

  if (action === "check") {
    if (!activeId || activeId === deviceId) {
      const { data: claimed } = await supabase
        .from("profiles")
        .update({
          active_session_id: deviceId,
          active_device_label: deviceLabel,
          session_updated_at: new Date().toISOString(),
          active_session_version: activeId ? version : version + 1,
        })
        .eq("id", profile.id)
        .select("active_session_id, active_session_version")
        .single();

      return jsonResult(
        {
          status: "ok",
          sessionId: claimed?.active_session_id ?? deviceId,
          version: claimed?.active_session_version ?? version + 1,
        },
        200,
        idempotency,
      );
    }

    return jsonResult(
      {
        status: "conflict",
        otherDeviceLabel: row.active_device_label ?? "Other device",
        version,
      },
      200,
      idempotency,
    );
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
      return jsonResult({ error: claimError.message }, 400, idempotency);
    }

    return jsonResult(
      {
        status: "ok",
        sessionId: claimed?.active_session_id ?? deviceId,
        version: claimed?.active_session_version ?? nextVersion,
      },
      200,
      idempotency,
    );
  }

  return jsonResult({ error: "Unknown action" }, 400, idempotency);
}

export async function GET(request: Request) {
  const blocked = await hardenApiRequest(request, {
    bucket: "auth",
    methods: ["GET"],
    requireJson: false,
  });
  if (blocked) return blocked;

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
