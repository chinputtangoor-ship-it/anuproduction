/** Stable menu keys for Phase 11 grants (D23–D26). */

export const ACCESS_LEVELS = ["none", "read", "edit"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

export const GRANT_SCOPES = ["user", "department_position", "position"] as const;
export type GrantScope = (typeof GRANT_SCOPES)[number];

/** Grantable menu keys (User section is admin-hardcoded, not in grants). */
export const GRANTABLE_MENU_KEYS = [
  "ops_dashboard",
  "plan",
  "qc_form",
  "box_grade",
  "box_status",
  "batch_detail",
  "rejection",
  "backlog",
  "camera",
  "repass",
] as const;

export type GrantableMenuKey = (typeof GRANTABLE_MENU_KEYS)[number];

export const ADMIN_ONLY_MENU_KEYS = ["users", "features", "access_control"] as const;
export type AdminOnlyMenuKey = (typeof ADMIN_ONLY_MENU_KEYS)[number];

export type MenuKey = GrantableMenuKey | AdminOnlyMenuKey;

export const MENU_KEY_META: Record<
  MenuKey,
  { labelKey: string; sectionKey: string; href: string }
> = {
  ops_dashboard: {
    labelKey: "dashboard.planner_dash",
    sectionKey: "nav.planner",
    href: "/dashboard/planner",
  },
  plan: { labelKey: "dashboard.plan", sectionKey: "nav.planner", href: "/plan" },
  qc_form: { labelKey: "dashboard.qc_form", sectionKey: "nav.quality", href: "/quality" },
  box_grade: {
    labelKey: "dashboard.box_grade",
    sectionKey: "nav.quality",
    href: "/quality/grade",
  },
  box_status: {
    labelKey: "dashboard.box_status",
    sectionKey: "nav.post_production",
    href: "/record",
  },
  batch_detail: {
    labelKey: "dashboard.batch_detail",
    sectionKey: "nav.post_production",
    href: "/boxes",
  },
  rejection: {
    labelKey: "dashboard.rejection",
    sectionKey: "nav.post_production",
    href: "/rejection",
  },
  backlog: {
    labelKey: "dashboard.backlog",
    sectionKey: "nav.post_production",
    href: "/backlog",
  },
  camera: {
    labelKey: "dashboard.camera",
    sectionKey: "nav.post_production",
    href: "/camera",
  },
  repass: {
    labelKey: "dashboard.repass",
    sectionKey: "nav.post_production",
    href: "/repass",
  },
  users: { labelKey: "dashboard.user_account", sectionKey: "nav.user", href: "/user" },
  features: {
    labelKey: "dashboard.features",
    sectionKey: "nav.user",
    href: "/settings/features",
  },
  access_control: {
    labelKey: "dashboard.access_control",
    sectionKey: "nav.user",
    href: "/user/access",
  },
};

/** Longest-prefix match for nested routes. */
const ROUTE_TO_MENU: { prefix: string; menuKey: MenuKey }[] = [
  { prefix: "/dashboard/planner", menuKey: "ops_dashboard" },
  { prefix: "/dashboard/quality", menuKey: "ops_dashboard" },
  { prefix: "/dashboard/production", menuKey: "ops_dashboard" },
  { prefix: "/dashboard/post-production", menuKey: "ops_dashboard" },
  { prefix: "/analytics", menuKey: "ops_dashboard" },
  { prefix: "/plan", menuKey: "plan" },
  { prefix: "/quality/grade", menuKey: "box_grade" },
  { prefix: "/quality", menuKey: "qc_form" },
  { prefix: "/record", menuKey: "box_status" },
  { prefix: "/boxes", menuKey: "batch_detail" },
  { prefix: "/rejection", menuKey: "rejection" },
  { prefix: "/backlog", menuKey: "backlog" },
  { prefix: "/camera", menuKey: "camera" },
  { prefix: "/repass", menuKey: "repass" },
  { prefix: "/user/access", menuKey: "access_control" },
  { prefix: "/user", menuKey: "users" },
  { prefix: "/settings/features", menuKey: "features" },
];

export function menuKeyForPath(pathname: string): MenuKey | null {
  const path = pathname.split("?")[0] || pathname;
  for (const row of ROUTE_TO_MENU) {
    if (path === row.prefix || path.startsWith(`${row.prefix}/`)) {
      return row.menuKey;
    }
  }
  return null;
}

export function levelRank(level: AccessLevel): number {
  if (level === "edit") return 2;
  if (level === "read") return 1;
  return 0;
}

export function maxLevel(a: AccessLevel, b: AccessLevel): AccessLevel {
  return levelRank(a) >= levelRank(b) ? a : b;
}

export function isGrantableMenuKey(key: string): key is GrantableMenuKey {
  return (GRANTABLE_MENU_KEYS as readonly string[]).includes(key);
}
