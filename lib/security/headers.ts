/** Phase 12 — security header values (CSP Report-Only first — D32). */

function supabaseOrigins(): { https: string; wss: string } {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  try {
    const u = new URL(raw);
    const https = u.origin;
    const wss = `${u.protocol === "https:" ? "wss" : "ws"}://${u.host}`;
    return { https, wss };
  } catch {
    return { https: "", wss: "" };
  }
}

/** Report-Only CSP — does not block; allows Next + Supabase + PWA workers. */
export function buildCspReportOnly(): string {
  const { https, wss } = supabaseOrigins();
  const connect = ["'self'", https, wss].filter(Boolean).join(" ");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // Next.js / React often need inline + eval in practice; Report-Only only.
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    `connect-src ${connect}`,
    "media-src 'self' blob:",
  ].join("; ");
}

export function securityHeaders(): { key: string; value: string }[] {
  const headers: { key: string; value: string }[] = [
    { key: "Content-Security-Policy-Report-Only", value: buildCspReportOnly() },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Camera page is form-based (no getUserMedia today); keep camera=(self) for future.
    {
      key: "Permissions-Policy",
      value: "camera=(self), microphone=(), geolocation=(), payment=()",
    },
  ];

  if (process.env.NODE_ENV === "production") {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains",
    });
  }

  return headers;
}
