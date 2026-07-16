"use client";

import { useEffect } from "react";

/** Registers the service worker for installable PWA + offline shell. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch {
        // Install / offline still work via manifest; SW is best-effort.
      }
    };

    void register();
  }, []);

  return null;
}
