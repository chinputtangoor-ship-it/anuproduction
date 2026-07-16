"use client";

import { useRouter } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import type { AppIconName } from "@/lib/icons/app-icons";
import { useI18n } from "@/lib/i18n/context";

export function DashboardShell({
  title,
  icon,
  children,
}: {
  title: string;
  icon: AppIconName;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const cardStyle = {
    background: "var(--color-anu-surface)",
    borderColor: "var(--color-anu-border)",
  };

  return (
    <div className="w-full min-h-screen" style={{ background: "var(--color-anu-void)" }}>
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm px-3 py-1.5 rounded-lg border"
            style={cardStyle}
          >
            <AppIcon name="arrowLeft" size={14} /> {t("common.home")}
          </button>
          <h1
            className="text-xl font-bold flex items-center gap-2"
            style={{ color: "var(--color-anu-text)" }}
          >
            <AppIcon name={icon} size={22} />
            {title}
          </h1>
        </div>
        {children}
      </div>
    </div>
  );
}
