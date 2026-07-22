import { canManageUsers } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/auth/types";
import type { AccessLevel, MenuKey } from "@/lib/auth/menu-catalog";
import { canReadAccess } from "@/lib/auth/access";
import type { AppIconName } from "@/lib/icons/app-icons";

export type MenuItem = {
  labelKey: string;
  icon: AppIconName;
  href: string;
  menuKey: MenuKey;
  adminOnly?: boolean;
};

export type MenuSection = {
  sectionKey: string;
  icon: AppIconName;
  items: MenuItem[];
};

/**
 * Sidebar catalog — D23: all department headers visible.
 * Plan lives under Planner (not next to Home).
 * Sub-items filtered by Phase 11 grants.
 */
export const APP_MENU: MenuSection[] = [
  {
    sectionKey: "nav.planner",
    icon: "calendar",
    items: [
      {
        labelKey: "dashboard.planner_dash",
        icon: "chart",
        href: "/dashboard/planner",
        menuKey: "ops_dashboard",
      },
      {
        labelKey: "dashboard.plan",
        icon: "calendar",
        href: "/plan",
        menuKey: "plan",
      },
    ],
  },
  {
    sectionKey: "nav.quality",
    icon: "scan",
    items: [
      { labelKey: "dashboard.qc_form", icon: "scan", href: "/quality", menuKey: "qc_form" },
      {
        labelKey: "dashboard.box_grade",
        icon: "badgeCheck",
        href: "/quality/grade",
        menuKey: "box_grade",
      },
    ],
  },
  {
    sectionKey: "nav.production",
    icon: "factory",
    items: [],
  },
  {
    sectionKey: "nav.post_production",
    icon: "package",
    items: [
      {
        labelKey: "dashboard.box_status",
        icon: "boxes",
        href: "/record",
        menuKey: "box_status",
      },
      {
        labelKey: "dashboard.batch_detail",
        icon: "search",
        href: "/boxes",
        menuKey: "batch_detail",
      },
      {
        labelKey: "dashboard.rejection",
        icon: "ban",
        href: "/rejection",
        menuKey: "rejection",
      },
      { labelKey: "dashboard.backlog", icon: "clock", href: "/backlog", menuKey: "backlog" },
      {
        labelKey: "dashboard.camera",
        icon: "camera",
        href: "/camera",
        menuKey: "camera",
      },
      {
        labelKey: "dashboard.repass",
        icon: "refresh",
        href: "/repass",
        menuKey: "repass",
      },
    ],
  },
  {
    sectionKey: "nav.warehouse",
    icon: "warehouse",
    items: [],
  },
  {
    sectionKey: "nav.human_resources",
    icon: "users",
    items: [],
  },
  {
    sectionKey: "nav.account",
    icon: "wallet",
    items: [],
  },
  {
    sectionKey: "nav.user",
    icon: "userCog",
    items: [
      {
        labelKey: "dashboard.user_account",
        icon: "userCog",
        href: "/user",
        menuKey: "users",
        adminOnly: true,
      },
      {
        labelKey: "dashboard.features",
        icon: "sliders",
        href: "/settings/features",
        menuKey: "features",
        adminOnly: true,
      },
      {
        labelKey: "dashboard.access_control",
        icon: "sliders",
        href: "/user/access",
        menuKey: "access_control",
        adminOnly: true,
      },
    ],
  },
];

/** @deprecated Plan moved under Planner — empty for Home strip. */
export const GLOBAL_MENU_ITEMS: MenuItem[] = [];

/** D23: everyone sees all department sections; User = admin only. */
export function getVisibleSections(role: UserRole): MenuSection[] {
  const withoutUser = APP_MENU.filter((s) => s.sectionKey !== "nav.user");
  const userSection = APP_MENU.find((s) => s.sectionKey === "nav.user");
  if (canManageUsers(role) && userSection) {
    return [...withoutUser, userSection];
  }
  return withoutUser;
}

export function getVisibleMenuItems(
  section: MenuSection,
  getAccess: (menuKey: MenuKey) => AccessLevel,
): MenuItem[] {
  return section.items.filter((item) => {
    if (item.adminOnly && !canReadAccess(getAccess(item.menuKey))) return false;
    return canReadAccess(getAccess(item.menuKey));
  });
}
