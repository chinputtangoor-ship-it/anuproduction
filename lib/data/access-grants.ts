import { supabase } from "@/lib/supabase";
import type { AccessGrantRow } from "@/lib/auth/access";
import type { AccessLevel, GrantScope, GrantableMenuKey } from "@/lib/auth/menu-catalog";

const SELECT =
  "id, scope, user_id, department, position, menu_key, access_level, created_at, updated_at";

export async function fetchAccessGrants(): Promise<AccessGrantRow[]> {
  const { data, error } = await supabase
    .from("access_menu_grant")
    .select(SELECT)
    .order("menu_key");
  if (error) throw error;
  return (data ?? []) as AccessGrantRow[];
}

export type UpsertGrantInput = {
  scope: GrantScope;
  userId?: string | null;
  department?: string | null;
  position?: string | null;
  menuKey: GrantableMenuKey;
  accessLevel: Exclude<AccessLevel, "none">;
  actorId: string;
};

/** Replace grant for a target+menu (delete if level none handled by caller). */
export async function upsertAccessGrant(input: UpsertGrantInput): Promise<void> {
  const row = {
    scope: input.scope,
    user_id: input.scope === "user" ? input.userId ?? null : null,
    department: input.scope === "department_position" ? input.department ?? null : null,
    position:
      input.scope === "user" ? null : (input.position ?? null),
    menu_key: input.menuKey,
    access_level: input.accessLevel,
    created_by: input.actorId,
  };

  // Delete existing matching row then insert (works without unique conflict helpers)
  await deleteAccessGrant({
    scope: input.scope,
    userId: input.userId,
    department: input.department,
    position: input.position,
    menuKey: input.menuKey,
  });

  const { error } = await supabase.from("access_menu_grant").insert([row]);
  if (error) throw error;
}

export async function deleteAccessGrant(input: {
  scope: GrantScope;
  userId?: string | null;
  department?: string | null;
  position?: string | null;
  menuKey: GrantableMenuKey;
}): Promise<void> {
  let q = supabase
    .from("access_menu_grant")
    .delete()
    .eq("scope", input.scope)
    .eq("menu_key", input.menuKey);

  if (input.scope === "user") {
    q = q.eq("user_id", input.userId!);
  } else if (input.scope === "department_position") {
    q = q.eq("department", input.department!).eq("position", input.position!);
  } else {
    q = q.eq("position", input.position!).is("department", null);
  }

  const { error } = await q;
  if (error) throw error;
}

export async function saveAccessMatrix(input: {
  scope: GrantScope;
  userId?: string | null;
  department?: string | null;
  position?: string | null;
  levels: Partial<Record<GrantableMenuKey, AccessLevel>>;
  actorId: string;
}): Promise<void> {
  for (const [menuKey, level] of Object.entries(input.levels) as [
    GrantableMenuKey,
    AccessLevel,
  ][]) {
    if (!level || level === "none") {
      await deleteAccessGrant({
        scope: input.scope,
        userId: input.userId,
        department: input.department,
        position: input.position,
        menuKey,
      });
      continue;
    }
    await upsertAccessGrant({
      scope: input.scope,
      userId: input.userId,
      department: input.department,
      position: input.position,
      menuKey,
      accessLevel: level,
      actorId: input.actorId,
    });
  }
}
