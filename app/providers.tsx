"use client";

import { usePathname } from "next/navigation";
import { SWRConfig } from "swr";
import { GlobalHeader } from "@/components/GlobalHeader";
import { PwaRegister } from "@/components/PwaRegister";
import { InstallBanner } from "@/components/pwa/InstallBanner";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider, useAuth } from "@/lib/auth/AuthProvider";
import { FeatureFlagsProvider } from "@/lib/features/FeatureFlagsProvider";
import { I18nProvider } from "@/lib/i18n/context";
import { ThemeProvider } from "@/lib/theme/context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <FeatureFlagsProvider>
            <SWRConfig
              value={{
                revalidateOnFocus: true,
                shouldRetryOnError: true,
                errorRetryCount: 2,
              }}
            >
              <SessionGuard>
                <PwaRegister />
                <InstallBanner />
                <GlobalHeader />
                <AppBody>{children}</AppBody>
              </SessionGuard>
            </SWRConfig>
          </FeatureFlagsProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

function AppBody({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isLogin = pathname === "/login";

  if (isLogin) return <>{children}</>;

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 56px)" }}>
      <Sidebar role={user?.role ?? "operator"} department={user?.department} />
      <main
        className="flex-1 min-w-0 overflow-x-hidden"
        style={{ background: "var(--color-anu-void)" }}
      >
        {children}
      </main>
    </div>
  );
}
