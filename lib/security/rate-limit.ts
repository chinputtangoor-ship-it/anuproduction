import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp } from "@/lib/security/client-ip";

export type RateLimitBucket = "auth" | "admin" | "bootstrap";

const BUCKET_CONFIG: Record<
  RateLimitBucket,
  { windowSeconds: number; maxHits: number }
> = {
  // GET /api/auth/session polls every 15s; factory WiFi shares one IP.
  auth: { windowSeconds: 60, maxHits: 300 },
  admin: { windowSeconds: 60, maxHits: 120 },
  bootstrap: { windowSeconds: 3600, maxHits: 10 },
};

type RpcResult = {
  allowed?: boolean;
  remaining?: number;
  retry_after?: number;
};

/**
 * Fixed-window rate limit via Supabase RPC (D30).
 * Subject = IP (and optional user suffix when known).
 * On infra failure: allow the request (fail-open) so production is not bricked.
 */
export async function rejectIfRateLimited(
  request: Request,
  bucket: RateLimitBucket,
  options?: { userId?: string | null },
): Promise<NextResponse | null> {
  const { windowSeconds, maxHits } = BUCKET_CONFIG[bucket];
  const ip = getClientIp(request);
  const subject = options?.userId
    ? `ip:${ip}|user:${options.userId}`
    : `ip:${ip}`;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_and_increment_rate_limit", {
      p_bucket: bucket,
      p_subject: subject,
      p_window_seconds: windowSeconds,
      p_max_hits: maxHits,
    });

    if (error) {
      console.error("[rate-limit] rpc error", error.message);
      return null;
    }

    const result = (data ?? {}) as RpcResult;
    if (result.allowed === false) {
      const retry = Math.max(1, Number(result.retry_after ?? 60));
      return NextResponse.json(
        { error: "Too many requests", retry_after: retry },
        {
          status: 429,
          headers: { "Retry-After": String(retry) },
        },
      );
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "rate limit error";
    console.error("[rate-limit]", message);
  }

  return null;
}
