import { NextResponse } from "next/server";
import {
  FEATURE_FLAG_KEYS,
  FEATURE_REGISTRY,
  isFeatureFlagKey,
} from "@/lib/features/registry";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionProfile } from "@/lib/supabase/server";
import { hardenApiRequest } from "@/lib/security/harden-route";

async function requireAdmin() {
  const { profile } = await getSessionProfile();
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return null;
  }
  return profile;
}

export async function GET(request: Request) {
  const blocked = await hardenApiRequest(request, {
    bucket: "admin",
    methods: ["GET"],
    requireJson: false,
  });
  if (blocked) return blocked;

  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_feature_flags")
      .select("key, enabled, description, updated_by, updated_at")
      .in("key", [...FEATURE_FLAG_KEYS])
      .order("key");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const byKey = new Map((data ?? []).map((r) => [r.key, r]));
    const flags = FEATURE_REGISTRY.map((meta) => {
      const row = byKey.get(meta.key);
      return {
        key: meta.key,
        enabled: row ? Boolean(row.enabled) : meta.defaultEnabled,
        description: row?.description ?? null,
        updated_by: row?.updated_by ?? null,
        updated_at: row?.updated_at ?? null,
      };
    });

    return NextResponse.json({ flags });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const blocked = await hardenApiRequest(request, {
    bucket: "admin",
    methods: ["PATCH"],
  });
  if (blocked) return blocked;

  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const key = String(body.key ?? "");
  const enabled = Boolean(body.enabled);

  if (!isFeatureFlagKey(key)) {
    return NextResponse.json({ error: "Invalid feature key" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_feature_flags")
      .upsert(
        {
          key,
          enabled,
          updated_by: admin.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      )
      .select("key, enabled, updated_by, updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ flag: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
