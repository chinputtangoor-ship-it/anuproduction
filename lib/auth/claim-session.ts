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

export async function checkOrClaimSession(): Promise<SessionCheckResult> {
  const deviceId = getOrCreateDeviceId();
  const deviceLabel = getDeviceLabel();

  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "check", deviceId, deviceLabel }),
  });

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

  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "claim", deviceId, deviceLabel }),
  });

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
