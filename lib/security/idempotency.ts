import { createAdminClient } from "@/lib/supabase/admin";

export const AUTH_SESSION_IDEMPOTENCY_SCOPE = "auth_session";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export function readIdempotencyKey(request: Request): string | null {
  const raw =
    request.headers.get("idempotency-key") ??
    request.headers.get("Idempotency-Key");
  if (!raw) return null;
  const key = raw.trim().slice(0, 128);
  if (!key || key.length < 8) return null;
  return key;
}

export async function getIdempotentResponse(params: {
  scope: string;
  userId: string;
  key: string;
}): Promise<{ status: number; body: unknown } | null> {
  try {
    const admin = createAdminClient();
    await admin
      .from("api_idempotency")
      .delete()
      .lt("expires_at", new Date().toISOString());

    const { data, error } = await admin
      .from("api_idempotency")
      .select("status_code, response_body, expires_at")
      .eq("scope", params.scope)
      .eq("user_id", params.userId)
      .eq("idempotency_key", params.key)
      .maybeSingle();

    if (error || !data) return null;

    if (new Date(data.expires_at as string).getTime() < Date.now()) {
      await admin
        .from("api_idempotency")
        .delete()
        .eq("scope", params.scope)
        .eq("user_id", params.userId)
        .eq("idempotency_key", params.key);
      return null;
    }

    return {
      status: Number(data.status_code),
      body: data.response_body,
    };
  } catch (e) {
    console.error("[idempotency] get", e);
    return null;
  }
}

export async function storeIdempotentResponse(params: {
  scope: string;
  userId: string;
  key: string;
  status: number;
  body: unknown;
  ttlMs?: number;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const ttl = params.ttlMs ?? DEFAULT_TTL_MS;
    const expiresAt = new Date(Date.now() + ttl).toISOString();

    await admin.from("api_idempotency").upsert(
      {
        scope: params.scope,
        user_id: params.userId,
        idempotency_key: params.key,
        status_code: params.status,
        response_body: params.body as object,
        expires_at: expiresAt,
      },
      { onConflict: "scope,user_id,idempotency_key" },
    );
  } catch (e) {
    console.error("[idempotency] store", e);
  }
}
