import {
  getDeviceLabel,
  getOrCreateDeviceId,
  storeLocalSession,
} from "@/lib/auth/device";

export type SessionCheckResult =
  | { status: "ok"; sessionId: string; version: number }
  | { status: "conflict"; otherDeviceLabel?: string }
  | { status: "skipped" }
  | { status: "error"; message: string };

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function postSession(body: Record<string, unknown>): Promise<Response> {
  return fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": newIdempotencyKey(),
    },
    body: JSON.stringify(body),
  });
}

export async function checkOrClaimSession(): Promise<SessionCheckResult> {
  const deviceId = getOrCreateDeviceId();
  const deviceLabel = getDeviceLabel();

  const res = await postSession({ action: "check", deviceId, deviceLabel });

  const data = await res.json();
  if (!res.ok) {
    return { status: "error", message: data.error ?? "Session check failed" };
  }

  if (data.status === "conflict") {
    return {
      status: "conflict",
      otherDeviceLabel: data.otherDeviceLabel,
    };
  }

  storeLocalSession(data.sessionId ?? deviceId, Number(data.version ?? 1));
  return {
    status: "ok",
    sessionId: data.sessionId ?? deviceId,
    version: Number(data.version ?? 1),
  };
}

export async function claimSessionOnThisDevice(): Promise<SessionCheckResult> {
  const deviceId = getOrCreateDeviceId();
  const deviceLabel = getDeviceLabel();

  const res = await postSession({ action: "claim", deviceId, deviceLabel });

  const data = await res.json();
  if (!res.ok) {
    return { status: "error", message: data.error ?? "Claim failed" };
  }

  storeLocalSession(data.sessionId ?? deviceId, Number(data.version ?? 1));
  return {
    status: "ok",
    sessionId: data.sessionId ?? deviceId,
    version: Number(data.version ?? 1),
  };
}
