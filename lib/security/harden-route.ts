import { NextResponse } from "next/server";
import { BODY_LIMIT, rejectIfBodyTooLarge } from "@/lib/security/body-limit";
import {
  rejectIfRateLimited,
  type RateLimitBucket,
} from "@/lib/security/rate-limit";
import { rejectIfFirewallBlocks } from "@/lib/security/request-firewall";

export type HardenOptions = {
  bucket: RateLimitBucket;
  methods: readonly string[];
  /** Override default body limit for the bucket. */
  maxBodyBytes?: number;
  requireJson?: boolean;
};

/**
 * Shared guard for /api/auth · /api/admin · /api/setup/bootstrap (D31).
 * Returns a response to return immediately, or null to continue.
 */
export async function hardenApiRequest(
  request: Request,
  options: HardenOptions,
): Promise<NextResponse | null> {
  const fw = rejectIfFirewallBlocks(request, options.methods, {
    requireJson: options.requireJson,
  });
  if (fw) return fw;

  const maxBytes = options.maxBodyBytes ?? BODY_LIMIT[options.bucket];
  const method = request.method.toUpperCase();
  if (method !== "GET") {
    const body = rejectIfBodyTooLarge(request, maxBytes);
    if (body) return body;
  }

  return rejectIfRateLimited(request, options.bucket);
}
