const DEVICE_KEY = "anu_device_id";

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Stable per-browser device id for single-session claims. */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return randomId();
  }
}

export function getDeviceLabel(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPad/i.test(ua)) return "iOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac/i.test(ua)) return "Mac";
  return "Browser";
}

export const LOCAL_SESSION_KEY = "anu_active_session";

export function storeLocalSession(sessionId: string, version: number) {
  try {
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ sessionId, version }));
  } catch {
    /* ignore */
  }
}

export function readLocalSession(): { sessionId: string; version: number } | null {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { sessionId?: string; version?: number };
    if (!parsed.sessionId || parsed.version == null) return null;
    return { sessionId: parsed.sessionId, version: parsed.version };
  } catch {
    return null;
  }
}

export function clearLocalSession() {
  try {
    localStorage.removeItem(LOCAL_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
