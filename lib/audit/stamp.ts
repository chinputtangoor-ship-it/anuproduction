/**
 * Auto-stamp helpers — every write should attribute the logged-in user id
 * (docs/decisions.md D4). Prefer these over free-typed names.
 */

export function withRecordedBy<T extends Record<string, unknown>>(
  payload: T,
  userId: string | null | undefined,
): T & { recorded_by?: string } {
  if (!userId) return payload;
  return { ...payload, recorded_by: userId };
}

export function withUpdatedBy<T extends Record<string, unknown>>(
  payload: T,
  userId: string | null | undefined,
): T & { updated_by?: string } {
  if (!userId) return payload;
  return { ...payload, updated_by: userId };
}

export function withCreatedBy<T extends Record<string, unknown>>(
  payload: T,
  userId: string | null | undefined,
): T & { created_by?: string; updated_by?: string } {
  if (!userId) return payload;
  return { ...payload, created_by: userId, updated_by: userId };
}

/** Actor stamp for Check by / Weight by / Inspector-style columns. */
export function withActorField<T extends Record<string, unknown>>(
  payload: T,
  field: string,
  userId: string | null | undefined,
): T {
  if (!userId) return payload;
  return { ...payload, [field]: userId };
}
