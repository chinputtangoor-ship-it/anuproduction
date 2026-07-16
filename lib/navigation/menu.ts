import { canAccessMenuItem } from "@/lib/auth/roles";
import { canManageUsers, canSeeAllDepartments } from "@/lib/auth/permissions";
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
  /** Camera / Re-pass — supervisor+ only */
  approveOnly?: boolean;
  /** User admin — admin only */
  adminOnly?: boolean;
};

export type MenuSection = {
  sectionKey: string;
  icon: AppIconName;
  items: MenuItem[];
};

/** Cross-department links — plan is readable by all departments. */
export const GLOBAL_MENU_ITEMS: MenuItem[] = [
  { labelKey: "dashboard.plan", icon: "calendar", href: "/plan" },
];

/** Sidebar + dashboard navigation (visibility = department + position). */
export const APP_MENU: MenuSection[] = [
  {
    sectionKey: "nav.planner",
    icon: "calendar",
    items: [
      { labelKey: "dashboard.planner_dash", icon: "chart", href: "/dashboard/planner" },
    ],
  },
  {
    sectionKey: "nav.quality",
    icon: "scan",
    items: [
      { labelKey: "dashboard.quality_dash", icon: "chart", href: "/dashboard/quality" },
      { labelKey: "dashboard.qc_form", icon: "scan", href: "/quality" },
      { labelKey: "dashboard.box_grade", icon: "badgeCheck", href: "/quality/grade" },
    ],
  },
  {
    sectionKey: "nav.production",
    icon: "factory",
    items: [
      { labelKey: "dashboard.production_dash", icon: "chart", href: "/dashboard/production" },
    ],
  },
  {
    sectionKey: "nav.post_production",
    icon: "package",
    items: [
      { labelKey: "dashboard.post_dash", icon: "chart", href: "/analytics" },
      { labelKey: "dashboard.box_status", icon: "boxes", href: "/record" },
      { labelKey: "dashboard.batch_detail", icon: "search", href: "/boxes" },
      { labelKey: "dashboard.rejection", icon: "ban", href: "/rejection" },
      { labelKey: "dashboard.backlog", icon: "clock", href: "/backlog" },
      { labelKey: "dashboard.camera", icon: "camera", href: "/camera", approveOnly: true },
      { labelKey: "dashboard.repass", icon: "refresh", href: "/repass", approveOnly: true },
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
      { labelKey: "dashboard.user_account", icon: "userCog", href: "/user", adminOnly: true },
    ],
  },
];

export function getVisibleSections(
  role: UserRole,
  department?: Department | null,
): MenuSection[] {
  const withoutUser = APP_MENU.filter((s) => s.sectionKey !== "nav.user");
  const userSection = APP_MENU.find((s) => s.sectionKey === "nav.user");

  if (canSeeAllDepartments(role)) {
    const sections = [...withoutUser];
    if (userSection && canManageUsers(role)) sections.push(userSection);
    return sections;
  }

  if (!department) return [];

  const ownSection = DEPARTMENT_SECTION_KEY[department];
  return withoutUser.filter((s) => s.sectionKey === ownSection);
}

export function getVisibleMenuItems(section: MenuSection, role: UserRole): MenuItem[] {
  return section.items.filter((item) => canAccessMenuItem(item, role));
}
