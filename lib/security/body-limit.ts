import { NextResponse } from "next/server";

export const BODY_LIMIT = {
  auth: 32 * 1024,
  admin: 256 * 1024,
  bootstrap: 32 * 1024,
} as const;

/** Reject when Content-Length exceeds max. Returns a response to send, or null if OK. */
export function rejectIfBodyTooLarge(
  request: Request,
  maxBytes: number,
): NextResponse | null {
  const raw = request.headers.get("content-length");
  if (raw == null || raw === "") return null;

  const len = Number(raw);
  if (!Number.isFinite(len) || len < 0) {
    return NextResponse.json({ error: "Invalid Content-Length" }, { status: 400 });
  }

  if (len > maxBytes) {
    return NextResponse.json(
      { error: `Request body too large (max ${maxBytes} bytes)` },
      { status: 413 },
    );
  }

  return null;
}
