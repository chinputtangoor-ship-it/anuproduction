import {
  canAccessMenuItem,
  canAccessSection,
  hasFullAccess,
} from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/types";

export type MenuItem = {
  labelKey: string;
  icon: string;
  href: string;
  roles?: UserRole[];
};

export type MenuSection = {
  sectionKey: string;
  icon: string;
  roles?: UserRole[];
  items: MenuItem[];
};

/** Single source of truth for sidebar + dashboard navigation. */
export const APP_MENU: MenuSection[] = [
  {
    sectionKey: "nav.planner",
    roles: ["admin", "supervisor", "planner"],
    icon: "🗓️",
    items: [{ labelKey: "dashboard.plan", icon: "🗓️", href: "/plan" }],
  },
  {
    sectionKey: "nav.quality",
    icon: "🔍",
    roles: ["admin", "supervisor", "qc_technician"],
    items: [{ labelKey: "dashboard.qc_form", icon: "🔍", href: "/quality" }],
  },
  {
    sectionKey: "nav.production",
    icon: "🏭",
    roles: ["admin", "supervisor", "production_operator"],
    items: [],
  },
  {
    sectionKey: "nav.post_production",
    roles: ["admin", "supervisor", "operator"],
    icon: "📦",
    items: [
      { labelKey: "dashboard.box_status", icon: "📦", href: "/record" },
      { labelKey: "dashboard.rejection", icon: "🗑️", href: "/rejection" },
      { labelKey: "dashboard.backlog", icon: "⏳", href: "/backlog" },
      { labelKey: "dashboard.camera", icon: "📷", href: "/camera", roles: ["admin", "supervisor"] },
      { labelKey: "dashboard.repass", icon: "🔄", href: "/repass", roles: ["admin", "supervisor"] },
      { labelKey: "dashboard.analytics", icon: "📈", href: "/analytics", roles: ["admin", "supervisor"] },
    ],
  },
  {
    sectionKey: "nav.warehouse",
    icon: "🏗️",
    roles: ["admin", "supervisor", "warehouse_operator"],
    items: [],
  },
  {
    sectionKey: "nav.human_resources",
    icon: "🧑",
    roles: ["admin", "supervisor"],
    items: [],
  },
  {
    sectionKey: "nav.account",
    icon: "💰",
    roles: ["admin", "supervisor"],
    items: [],
  },
  {
    sectionKey: "nav.user",
    icon: "👥",
    roles: ["admin"],
    items: [{ labelKey: "dashboard.user_account", icon: "👥", href: "/user", roles: ["admin"] }],
  },
];

export function getVisibleSections(role: UserRole): MenuSection[] {
  return APP_MENU.filter((section) => {
    if (section.sectionKey === "nav.user") {
      return section.roles?.includes(role) ?? false;
    }
    return hasFullAccess(role) || canAccessSection(section.roles, role);
  });
}

export function getVisibleMenuItems(section: MenuSection, role: UserRole): MenuItem[] {
  return section.items.filter((item) => canAccessMenuItem(item.roles, section.roles, role));
}
