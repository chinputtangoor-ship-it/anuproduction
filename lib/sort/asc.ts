/** Ascending string compare for dropdown / picker options (A→Z, numeric-aware). */

export function compareAsc(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/** Copy + sort strings ascending. */
export function sortAsc<T extends string>(items: readonly T[]): T[] {
  return [...items].sort(compareAsc);
}

/** Copy + sort objects by a string key ascending. */
export function sortByAsc<T>(items: readonly T[], key: (item: T) => string): T[] {
  return [...items].sort((a, b) => compareAsc(key(a), key(b)));
}
