"use client";

import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAccess } from "@/lib/auth/AccessProvider";
import { getVisibleMenuItems, getVisibleSections } from "@/lib/navigation/menu";
import { useI18n } from "@/lib/i18n/context";
import { PageSkeleton } from "@/components/ui/Skeleton";

export default function DashboardPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, loading } = useRequireAuth();
  const { getAccess, loading: accessLoading } = useAccess();

  if (loading || !user || accessLoading) return <PageSkeleton />;

  const visibleSections = getVisibleSections(user.role);

  return (
    <div
      className="p-6 lg:p-10"
      style={{ background: "var(--color-anu-void)", minHeight: "100%" }}
    >
      <div className="mb-10">
        <p className="text-sm mb-1" style={{ color: "var(--color-anu-muted)" }}>
          {t("dashboard.welcome")}
        </p>
        <h2 className="text-3xl font-bold" style={{ color: "var(--color-anu-text)" }}>
          {user.fullname}
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-anu-glow)" }}>
          {user.role}
          {user.department ? ` · ${t(`department.${user.department}`)}` : ""}
        </p>
      </div>

      <div className="flex flex-col gap-10">
        {visibleSections.map((section) => {
          const visibleItems = getVisibleMenuItems(section, getAccess);
          const catalogEmpty = section.items.length === 0;

          return (
            <div key={section.sectionKey}>
              <div className="flex items-center gap-3 mb-4">
                <AppIcon name={section.icon} size={16} className="opacity-70" />
                <p
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "var(--color-anu-muted)" }}
                >
                  {t(section.sectionKey)}
                </p>
                <div className="flex-1 h-px" style={{ background: "var(--color-anu-border)" }} />
              </div>

              {visibleItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {visibleItems.map((item) => {
                    const level = getAccess(item.menuKey);
                    return (
                      <button
                        key={item.href}
                        onClick={() => router.push(item.href)}
                        className="rounded-xl border p-6 text-left transition hover:scale-[1.02] hover:border-purple-500"
                        style={{
                          background: "var(--color-anu-surface)",
                          borderColor: "var(--color-anu-border)",
                        }}
                      >
                        <div className="mb-3" style={{ color: "var(--color-anu-glow)" }}>
                          <AppIcon name={item.icon} size={32} />
                        </div>
                        <div
                          className="font-semibold text-base"
                          style={{ color: "var(--color-anu-text)" }}
                        >
                          {t(item.labelKey)}
                        </div>
                        {level === "read" && (
                          <p className="text-xs mt-2" style={{ color: "var(--color-anu-warning)" }}>
                            {t("access.read_only")}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm italic" style={{ color: "var(--color-anu-muted)" }}>
                  {catalogEmpty
                    ? `— ${t("common.coming_soon")} —`
                    : `— ${t("access.no_menus")} —`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
