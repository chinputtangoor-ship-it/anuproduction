"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "@/components/AppIcon";
import { useFeatureFlag } from "@/lib/features/FeatureFlagsProvider";
import { useI18n } from "@/lib/i18n/context";

const STORAGE_KEY = "anu_pwa_install_dismissed";
const SHOW_MS = 20_000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios = "standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone;
  return mq || Boolean(ios);
}

export function InstallBanner() {
  const { t } = useI18n();
  const enabled = useFeatureFlag("pwa_install_banner");
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (isStandalone()) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* ignore */
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBip);

    // Also show a soft hint if already installable criteria met but event fired earlier
    const tShow = window.setTimeout(() => {
      // If event already captured elsewhere, still allow a short informational bar via deferred
    }, 0);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.clearTimeout(tShow);
    };
  }, [enabled]);

  useEffect(() => {
    if (!visible) return;
    const fadeTimer = window.setTimeout(() => setFading(true), SHOW_MS - 600);
    const hideTimer = window.setTimeout(() => {
      setVisible(false);
      setFading(false);
    }, SHOW_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [visible]);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  async function install() {
    if (!deferred) {
      dismiss();
      return;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    setDeferred(null);
    setVisible(false);
  }

  if (!enabled || !visible || !deferred) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[60] px-3 pb-3 pointer-events-none"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 0.6s ease",
      }}
    >
      <div
        className="pointer-events-auto mx-auto max-w-lg rounded-xl border shadow-lg flex items-center gap-3 px-4 py-3"
        style={{
          background: "var(--color-anu-surface)",
          borderColor: "var(--color-anu-border)",
        }}
      >
        <AppIcon name="download" size={22} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--color-anu-text)" }}>
            {t("pwa.install_title")}
          </p>
          <p className="text-xs" style={{ color: "var(--color-anu-muted)" }}>
            {t("pwa.install_body")}
          </p>
        </div>
        <button
          type="button"
          onClick={install}
          className="min-h-[44px] rounded-lg px-3 text-sm font-semibold shrink-0"
          style={{ background: "var(--color-anu-accent)", color: "#fff" }}
        >
          {t("pwa.install_btn")}
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="min-h-[44px] rounded-lg px-2 text-xs shrink-0"
          style={{ color: "var(--color-anu-muted)" }}
        >
          {t("pwa.dismiss")}
        </button>
      </div>
    </div>
  );
}
