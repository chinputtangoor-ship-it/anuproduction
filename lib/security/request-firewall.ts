import { NextResponse } from "next/server";

const JSON_METHODS = new Set(["POST", "PUT", "PATCH"]);

/**
 * Light firewall: method allowlist, JSON content-type for write methods,
 * Origin vs Host when Origin is present (browser calls).
 */
export function rejectIfFirewallBlocks(
  request: Request,
  allowedMethods: readonly string[],
  options?: { requireJson?: boolean },
): NextResponse | null {
  const method = request.method.toUpperCase();
  const allowed = allowedMethods.map((m) => m.toUpperCase());

  if (!allowed.includes(method)) {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const requireJson = options?.requireJson ?? JSON_METHODS.has(method);
  if (requireJson && JSON_METHODS.has(method)) {
    const ct = (request.headers.get("content-type") ?? "").toLowerCase();
    if (!ct.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 415 },
      );
    }
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const hostHeader = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
      const host = hostHeader?.split(",")[0]?.trim().split(":")[0];
      const originHostname = originHost.split(":")[0];

      if (host && originHostname && host !== originHostname) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        if (appUrl) {
          const allowedHost = new URL(appUrl).host.split(":")[0];
          if (originHostname === allowedHost) return null;
        }
        return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  return null;
}
