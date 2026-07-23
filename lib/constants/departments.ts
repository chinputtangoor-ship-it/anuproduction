import { sortAsc } from "@/lib/sort/asc";

/** Shop-floor departments — extra field alongside `role` (docs/decisions.md D5). */
export const DEPARTMENTS = sortAsc([
  "planner",
  "quality",
  "production",
  "post_production",
  "warehouse",
  "human_resources",
  "account",
] as const);

export type Department = (typeof DEPARTMENTS)[number];

export function isDepartment(value: string): value is Department {
  return (DEPARTMENTS as readonly string[]).includes(value);
}

/** Maps department → sidebar sectionKey (`nav.*`). */
export const DEPARTMENT_SECTION_KEY: Record<Department, string> = {
  planner: "nav.planner",
  quality: "nav.quality",
  production: "nav.production",
  post_production: "nav.post_production",
  warehouse: "nav.warehouse",
  human_resources: "nav.human_resources",
  account: "nav.account",
};
