import {
  canAccessMenuItem,
  canAccessSection,
  canSeeAllDepartments,
  hasFullAccess,
} from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/types";
import {
  DEPARTMENT_SECTION_KEY,
  type Department,
} from "@/lib/constants/departments";
import type { AppIconName } from "@/lib/icons/app-icons";

export type MenuItem = {
  labelKey: string;
  icon: AppIconName;
  href: string;
  roles?: UserRole[];
};

export type MenuSection = {
  sectionKey: string;
  icon: AppIconName;
  roles?: UserRole[];
  items: MenuItem[];
};

/** Cross-department links (Phase 3: plan is read-only for all departments). */
export const GLOBAL_MENU_ITEMS: MenuItem[] = [
  { labelKey: "dashboard.plan", icon: "calendar", href: "/plan" },
];

/** Single source of truth for sidebar + dashboard navigation. */
export const APP_MENU: MenuSection[] = [
  {
    sectionKey: "nav.planner",
    roles: ["admin", "supervisor", "manager", "planner"],
    icon: "calendar",
    items: [
      { labelKey: "dashboard.planner_dash", icon: "chart", href: "/dashboard/planner" },
    ],
  },
  {
    sectionKey: "nav.quality",
    icon: "scan",
    roles: ["admin", "supervisor", "manager", "qc_technician"],
    items: [
      { labelKey: "dashboard.quality_dash", icon: "chart", href: "/dashboard/quality" },
      { labelKey: "dashboard.qc_form", icon: "scan", href: "/quality" },
      { labelKey: "dashboard.box_grade", icon: "badgeCheck", href: "/quality/grade" },
    ],
  },
  {
    sectionKey: "nav.production",
    icon: "factory",
    roles: ["admin", "supervisor", "manager", "production_operator"],
    items: [
      { labelKey: "dashboard.production_dash", icon: "chart", href: "/dashboard/production" },
    ],
  },
  {
    sectionKey: "nav.post_production",
    roles: ["admin", "supervisor", "manager", "operator"],
    icon: "package",
    items: [
      { labelKey: "dashboard.post_dash", icon: "chart", href: "/analytics" },
      { labelKey: "dashboard.box_status", icon: "boxes", href: "/record" },
      { labelKey: "dashboard.batch_detail", icon: "search", href: "/boxes" },
      { labelKey: "dashboard.rejection", icon: "ban", href: "/rejection" },
      { labelKey: "dashboard.backlog", icon: "clock", href: "/backlog" },
      { labelKey: "dashboard.camera", icon: "camera", href: "/camera", roles: ["admin", "supervisor", "manager"] },
      { labelKey: "dashboard.repass", icon: "refresh", href: "/repass", roles: ["admin", "supervisor", "manager"] },
    ],
  },
  {
    sectionKey: "nav.warehouse",
    icon: "warehouse",
    roles: ["admin", "supervisor", "manager", "warehouse_operator"],
    items: [],
  },
  {
    sectionKey: "nav.human_resources",
    icon: "users",
    roles: ["admin", "supervisor", "manager"],
    items: [],
  },
  {
    sectionKey: "nav.account",
    icon: "wallet",
    roles: ["admin", "supervisor", "manager"],
    items: [],
  },
  {
    sectionKey: "nav.user",
    icon: "userCog",
    roles: ["admin"],
    items: [{ labelKey: "dashboard.user_account", icon: "userCog", href: "/user", roles: ["admin"] }],
  },
];

export function getVisibleSections(
  role: UserRole,
  department?: Department | null,
): MenuSection[] {
  const byRole = APP_MENU.filter((section) => {
    if (section.sectionKey === "nav.user") {
      return section.roles?.includes(role) ?? false;
    }
    return hasFullAccess(role) || canAccessSection(section.roles, role);
  });

  // admin / manager → every department
  if (canSeeAllDepartments(role)) {
    return byRole;
  }

  // supervisor (and others): only own department when set
  if (department) {
    const ownSection = DEPARTMENT_SECTION_KEY[department];
    return byRole.filter(
      (section) =>
        section.sectionKey === ownSection || section.sectionKey === "nav.user",
    );
  }

  // supervisor without department → do not expose all sections
  if (role === "supervisor") {
    return [];
  }

  return byRole;
}

export function getVisibleMenuItems(section: MenuSection, role: UserRole): MenuItem[] {
  return section.items.filter((item) => canAccessMenuItem(item.roles, section.roles, role));
}
