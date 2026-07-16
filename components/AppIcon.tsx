"use client";

import { createElement } from "react";
import { APP_ICONS, type AppIconName } from "@/lib/icons/app-icons";

type AppIconProps = {
  name: AppIconName;
  size?: number;
  className?: string;
};

export function AppIcon({ name, size = 20, className }: AppIconProps) {
  return createElement(APP_ICONS[name], {
    size,
    className,
    strokeWidth: 2,
    "aria-hidden": true,
  });
}
